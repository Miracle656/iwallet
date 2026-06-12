// src/index.ts
import { Hono as Hono2 } from "hono";
import { cors } from "hono/cors";
import { serve } from "@hono/node-server";

// src/sponsor.ts
import "@mysten/sui/grpc";
import "@mysten/sui/transactions";
import "@mysten/sui/keypairs/ed25519";
import "@mysten/sui/cryptography";
async function sponsorAndExecute(tx, signer, client3) {
  return await signer.signAndExecuteTransaction({
    transaction: tx,
    client: client3
  });
}

// src/logger.ts
import { MemWal } from "@mysten-incubation/memwal";
var client = null;
function getClient() {
  const KEY = process.env.MEMWAL_KEY;
  const ACCOUNT = process.env.MEMWAL_ACCOUNT_ID;
  const SERVER = process.env.MEMWAL_SERVER_URL ?? "https://relayer.staging.memwal.ai";
  const NAMESPACE = process.env.MEMWAL_NAMESPACE ?? "iwallet-agent";
  if (!KEY || !ACCOUNT) {
    console.warn("[MemWal] Missing MEMWAL_KEY or MEMWAL_ACCOUNT_ID in .env");
    return null;
  }
  if (!client) {
    client = MemWal.create({
      key: KEY,
      accountId: ACCOUNT,
      serverUrl: SERVER,
      namespace: NAMESPACE
    });
  }
  return client;
}
async function logTradeToMemwal(receipt) {
  const c = getClient();
  if (!c) return false;
  console.log(`[MemWal] Sealing memory for Tx: ${receipt.sui_tx_digest}...`);
  const sportContext = receipt.metadata ? `${receipt.metadata.home} vs ${receipt.metadata.away} (${receipt.metadata.sport}) at odds ${receipt.metadata.odds}` : `Market ${receipt.target}`;
  const memoryText = `AGENT_ID: ${receipt.agent_id} | ACTION: Placed ${receipt.action_type.toUpperCase()} on ${sportContext}. STAKE: ${receipt.amount} SUI. REASONING: ${receipt.rationale} ON_CHAIN_DIGEST: ${receipt.sui_tx_digest} | TIMESTAMP: ${receipt.timestamp}`;
  try {
    await c.remember(memoryText);
    console.log(`[MemWal] Audit trail successfully sealed in agent memory.`);
    return true;
  } catch (error) {
    console.error(
      "[MemWal] Error connecting to MemWal storage:",
      error.message
    );
    return false;
  }
}

// src/trades.ts
import { z } from "zod";
var TradeSchema = z.object({
  identityId: z.string(),
  agentName: z.string().optional(),
  owner: z.string().optional(),
  pool: z.string(),
  side: z.enum(["ask", "bid"]),
  price: z.number(),
  quantity: z.number(),
  amountMist: z.string().optional(),
  midPrice: z.number().nullable().optional(),
  withdrawDigest: z.string().optional(),
  orderDigest: z.string().optional(),
  status: z.enum(["success", "rejected", "failed"]),
  /** Contract abort code / human reason when not success (e.g. EBudgetExceeded). */
  reason: z.string().optional(),
  rationale: z.string().optional(),
  memoriesUsed: z.number().optional()
});
var MAX = 200;
var buffer = [];
function addTrade(input) {
  const rec = {
    ...input,
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    ts: Date.now()
  };
  buffer.unshift(rec);
  if (buffer.length > MAX) buffer.length = MAX;
  return rec;
}
function listTrades(limit = 50) {
  return buffer.slice(0, Math.max(0, Math.min(limit, MAX)));
}
function listTradesByIdentity(identityId, limit = 50) {
  return buffer.filter((t) => t.identityId === identityId).slice(0, limit);
}

// src/index.ts
import { Transaction as Transaction4 } from "@mysten/sui/transactions";
import { SuiGrpcClient as SuiGrpcClient3 } from "@mysten/sui/grpc";
import { Ed25519Keypair as Ed25519Keypair4 } from "@mysten/sui/keypairs/ed25519";
import { EnokiClient } from "@mysten/enoki";
import dotenv5 from "dotenv";

// src/agent/controller.ts
import { Hono } from "hono";

// src/agent/service.ts
import dotenv4 from "dotenv";
import { Transaction as Transaction3 } from "@mysten/sui/transactions";

// src/utils/platform_constant.ts
import dotenv from "dotenv";
dotenv.config();
var SUIN_PARENT_NFT_ID = process.env.SUINS_ADDRESS;
var PACKAGE_ID = process.env.PACKAGE_ID;

// src/suins.ts
import "@mysten/sui/transactions";
import { SuinsTransaction as SuinsTransaction2 } from "@mysten/suins";

// src/lib/sui_client.ts
import { getJsonRpcFullnodeUrl, SuiJsonRpcClient } from "@mysten/sui/jsonRpc";
import { SuiGrpcClient as SuiGrpcClient2 } from "@mysten/sui/grpc";
import { suins } from "@mysten/suins";
import { deepbook } from "@mysten/deepbook-v3";
import { Ed25519Keypair as Ed25519Keypair2 } from "@mysten/sui/keypairs/ed25519";
import dotenv2 from "dotenv";
dotenv2.config();
var _keypair = Ed25519Keypair2.fromSecretKey(process.env.PK);
var jsonClient = new SuiJsonRpcClient({
  url: getJsonRpcFullnodeUrl("testnet"),
  network: "testnet"
}).$extend(suins());
var grpcClient = new SuiGrpcClient2({
  network: "testnet",
  baseUrl: "https://fullnode.testnet.sui.io:443"
}).$extend(
  deepbook({
    address: _keypair.getPublicKey().toSuiAddress().toString(),
    balanceManagers: {}
  })
);

// src/suins.ts
import { Ed25519Keypair as Ed25519Keypair3 } from "@mysten/sui/keypairs/ed25519";
import dotenv3 from "dotenv";
dotenv3.config();
var _keypair2 = Ed25519Keypair3.fromSecretKey(process.env.PK);
async function createLeafSubname(name, parentNftId, targetAddress, transaction) {
  const suinsTransaction = new SuinsTransaction2(jsonClient.suins, transaction);
  const normalizedName = name.endsWith(".iwallet.sui") ? name : name + ".iwallet.sui";
  suinsTransaction.createLeafSubName({
    parentNft: parentNftId,
    name: normalizedName,
    targetAddress
  });
  return transaction;
}
async function getNameRecord(name) {
  try {
    const nameRecord = await jsonClient.suins.getNameRecord(name);
    return nameRecord;
  } catch (error) {
    throw new Error("Failed to get name record: " + error);
  }
}

// src/agent/vk.ts
import { readFileSync } from "fs";
var Q = 21888242871839275222246405745257275088696311157297823662689037894645226208583n;
var Q_HALF = (Q - 1n) / 2n;
function fpIsNeg(y) {
  return y > Q_HALF;
}
function fp2IsNeg(c0, c1) {
  if (c1 === 0n) return fpIsNeg(c0);
  return fpIsNeg(c1);
}
function fieldToBytes32LE(x) {
  const out = new Uint8Array(32);
  let v = (x % Q + Q) % Q;
  for (let i = 0; i < 32; i++) {
    out[i] = Number(v & 0xffn);
    v >>= 8n;
  }
  return out;
}
function g1Compressed(p) {
  const x = BigInt(p[0]);
  const y = BigInt(p[1]);
  const out = fieldToBytes32LE(x);
  if (fpIsNeg(y)) out[31] |= 128;
  return out;
}
function g2Compressed(p) {
  const out = new Uint8Array(64);
  out.set(fieldToBytes32LE(BigInt(p[0][0])), 0);
  out.set(fieldToBytes32LE(BigInt(p[0][1])), 32);
  if (fp2IsNeg(BigInt(p[1][0]), BigInt(p[1][1]))) out[63] |= 128;
  return out;
}
function u64LE(n) {
  const out = new Uint8Array(8);
  let v = BigInt(n);
  for (let i = 0; i < 8; i++) {
    out[i] = Number(v & 0xffn);
    v >>= 8n;
  }
  return out;
}
function verificationKeyToBytes(vkJsonPath) {
  const vk = JSON.parse(readFileSync(vkJsonPath, "utf8"));
  if (vk.protocol !== "groth16" || vk.curve !== "bn128") {
    throw new Error(`[vk] expected groth16/bn128, got ${vk.protocol}/${vk.curve}`);
  }
  const parts = [
    g1Compressed(vk.vk_alpha_1),
    g2Compressed(vk.vk_beta_2),
    g2Compressed(vk.vk_gamma_2),
    g2Compressed(vk.vk_delta_2),
    u64LE(vk.IC.length)
  ];
  for (const ic of vk.IC) parts.push(g1Compressed(ic));
  const total = parts.reduce((n, p) => n + p.length, 0);
  const out = new Uint8Array(total);
  let off = 0;
  for (const p of parts) {
    out.set(p, off);
    off += p.length;
  }
  return out;
}
if (process.argv[1]?.endsWith("vk.ts")) {
  const path2 = process.argv[2] ?? "../circuits/verification_key.json";
  const bytes = verificationKeyToBytes(path2);
  console.log(`vk_bytes: ${bytes.length} bytes (expect 328 for nPublic=2)`);
  console.log(`hex head: ${Buffer.from(bytes).toString("hex").slice(0, 32)}\u2026`);
}

// src/utils/zk.ts
import { buildPoseidon } from "circomlibjs";
import * as crypto from "crypto";
async function generateAgentIdentity() {
  const poseidon = await buildPoseidon();
  const secretBytes = crypto.randomBytes(31);
  const secretBigInt = BigInt("0x" + secretBytes.toString("hex"));
  const hash = poseidon([secretBigInt]);
  const hashBigInt = poseidon.F.toObject(hash);
  const identityHash = new Uint8Array(32);
  let temp = hashBigInt;
  for (let i = 0; i < 32; i++) {
    identityHash[i] = Number(temp & 0xffn);
    temp >>= 8n;
  }
  return {
    secret: secretBigInt.toString(),
    // The Agent needs this later!
    identityHash
    // The Move contract needs this now!
  };
}

// src/agent/service.ts
import * as path from "path";
import { toBase64 } from "@mysten/sui/utils";
dotenv4.config();
var AgentService = class {
  packageId = PACKAGE_ID;
  async buildCreateAgentTx(name, sender) {
    try {
      console.log(`\u{1F916} Building Agent creation PTB for: ${name}...`);
      const { secret, identityHash } = await generateAgentIdentity();
      console.log(`\u{1F511} WARNING: Save this Agent Secret! -> ${secret}`);
      const vkPath = path.resolve(
        process.cwd(),
        "../circuits/verification_key.json"
      );
      const vkBytes = verificationKeyToBytes(vkPath);
      const createTX = new Transaction3();
      createTX.moveCall({
        package: this.packageId,
        module: "prototype",
        function: "create_iidentity",
        typeArguments: ["0x2::sui::SUI"],
        arguments: [
          createTX.pure.string(name),
          createTX.pure.vector("u8", identityHash),
          createTX.pure.vector("u8", vkBytes)
          // transaction.pure(bcs.struct("AgentPolicy", {}).serialize({})),
        ]
      });
      createTX.setSender(sender);
      const bytes = await createTX.build({ client: jsonClient });
      const createTxBytes = toBase64(bytes);
      return {
        createIIdentityByte: createTxBytes
      };
    } catch (e) {
      console.error("\u274C Failed to build agent tx:", e);
      throw e;
    }
  }
  async createAgentName(name, identityAddress, sender) {
    const nameExist = await this.getNameRecord(name);
    if (nameExist) {
      return { message: "Name record already exists" };
    }
    const reformedName = name.endsWith("iwallet.sui") ? name : `${name}.iwallet.sui`;
    const suinsTx = new Transaction3();
    let resultFromNSCreation = await createLeafSubname(
      reformedName,
      SUIN_PARENT_NFT_ID,
      identityAddress,
      suinsTx
    );
    resultFromNSCreation.setSender(sender);
    const byte = await resultFromNSCreation.build({ client: jsonClient });
    const suinsTxBytes = toBase64(byte);
    return {
      suinsTxBytes
    };
  }
  async getNameRecord(name) {
    const reformedName = name.endsWith(".iwallet.sui") ? name : `${name}.iwallet.sui`;
    try {
      return await getNameRecord(reformedName);
    } catch (error) {
      if (error?.message?.includes("does not exist")) {
        return null;
      }
      throw new Error("Failed to get name record: " + error);
    }
  }
};

// src/agent/controller.ts
var agent = new Hono();
var agentService = new AgentService();
agent.post("/create", async (c) => {
  const body = await c.req.json();
  const { name, sender } = body;
  const result = await agentService.buildCreateAgentTx(name, sender);
  return c.json({ message: "Agent created successfully", result });
});
agent.post("/create-agent-name", async (c) => {
  const body = await c.req.json();
  const { name, identityAddress, sender } = body;
  const result = await agentService.createAgentName(
    name,
    identityAddress,
    sender
  );
  if (result?.message?.includes("Name record already exists")) {
    return c.json({ message: result?.message }, 400);
  }
  return c.json({ message: "Agent name created successfully", result });
});
agent.get("/get_name_record/:name", async (c) => {
  const name = c.req.param("name");
  const result = await agentService.getNameRecord(name);
  if (!result) {
    return c.json(
      {
        message: "Name record not found"
      },
      404
    );
  }
  return c.json({ message: "Name record retrieved successfully", result });
});

// src/index.ts
dotenv5.config();
var client2 = new SuiGrpcClient3({
  network: "testnet",
  baseUrl: "https://fullnode.testnet.sui.io:443"
});
var keypair = null;
function getSponsorKeypair() {
  if (!keypair) {
    const pk = process.env.SPONSOR_PRIVATE_KEY;
    if (!pk)
      throw new Error(
        "SPONSOR_PRIVATE_KEY not set \u2014 gas-station routes disabled"
      );
    keypair = Ed25519Keypair4.fromSecretKey(pk);
  }
  return keypair;
}
var enoki = process.env.ENOKI_PRIVATE_API_KEY ? new EnokiClient({ apiKey: process.env.ENOKI_PRIVATE_API_KEY }) : null;
var ENOKI_NETWORK = process.env.ENOKI_NETWORK ?? "testnet";
var app = new Hono2();
var port = Number(process.env.PORT) || 3e3;
app.use("*", cors());
var requireApiKey = async (c, next) => {
  const apiKey = c.req.header("X-IWALLET-API-KEY");
  if (apiKey !== process.env.API_SECRET) {
    return c.json({ error: "Unauthorized Access" }, 401);
  }
  await next();
};
app.use("/sponsor/*", requireApiKey);
app.use("/agent/*", requireApiKey);
app.post("/sponsor/setup", async (c) => {
  const { txBytes } = await c.req.json();
  let tx = Transaction4.from(txBytes);
  const result = await sponsorAndExecute(tx, getSponsorKeypair(), client2);
  return c.json({ success: true, digest: result.Transaction });
});
app.post("/agent/execute", async (c) => {
  const { txBytes, receipt } = await c.req.json();
  let tx = Transaction4.from(txBytes);
  const result = await sponsorAndExecute(tx, getSponsorKeypair(), client2);
  const blobId = await logTradeToMemwal(receipt);
  return c.json({
    digest: result.Transaction,
    walrusBlobId: blobId
  });
});
app.post("/enoki/sponsor", async (c) => {
  if (!enoki) return c.json({ error: "Enoki not configured (set ENOKI_PRIVATE_API_KEY)" }, 503);
  const { transactionKindBytes, sender, allowedMoveCallTargets, allowedAddresses } = await c.req.json();
  if (!transactionKindBytes || !sender) {
    return c.json({ error: "transactionKindBytes and sender are required" }, 400);
  }
  try {
    const resp = await enoki.createSponsoredTransaction({
      network: ENOKI_NETWORK,
      transactionKindBytes,
      sender,
      allowedMoveCallTargets,
      allowedAddresses
    });
    return c.json(resp);
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
    return c.json(resp);
  } catch (e) {
    return c.json({ error: e instanceof Error ? e.message : "execute failed" }, 400);
  }
});
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
app.get("/trades", (c) => {
  const limit = Number(c.req.query("limit") ?? 50);
  return c.json({ trades: listTrades(limit) });
});
app.get("/trades/identity/:id", (c) => {
  const limit = Number(c.req.query("limit") ?? 50);
  return c.json({ trades: listTradesByIdentity(c.req.param("id"), limit) });
});
app.get("/health-check", (c) => {
  return c.json({ status: "ok" });
});
app.route("/v1/agent", agent);
serve(
  {
    fetch: app.fetch,
    port
  },
  (info) => {
    console.log(`\u{1F680} Gas Station API booting up...`);
    console.log(`\u{1F4E1} Listening on http://localhost:${info.port}`);
  }
);
