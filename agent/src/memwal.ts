import { MemWal } from "@mysten-incubation/memwal";

/**
 * Persistent, encrypted agent memory on Walrus via MemWal.
 *
 * The agent remembers every bet it places (decision + rationale + on-chain tx)
 * and recalls relevant history before the next pick, so Claude reasons with the
 * agent's own track record instead of starting cold each tick.
 *
 * Graceful no-op when MEMWAL_KEY / MEMWAL_ACCOUNT_ID are unset — the rest of
 * the loop runs unchanged.
 */

const KEY = process.env.MEMWAL_KEY;
const ACCOUNT = process.env.MEMWAL_ACCOUNT_ID;
const SERVER =
  process.env.MEMWAL_SERVER_URL ?? "https://relayer.staging.memwal.ai";
const NAMESPACE = process.env.MEMWAL_NAMESPACE ?? "iwallet-agent";

export function memwalEnabled(): boolean {
  return !!(KEY && ACCOUNT);
}

let client: ReturnType<typeof MemWal.create> | null = null;
function getClient(): ReturnType<typeof MemWal.create> | null {
  if (!memwalEnabled()) return null;
  if (!client) {
    client = MemWal.create({
      key: KEY!,
      accountId: ACCOUNT!,
      serverUrl: SERVER,
      namespace: NAMESPACE,
    });
  }
  return client;
}

export type BetMemory = {
  sport: string;
  home: string;
  away: string;
  outcome: string;
  odds: number;
  stake: number;
  rationale: string;
  digest: string;
  marketId: string;
};

/** Store a bet as a memory. Fire-and-forget; failures don't break the tick. */
export async function rememberBet(b: BetMemory): Promise<void> {
  const c = getClient();
  if (!c) return;
  const text =
    `Placed ${b.outcome.toUpperCase()} on ${b.home} vs ${b.away} (${b.sport}) ` +
    `at decimal odds ${b.odds}, stake ${b.stake} MIST. ` +
    `Reasoning: ${b.rationale} ` +
    `On-chain tx ${b.digest}, market ${b.marketId}.`;
  try {
    await c.remember(text);
  } catch (e) {
    console.warn("[memwal] remember failed:", (e as Error).message);
  }
}

/** Recall memories relevant to a query; returns the memory texts (best-first). */
export async function recallContext(
  query: string,
  limit = 5,
): Promise<string[]> {
  const c = getClient();
  if (!c) return [];
  try {
    const res = await c.recall(query, limit);
    return (res.results ?? []).map((r) => r.text);
  } catch (e) {
    console.warn("[memwal] recall failed:", (e as Error).message);
    return [];
  }
}
