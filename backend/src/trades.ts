import { z } from "zod";

/**
 * In-memory trade feed for the agent dashboard (Sub-track 2).
 *
 * The agent POSTs each DeepBook action here; the frontend reads it for the
 * per-iWallet "Agent Trades" tab and the global all-agents feed. A ring buffer
 * is plenty for the demo — it resets on restart, and the agent re-posts every
 * tick. Swap for a DB/file if persistence across restarts is needed.
 */

export const TradeSchema = z.object({
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
  memoriesUsed: z.number().optional(),
});

export type TradeInput = z.infer<typeof TradeSchema>;

export type TradeRecord = TradeInput & {
  id: string;
  ts: number;
};

const MAX = 200;
const buffer: TradeRecord[] = [];

export function addTrade(input: TradeInput): TradeRecord {
  const rec: TradeRecord = {
    ...input,
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    ts: Date.now(),
  };
  buffer.unshift(rec); // newest first
  if (buffer.length > MAX) buffer.length = MAX;
  return rec;
}

export function listTrades(limit = 50): TradeRecord[] {
  return buffer.slice(0, Math.max(0, Math.min(limit, MAX)));
}

export function listTradesByIdentity(identityId: string, limit = 50): TradeRecord[] {
  return buffer.filter((t) => t.identityId === identityId).slice(0, limit);
}
