/**
 * Push agent trade events to the backend feed (Sub-track 2 dashboard).
 *
 * Fire-and-forget: a missing BACKEND_URL or a failed POST never breaks the
 * trade tick. The frontend reads these for the per-iWallet "Agent Trades" tab
 * and the global all-agents feed.
 */

export type TradeReport = {
  identityId: string;
  owner?: string;
  pool: string;
  side: 'ask' | 'bid';
  price: number;
  quantity: number;
  amountMist?: string;
  midPrice?: number | null;
  withdrawDigest?: string;
  orderDigest?: string;
  status: 'success' | 'rejected' | 'failed';
  reason?: string;
  rationale?: string;
  memoriesUsed?: number;
};

export async function postTrade(report: TradeReport): Promise<void> {
  const base = process.env.BACKEND_URL;
  if (!base) return; // dashboard reporting disabled — no-op
  try {
    const res = await fetch(`${base.replace(/\/$/, '')}/trades`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-IWALLET-API-KEY': process.env.BACKEND_API_KEY ?? '',
      },
      body: JSON.stringify(report),
    });
    if (!res.ok) console.warn(`[report] POST /trades -> ${res.status}`);
  } catch (e) {
    console.warn('[report] post failed:', e instanceof Error ? e.message : e);
  }
}
