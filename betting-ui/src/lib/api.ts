import type { AgentPick, HarnessState } from './types';

const AGENT =
  (import.meta as { env?: { VITE_AGENT_URL?: string } }).env?.VITE_AGENT_URL ??
  'http://localhost:8787';

export async function fetchAgentState(): Promise<HarnessState> {
  const res = await fetch(`${AGENT}/state`);
  if (!res.ok) throw new Error(`agent /state ${res.status}`);
  return res.json();
}

export async function runAgentTick(): Promise<void> {
  await fetch(`${AGENT}/tick`, { method: 'POST' });
}

/** Flatten the harness state into the feed shape the UI renders. */
export function stateToPicks(state: HarnessState): AgentPick[] {
  const t = state.lastTick;
  if (!t) return [];
  const byBet = new Map(t.bets.map((b) => [b.pick.marketId + b.pick.outcome, b]));
  return t.picks.map((p) => {
    const bet = byBet.get(p.marketId + p.outcome);
    const digest = bet?.digest ?? '';
    let status: AgentPick['status'];
    let failReason: string | undefined;
    if (digest && !digest.startsWith('stub-')) {
      status = 'onchain';
    } else if (digest.startsWith('stub-')) {
      status = 'stub';
    } else {
      // No successful bet — surface the on-chain abort from notes.
      const note = t.notes.find((n) => n.includes(p.marketId));
      const m = note?.match(/:\s*(.*)$/);
      failReason = m
        ? m[1].replace(/.*MoveAbort.*?sportsbook::/, 'sportsbook::')
        : note;
      status = 'reverted';
    }
    return {
      ts: t.ts,
      marketId: p.marketId,
      marketTitle: shortMarket(p.marketId, t.events),
      outcome: p.outcome,
      stake: p.stake,
      odds: p.odds,
      rationale: p.rationale,
      txDigest: digest,
      auditUrl: bet?.url,
      onchainMarketId: bet?.marketId || undefined,
      status,
      failReason,
    };
  });
}

function shortMarket(
  marketId: string,
  events: HarnessState['lastTick'] extends null
    ? never
    : NonNullable<HarnessState['lastTick']>['events'],
): string {
  const ev = events.find((e) => e.id === marketId);
  return ev ? `${ev.home} vs ${ev.away}` : marketId.slice(0, 10) + '…';
}
