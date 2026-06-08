/**
 * Agent trade-feed client. Reads the backend feed the agent posts to
 * (BACKEND_URL/trades). Powers the per-iWallet "Agent Trades" tab and the
 * global /agents feed.
 *
 * Set NEXT_PUBLIC_BACKEND_URL in frontend/.env.local to the gas-station/feed
 * backend (e.g. http://localhost:3000, or a tunnel for the deployed site).
 */

export type TradeStatus = "success" | "rejected" | "failed";

export type Trade = {
  id: string;
  ts: number;
  identityId: string;
  agentName?: string;
  owner?: string;
  pool: string;
  side: "ask" | "bid";
  price: number;
  quantity: number;
  amountMist?: string;
  midPrice?: number | null;
  withdrawDigest?: string;
  orderDigest?: string;
  status: TradeStatus;
  reason?: string;
  rationale?: string;
  memoriesUsed?: number;
};

const BASE = (process.env.NEXT_PUBLIC_BACKEND_URL ?? "").replace(/\/$/, "");

export function backendConfigured(): boolean {
  return BASE.length > 0;
}

async function getTrades(path: string, limit: number): Promise<Trade[]> {
  if (!BASE) return [];
  try {
    const res = await fetch(`${BASE}${path}?limit=${limit}`, { cache: "no-store" });
    if (!res.ok) return [];
    const json = (await res.json()) as { trades?: Trade[] };
    return json.trades ?? [];
  } catch {
    return [];
  }
}

/** Global all-agents feed (newest first). */
export function fetchGlobalTrades(limit = 50): Promise<Trade[]> {
  return getTrades("/trades", limit);
}

/** Per-iWallet feed (newest first). */
export function fetchIdentityTrades(identityId: string, limit = 50): Promise<Trade[]> {
  return getTrades(`/trades/identity/${identityId}`, limit);
}
