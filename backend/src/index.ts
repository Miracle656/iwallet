import { Hono } from "hono";
import { cors } from "hono/cors";
import { serve } from "@hono/node-server";
import { sponsorAndExecute } from "./sponsor.js";
import { logTradeToMemwal } from "./logger.js"; // You'll create this next
import { addTrade, listTrades, listTradesByIdentity, TradeSchema } from "./trades.js";
import { Transaction } from "@mysten/sui/transactions";
import { SuiGrpcClient } from "@mysten/sui/grpc";
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import { EnokiClient } from "@mysten/enoki";
import dotenv from "dotenv";
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
    if (!pk) throw new Error("SPONSOR_PRIVATE_KEY not set — gas-station routes disabled");
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
app.post("/sponsor/setup", async (c) => {
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
    return c.json({ error: e instanceof Error ? e.message : "execute failed" }, 400);
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
