import type { Market } from '../lib/types';
import { fmtVolume, impliedPct, sportIcon } from '../lib/markets';

function closesIn(ms?: number): string {
  if (!ms) return '';
  const d = ms - Date.now();
  if (d <= 0) return 'closed';
  const h = Math.floor(d / 3600000);
  if (h < 24) return `closes ${h}h`;
  return `closes ${Math.floor(h / 24)}d`;
}

export default function MarketCard({ m }: { m: Market }) {
  return (
    <div className="group flex flex-col rounded-2xl border border-line bg-card p-4 shadow-card transition hover:shadow-cardHover">
      <div className="flex items-start gap-3">
        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-bg text-lg">
          {sportIcon(m.sport)}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-muted">
              {m.sportLabel}
            </span>
            {m.live && (
              <span className="rounded-full bg-positiveBg px-1.5 py-0.5 text-[10px] font-bold text-positive">
                LIVE ON-CHAIN
              </span>
            )}
            {m.agentActive && (
              <span className="rounded-full bg-accentSoft px-1.5 py-0.5 text-[10px] font-bold text-accent">
                AGENT ACTIVE
              </span>
            )}
          </div>
          <h3 className="mt-0.5 truncate text-[15px] font-semibold leading-tight">
            {m.home} <span className="text-muted">vs</span> {m.away}
          </h3>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <Outcome label={m.home} odds={m.homeOdds} side="home" />
        <Outcome label={m.away} odds={m.awayOdds} side="away" />
      </div>

      <div className="mt-3 flex items-center justify-between text-xs text-muted">
        <span>{fmtVolume(m.volume)} Vol.</span>
        <span>{closesIn(m.closesAt)}</span>
      </div>
    </div>
  );
}

function Outcome({
  label,
  odds,
  side,
}: {
  label: string;
  odds: number;
  side: 'home' | 'away';
}) {
  const tone =
    side === 'home'
      ? 'hover:bg-positiveBg hover:text-positive hover:border-positive'
      : 'hover:bg-negativeBg hover:text-negative hover:border-negative';
  return (
    <button
      className={
        'flex flex-col items-start rounded-xl border border-line bg-bg px-3 py-2 text-left transition ' +
        tone
      }
    >
      <span className="w-full truncate text-xs font-medium text-muted">
        {label}
      </span>
      <span className="mt-0.5 flex w-full items-baseline justify-between">
        <span className="text-lg font-bold tabular-nums">{odds.toFixed(2)}</span>
        <span className="text-[11px] font-semibold text-muted">
          {impliedPct(odds)}%
        </span>
      </span>
    </button>
  );
}
