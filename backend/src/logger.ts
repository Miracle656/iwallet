import { MemWal } from "@mysten-incubation/memwal";

// Define the interface for the agent's trade receipt
export interface AgentReceipt {
  agent_id: string;
  sui_tx_digest: string;
  amount: number;
  target: string; // Market ID or Pool ID
  rationale: string; // Claude's reasoning
  action_type: string; // e.g., "PLACE_BET"
  metadata?: Record<string, any>; // Sport, home, away, odds
  timestamp: string;
}

// Singleton MemWal Client Setup
let client: ReturnType<typeof MemWal.create> | null = null;

function getClient(): ReturnType<typeof MemWal.create> | null {
  const KEY = process.env.MEMWAL_KEY;
  const ACCOUNT = process.env.MEMWAL_ACCOUNT_ID;
  const SERVER =
    process.env.MEMWAL_SERVER_URL ?? "https://relayer.staging.memwal.ai";
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
      namespace: NAMESPACE,
    });
  }
  return client;
}

/**
 * Uploads a semantic receipt to MemWal for Agent RAG and UI history.
 */
export async function logTradeToMemwal(
  receipt: AgentReceipt,
): Promise<boolean> {
  const c = getClient();
  if (!c) return false;

  console.log(`[MemWal] Sealing memory for Tx: ${receipt.sui_tx_digest}...`);

  // We format this as a rich semantic string so Claude can easily read it during 'recallContext'
  const sportContext = receipt.metadata
    ? `${receipt.metadata.home} vs ${receipt.metadata.away} (${receipt.metadata.sport}) at odds ${receipt.metadata.odds}`
    : `Market ${receipt.target}`;

  const memoryText =
    `AGENT_ID: ${receipt.agent_id} | ` +
    `ACTION: Placed ${receipt.action_type.toUpperCase()} on ${sportContext}. ` +
    `STAKE: ${receipt.amount} SUI. ` +
    `REASONING: ${receipt.rationale} ` +
    `ON_CHAIN_DIGEST: ${receipt.sui_tx_digest} | ` +
    `TIMESTAMP: ${receipt.timestamp}`;

  try {
    // We send the formatted text to MemWal
    await c.remember(memoryText);
    console.log(`[MemWal] Audit trail successfully sealed in agent memory.`);
    return true;
  } catch (error) {
    console.error(
      "[MemWal] Error connecting to MemWal storage:",
      (error as Error).message,
    );
    return false;
  }
}
