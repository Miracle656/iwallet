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
import { EnokiClient } from "@mysten/enoki";
import { jsonClient } from "./lib/sui_client.ts";
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

// Enoki client — manages salt and ZK proof generation; undefined if key not set.
const enoki = process.env.ENOKI_PRIVATE_API_KEY
  ? new EnokiClient({ apiKey: process.env.ENOKI_PRIVATE_API_KEY })
  : null;

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

// Sui RPC proxy — browser calls are blocked by corporate/school proxies;
// this endpoint forwards them server-side where there's no proxy restriction.
app.post("/v1/sui-rpc", async (c) => {
  const body = await c.req.json();
  const SUI_RPC = process.env.SUI_RPC_URL ?? "https://fullnode.testnet.sui.io/";
  try {
    const upstream = await fetch(SUI_RPC, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await upstream.json();
    return c.json(data, upstream.status as any);
  } catch (e) {
    return c.json({ error: e instanceof Error ? e.message : "rpc proxy failed" }, 502);
  }
});

// ── zkLogin services ──

// Salt service — Enoki if configured (address must be stable!), else HMAC fallback.
app.post("/v1/zklogin/salt", async (c) => {
  const { token } = await c.req.json();
  if (!token) return c.json({ error: "token required" }, 400);

  if (enoki) {
    try {
      const { salt } = await enoki.getZkLogin({ jwt: token as string });
      return c.json({ salt });
    } catch (e) {
      console.error("[zkLogin/salt] Enoki failed, falling back to HMAC:", e);
    }
  }

  // HMAC fallback — deterministic, keeps same address across restarts as long as ZK_SALT_SECRET is unchanged
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
  const salt = BigInt("0x" + hmac.slice(0, 16).toString("hex")).toString();
  return c.json({ salt });
});

// ZK prover proxy — Enoki if configured, else Mysten's hosted prover.
app.post("/v1/zklogin/proof", async (c) => {
  const body = await c.req.json();

  if (enoki) {
    try {
      const network = (process.env.SUI_NETWORK ?? "testnet") as string;
      const resp = await fetch("https://api.enoki.mystenlabs.com/v1/zklogin/zkp", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.ENOKI_PRIVATE_API_KEY}`,
          "zklogin-jwt": body.jwt as string,
        },
        body: JSON.stringify({
          network,
          ephemeralPublicKey: body.ephemeralPublicKey,
          maxEpoch: body.maxEpoch,
          randomness: body.jwtRandomness,
        }),
      });
      const data = await resp.json();
      if (!resp.ok) {
        console.error("[zkLogin/proof] Enoki error:", data);
        // fall through to Mysten prover
      } else {
        return c.json(data);
      }
    } catch (e) {
      console.error("[zkLogin/proof] Enoki exception, falling back:", e);
    }
  }

  const network = (process.env.SUI_NETWORK ?? "testnet") as string;
  const proverUrl =
    process.env.ZK_PROVER_URL ??
    (network === "mainnet"
      ? "https://prover.mystenlabs.com/v1"
      : "https://prover-dev.mystenlabs.com/v1");
  const upstream = await fetch(proverUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await upstream.json();
  if (!upstream.ok) {
    console.error("[zkLogin/proof] prover error:", data);
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

// ── zkLogin gas station (backend sponsors gas so the zkLogin address needs 0 SUI) ──
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
