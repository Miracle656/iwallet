import { useEffect, useState } from 'react';
import type { AgentPick } from '../lib/types';
import { fetchAgentState, runAgentTick, stateToPicks } from '../lib/api';

function ago(ts: number): string {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  return `${Math.floor(s / 3600)}h ago`;
}

export default function AgentFeed() {
  const [picks, setPicks] = useState<AgentPick[]>([]);
  const [memCount, setMemCount] = useState(0);
  const [status, setStatus] = useState<'idle' | 'live' | 'offline'>('idle');
  const [running, setRunning] = useState(false);

  async function load() {
    try {
      const s = await fetchAgentState();
      setPicks(stateToPicks(s));
      setMemCount(s.lastTick?.memoriesUsed?.length ?? 0);
      setStatus('live');
    } catch {
      setStatus('offline');
    }
  }

  useEffect(() => {
    load();
    const t = setInterval(load, 8000);
    return () => clearInterval(t);
  }, []);

  async function onRun() {
    setRunning(true);
    try {
      await runAgentTick();
      await load();
    } finally {
      setRunning(false);
    }
  }

  return (
    <aside className="flex h-full flex-col rounded-2xl border border-line bg-card">
      <div className="flex items-center justify-between border-b border-line px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span
              className={
                'absolute inline-flex h-full w-full rounded-full ' +
                (status === 'live'
                  ? 'animate-ping bg-positive opacity-75'
                  : 'bg-muted')
              }
            />
            <span
              className={
                'relative inline-flex h-2 w-2 rounded-full ' +
                (status === 'live' ? 'bg-positive' : 'bg-muted')
              }
            />
          </span>
          <h2 className="text-sm font-bold">Agent Feed</h2>
        </div>
        <button
          onClick={onRun}
          disabled={running || status === 'offline'}
          className="rounded-lg bg-ink px-2.5 py-1 text-xs font-semibold text-card disabled:opacity-40"
        >
          {running ? 'running…' : 'Run tick'}
        </button>
      </div>

      <div className="border-b border-line bg-bg px-4 py-2 text-[11px] text-muted">
        Autonomous AI agent · ZK-bound mandate · no signing key
        {memCount > 0 && (
          <span className="text-accent">
            {' '}
            · recalled {memCount} encrypted {memCount === 1 ? 'memory' : 'memories'}
          </span>
        )}
      </div>

      <div className="feed-scroll flex-1 overflow-y-auto">
        {status === 'offline' && (
          <p className="px-4 py-6 text-center text-xs text-muted">
            Agent harness offline. Start it: <code>npm run serve</code> in{' '}
            <code>agent/</code>.
          </p>
        )}
        {status !== 'offline' && picks.length === 0 && (
          <p className="px-4 py-6 text-center text-xs text-muted">
            No picks yet — hit “Run tick”.
          </p>
        )}
        <ul className="divide-y divide-line">
          {picks.map((p, i) => (
            <li key={i} className="px-4 py-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold">
                  {p.marketTitle}
                </span>
                <span className="text-[11px] text-muted">{ago(p.ts)}</span>
              </div>
              <div className="mt-1 flex items-center gap-2">
                <span
                  className={
                    'rounded-md px-1.5 py-0.5 text-[11px] font-bold ' +
                    (p.outcome === 'away'
                      ? 'bg-negativeBg text-negative'
                      : 'bg-positiveBg text-positive')
                  }
                >
                  {p.outcome.toUpperCase()} @ {p.odds.toFixed(2)}
                </span>
                <span className="text-[11px] text-muted">
                  stake {p.stake.toLocaleString()} MIST
                </span>
              </div>
              <p className="mt-1.5 text-[12px] leading-snug text-ink/80">
                {p.rationale}
              </p>
              <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px]">
                {p.status === 'onchain' && (
                  <a
                    className="font-semibold text-positive hover:underline"
                    target="_blank"
                    rel="noreferrer"
                    href={`https://suiscan.xyz/testnet/tx/${p.txDigest}`}
                  >
                    ✓ proof-verified tx ↗
                  </a>
                )}
                {p.status === 'onchain' && p.onchainMarketId && (
                  <a
                    className="font-medium text-accent hover:underline"
                    target="_blank"
                    rel="noreferrer"
                    href={`https://suiscan.xyz/testnet/object/${p.onchainMarketId}`}
                  >
                    view market ↗
                  </a>
                )}
                {p.status === 'reverted' && (
                  <span className="font-medium text-negative">
                    reverted: {p.failReason ?? 'on-chain abort'}
                  </span>
                )}
                {p.status === 'stub' && (
                  <span className="text-muted">stub (no signing key)</span>
                )}
                {p.auditUrl && (
                  <a
                    className="font-medium text-accent hover:underline"
                    target="_blank"
                    rel="noreferrer"
                    href={p.auditUrl}
                  >
                    audit blob ↗
                  </a>
                )}
              </div>
            </li>
          ))}
        </ul>
      </div>
    </aside>
  );
}
