import crypto from "node:crypto";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { serve } from "@hono/node-server";
import { sponsorAndExecute } from "./sponsor.js";
import { logTradeToMemwal } from "./logger.js"; // You'll create this next
import {
  addTrade,
  listTrades,
  listTradesByIdentity,
  TradeSchema,
} from "./trades.js";
import { Transaction } from "@mysten/sui/transactions";
import { fromBase64, toBase64 } from "@mysten/sui/utils";
import { SuiGrpcClient } from "@mysten/sui/grpc";
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import { jsonClient } from "./lib/sui_client.ts";
import { EnokiClient } from "@mysten/enoki";
import dotenv from "dotenv";
import { agent } from "./agent/controller.ts";
import { storeZkSession, getZkSession } from "./lib/zklogin-store.ts";
dotenv.config();

const client = new SuiGrpcClient({
  network: "testnet",
  baseUrl: "https://fullnode.testnet.sui.io:443",
});

// Lazy: the trade feed doesn't need a sponsor key, so the server boots without
// it. Only the gas-station routes require it.
let keypair: Ed25519Keypair | null = null;
function getSponsorKeypair(): Ed25519Keypair {
  if (!keypair) {
    const pk = process.env.SPONSOR_PRIVATE_KEY;
    if (!pk)
      throw new Error(
        "SPONSOR_PRIVATE_KEY not set — gas-station routes disabled",
      );
    keypair = Ed25519Keypair.fromSecretKey(pk);
  }
  return keypair;
}

// Enoki sponsored transactions (Mysten's managed gas pool). The PRIVATE key
// stays here on the backend — never the browser.
const enoki = process.env.ENOKI_PRIVATE_API_KEY
  ? new EnokiClient({ apiKey: process.env.ENOKI_PRIVATE_API_KEY })
  : null;
const ENOKI_NETWORK = (process.env.ENOKI_NETWORK ?? "testnet") as "testnet" | "mainnet" | "devnet";

const app = new Hono();

const port = Number(process.env.PORT) || 3000;

// CORS so the deployed frontend can read the public trade feed.
app.use("*", cors());

// API-key gate — scoped to the write routes only. The trade-feed GETs are
// public so the dashboard can read them without the secret. POST /trades does
// its own inline key check below.
const requireApiKey = async (c: any, next: any) => {
  const apiKey = c.req.header("X-IWALLET-API-KEY");
  if (apiKey !== process.env.API_SECRET) {
    return c.json({ error: "Unauthorized Access" }, 401);
  }
  await next();
};
app.use("/sponsor/*", requireApiKey);
app.use("/agent/*", requireApiKey);

// Route: Create Identity
app.post("/sponsor/setup", async (c: any) => {
  const { txBytes } = await c.req.json();
  let tx = Transaction.from(txBytes);

  const result = await sponsorAndExecute(tx, getSponsorKeypair(), client);
  return c.json({ success: true, digest: result.Transaction });
});

// Route: Autonomous Agent Execute (The "Fusion" Point)
app.post("/agent/execute", async (c) => {
  const { txBytes, receipt } = await c.req.json();
  let tx = Transaction.from(txBytes);

  // 1. Execute the trade via Gas Station
  const result = await sponsorAndExecute(tx, getSponsorKeypair(), client);

  // 2. Log receipt to Walrus (The fused audit trail)
  const blobId = await logTradeToMemwal(receipt);

  return c.json({
    digest: result.Transaction,
    walrusBlobId: blobId,
  });
});

// ── Enoki sponsored transactions (public; scoped by allowedMoveCallTargets) ──
// The frontend builds a transaction-kind, we sponsor it (Enoki pays gas), the
// owner signs the returned bytes, then we execute. Lets passkey owners with 0
// SUI create iWallets. Public on purpose — abuse is bounded by the allowlist.
app.post("/enoki/sponsor", async (c) => {
  if (!enoki) return c.json({ error: "Enoki not configured (set ENOKI_PRIVATE_API_KEY)" }, 503);
  const { transactionKindBytes, sender, allowedMoveCallTargets, allowedAddresses } =
    await c.req.json();
  if (!transactionKindBytes || !sender) {
    return c.json({ error: "transactionKindBytes and sender are required" }, 400);
  }
  try {
    const resp = await enoki.createSponsoredTransaction({
      network: ENOKI_NETWORK,
      transactionKindBytes,
      sender,
      allowedMoveCallTargets,
      allowedAddresses,
    });
    return c.json(resp); // { bytes, digest }
  } catch (e) {
    return c.json({ error: e instanceof Error ? e.message : "sponsor failed" }, 400);
  }
});

app.post("/enoki/execute", async (c) => {
  if (!enoki) return c.json({ error: "Enoki not configured" }, 503);
  const { digest, signature } = await c.req.json();
  if (!digest || !signature) return c.json({ error: "digest and signature are required" }, 400);
  try {
    const resp = await enoki.executeSponsoredTransaction({ digest, signature });
    return c.json(resp); // { digest }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    const detail = (e as any)?.response?.data ?? (e as any)?.body ?? (e as any)?.cause ?? null;
    console.error("[enoki/execute] ERROR:", msg);
    console.error("[enoki/execute] detail:", JSON.stringify(detail, null, 2));
    console.error("[enoki/execute] digest:", digest);
    console.error("[enoki/execute] sig scheme byte (base64[0]):", signature.slice(0, 4));
    return c.json({ error: msg, detail }, 400);
  }
});

// ── Agent trade feed (Sub-track 2 dashboard) ──

// Agent posts each DeepBook action here (api-key gated, inline).
app.post("/trades", async (c) => {
  if (c.req.header("X-IWALLET-API-KEY") !== process.env.API_SECRET) {
    return c.json({ error: "Unauthorized Access" }, 401);
  }
  const parsed = TradeSchema.safeParse(await c.req.json());
  if (!parsed.success) {
    return c.json({ error: "Invalid trade", issues: parsed.error.issues }, 400);
  }
  return c.json({ ok: true, trade: addTrade(parsed.data) });
});

// Public: global feed (all agents).
app.get("/trades", (c) => {
  const limit = Number(c.req.query("limit") ?? 50);
  return c.json({ trades: listTrades(limit) });
});

// Public: per-iWallet feed.
app.get("/trades/identity/:id", (c) => {
  const limit = Number(c.req.query("limit") ?? 50);
  return c.json({ trades: listTradesByIdentity(c.req.param("id"), limit) });
});

app.get("/health-check", (c) => {
  return c.json({ status: "ok" });
});

// ── zkLogin services ──

// Self-hosted salt service: salt = HMAC-SHA256(secret, sub) truncated to 128 bits.
// Mysten's hosted salt service requires allowlisting our Google client ID which we
// don't have — computing it ourselves gives us full control and no dependencies.
app.post("/v1/zklogin/salt", async (c) => {
  const { token } = await c.req.json();
  if (!token) return c.json({ error: "token required" }, 400);

  // Decode JWT payload (no verification needed — prover will verify the JWT itself)
  const [, payloadB64] = (token as string).split(".");
  let sub: string;
  try {
    const payload = JSON.parse(Buffer.from(payloadB64, "base64url").toString("utf8"));
    sub = payload.sub;
    if (!sub) throw new Error("no sub");
  } catch {
    return c.json({ error: "Invalid JWT" }, 400);
  }

  const secret = process.env.ZK_SALT_SECRET ?? process.env.API_SECRET ?? "dev-salt-key";
  const hmac = crypto.createHmac("sha256", secret).update(sub).digest();
  // Take first 16 bytes → 128-bit integer → decimal string (Mysten salt format)
  const salt = BigInt("0x" + hmac.slice(0, 16).toString("hex")).toString();
  return c.json({ salt });
});

// ZK prover proxy — browser can't call Mysten's prover directly (CORS).
app.post("/v1/zklogin/proof", async (c) => {
  const body = await c.req.json();
  const upstream = await fetch("https://prover-dev.mystenlabs.com/v1", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await upstream.json();
  if (!upstream.ok) {
    console.error("[zkLogin] prover error:", data);
    return c.json(data, upstream.status as any);
  }
  return c.json(data);
});

// ── zkLogin session store (Google OAuth → agent autonomous signing) ──

// Called by the frontend after the ZK proof is generated. Stores the
// encrypted session and returns an agentId the frontend caches in localStorage.
app.post("/v1/auth/zklogin/store", async (c) => {
  const body = await c.req.json();
  const { jwt, ephemeralPrivKey, maxEpoch, randomness, salt, address, zkProof } = body;
  if (!jwt || !ephemeralPrivKey || !maxEpoch || !randomness || !salt || !address || !zkProof) {
    return c.json({ error: "Missing required fields" }, 400);
  }
  const agentId = storeZkSession({ jwt, ephemeralPrivKey, maxEpoch, randomness, salt, address, zkProof, storedAt: Date.now() });
  console.log(`[zkLogin] Session stored for ${address} → agentId=${agentId}`);
  return c.json({ agentId, address });
});

// API-key gated: only the agent daemon calls this to retrieve signing material.
app.get("/v1/auth/zklogin/session/:agentId", requireApiKey, (c) => {
  const session = getZkSession(c.req.param("agentId"));
  if (!session) return c.json({ error: "Session not found or expired" }, 404);
  return c.json(session);
});

// ── zkLogin gas station (bypasses Enoki execute — Enoki rejects external zkLogin sigs) ──
// Step 1: build the full tx with sponsor as gas owner, return txBytes for the user to sign.
app.post("/v1/zklogin/prepare-tx", async (c) => {
  const { txKindBytes, sender } = await c.req.json();
  if (!txKindBytes || !sender) {
    return c.json({ error: "txKindBytes and sender are required" }, 400);
  }
  try {
    const sponsor = getSponsorKeypair();
    const sponsorAddress = sponsor.getPublicKey().toSuiAddress();
    const tx = Transaction.fromKind(txKindBytes); // accepts base64 string
    tx.setSender(sender);
    tx.setGasOwner(sponsorAddress);
    tx.setGasBudget(10_000_000); // 0.01 SUI; SDK auto-picks gas coins from gasOwner
    const txBytes = await tx.build({ client: jsonClient as any });
    return c.json({ txBytes: toBase64(txBytes) });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[zklogin/prepare-tx]", msg);
    return c.json({ error: msg }, 500);
  }
});

// Step 2: user sends their zkLogin signature; backend co-signs as gas sponsor and executes.
app.post("/v1/zklogin/execute-sponsored", async (c) => {
  const { txBytes, userSignature } = await c.req.json();
  if (!txBytes || !userSignature) {
    return c.json({ error: "txBytes and userSignature are required" }, 400);
  }
  try {
    const sponsor = getSponsorKeypair();
    const { signature: sponsorSig } = await sponsor.signTransaction(fromBase64(txBytes));
    const result = await jsonClient.executeTransactionBlock({
      transactionBlock: txBytes,
      signature: [userSignature, sponsorSig],
      options: { showObjectChanges: true, showEffects: true },
    });
    console.log("[zklogin/execute-sponsored] digest:", result.digest);
    return c.json(result);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[zklogin/execute-sponsored]", msg);
    return c.json({ error: msg }, 500);
  }
});

app.route("/v1/agent", agent);

serve(
  {
    fetch: app.fetch,
    port: port,
  },
  (info) => {
    console.log(`🚀 Gas Station API booting up...`);
    console.log(`📡 Listening on http://localhost:${info.port}`);
  },
);
