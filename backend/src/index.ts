import { Hono } from "hono";
import { cors } from "hono/cors";
import { serve } from "@hono/node-server";
import { sponsorAndExecute } from "./sponsor.js";
import { logTradeToMemwal } from "./logger.js"; // You'll create this next
import { addTrade, listTrades, listTradesByIdentity, TradeSchema } from "./trades.js";
import { Transaction } from "@mysten/sui/transactions";
import { SuiGrpcClient } from "@mysten/sui/grpc";
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import dotenv from "dotenv";
dotenv.config();

const client = new SuiGrpcClient({
  network: "testnet",
  baseUrl: "https://fullnode.testnet.sui.io:443",
});

let keypair = Ed25519Keypair.fromSecretKey(process.env.SPONSOR_PRIVATE_KEY!);

const app = new Hono();

const port = 3000;

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

  const result = await sponsorAndExecute(tx, keypair, client);
  return c.json({ success: true, digest: result.Transaction });
});

// Route: Autonomous Agent Execute (The "Fusion" Point)
app.post("/agent/execute", async (c) => {
  const { txBytes, receipt } = await c.req.json();
  let tx = Transaction.from(txBytes);

  // 1. Execute the trade via Gas Station
  const result = await sponsorAndExecute(tx, keypair, client);

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
