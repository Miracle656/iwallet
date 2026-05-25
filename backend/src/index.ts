import { Hono } from "hono";
import { serve } from "@hono/node-server";
import { sponsorAndExecute } from "./sponsor.js";
import { logTradeToWalrus } from "./logger.js"; // You'll create this next
import { Transaction } from "@mysten/sui/transactions";
import { SuiGrpcClient } from "@mysten/sui/grpc";
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import dotenv from "dotenv";
dotenv.config();

let keypair = Ed25519Keypair.fromSecretKey(process.env.SPONSOR_PRIVATE_KEY!);

const app = new Hono();

const port = 3000;

// Middleware: API Key Security Gate
app.use("*", async (c, next) => {
  const apiKey = c.req.header("X-IWALLET-API-KEY");
  if (apiKey !== process.env.API_SECRET) {
    return c.json({ error: "Unauthorized Access" }, 401);
  }
  await next();
});

// Route: Create Identity
app.post("/sponsor/setup", async (c) => {
  const { txBytes } = await c.req.json();
  let tx = Transaction.from(txBytes);
  const client = new SuiGrpcClient({
    network: "testnet",
    baseUrl: "https://fullnode.testnet.sui.io:443",
  });
  const result = await sponsorAndExecute(tx, keypair, client);
  return c.json({ success: true, digest: result.Transaction });
});

// Route: Autonomous Agent Execute (The "Fusion" Point)
app.post("/agent/execute", async (c) => {
  const { txBytes, receipt } = await c.req.json();
  let tx = Transaction.from(txBytes);
  const client = new SuiGrpcClient({
    network: "testnet",
    baseUrl: "https://fullnode.testnet.sui.io:443",
  });

  // 1. Execute the trade via Gas Station
  const result = await sponsorAndExecute(tx, keypair, client);

  // 2. Log receipt to Walrus (The fused audit trail)
  const blobId = await logTradeToWalrus(receipt);

  return c.json({
    digest: result.Transaction,
    walrusBlobId: blobId,
  });
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
