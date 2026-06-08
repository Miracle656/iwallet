"use client";

import { useEffect, useState } from "react";
import { HashText } from "@/components/hash-text";
import { SUI_NETWORK } from "@/lib/sui-config";
import {
  backendConfigured,
  fetchGlobalTrades,
  fetchIdentityTrades,
  type Trade,
} from "@/lib/trades";
import {
  HiOutlineArrowTrendingDown,
  HiOutlineArrowTrendingUp,
  HiOutlineBolt,
  HiOutlineCpuChip,
  HiOutlineSignal,
} from "react-icons/hi2";

/**
 * Live agent-trade feed. Polls the backend every few seconds. Used both
 * filtered to one iWallet (profile tab) and globally (the /agents page).
 */
export function AgentTradeFeed({
  identityId,
  limit = 50,
  pollMs = 5000,
}: {
  identityId?: string;
  limit?: number;
  pollMs?: number;
}) {
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!backendConfigured()) {
      setLoaded(true);
      return;
    }
    let alive = true;
    const load = async () => {
      const data = identityId
        ? await fetchIdentityTrades(identityId, limit)
        : await fetchGlobalTrades(limit);
      if (alive) {
        setTrades(data);
        setLoaded(true);
      }
    };
    load();
    const t = setInterval(load, pollMs);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, [identityId, limit, pollMs]);

  if (!backendConfigured()) {
    return (
      <div className="rounded-[1.6rem] border border-orange-300/25 bg-orange-300/5 p-5 text-sm text-orange-200">
        Live feed not configured. Set <code className="text-ink">NEXT_PUBLIC_BACKEND_URL</code>{" "}
        to the agent backend to stream trades here.
      </div>
    );
  }

  if (loaded && trades.length === 0) {
    return (
      <div className="py-10 text-center">
        <p className="inline-flex items-center gap-2 text-sm text-muted">
          <HiOutlineSignal className="text-accent" /> Waiting for the agent to trade…
        </p>
        <p className="mt-1 text-xs text-dim">Run <code>npm run trade</code> in the agent.</p>
      </div>
    );
  }

  return (
    <ul className="flex flex-col gap-2.5">
      {trades.map((t) => (
        <TradeRow key={t.id} t={t} showOwner={!identityId} />
      ))}
    </ul>
  );
}

const STATUS: Record<Trade["status"], { dot: string; label: string; cls: string }> = {
  success: { dot: "bg-emerald-300", label: "Order placed", cls: "border-emerald-300/25 text-emerald-200" },
  rejected: { dot: "bg-orange-300", label: "Policy blocked", cls: "border-orange-300/25 text-orange-200" },
  failed: { dot: "bg-red-300", label: "Failed", cls: "border-red-300/25 text-red-200" },
};

function timeAgo(ms: number): string {
  const s = Math.floor((Date.now() - ms) / 1000);
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

function TradeRow({ t, showOwner }: { t: Trade; showOwner: boolean }) {
  const s = STATUS[t.status];
  const isBid = t.side === "bid";
  return (
    <li className="rounded-[1.4rem] border border-border bg-canvas p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span
            className={`grid h-9 w-9 place-items-center rounded-full bg-elevated ${isBid ? "text-emerald-300" : "text-accent"}`}
          >
            {isBid ? <HiOutlineArrowTrendingUp /> : <HiOutlineArrowTrendingDown />}
          </span>
          <div>
            <p className="text-sm font-medium text-ink">
              {t.agentName && (
                <span className="mr-2 rounded-full bg-accent/15 px-2 py-0.5 text-xs font-semibold text-accent">
                  {t.agentName}
                </span>
              )}
              {t.side.toUpperCase()} {t.quantity} on {t.pool}
              <span className="text-dim"> @ {t.price}</span>
            </p>
            <p className="mt-0.5 inline-flex items-center gap-2 text-xs text-dim">
              <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />
              <span className={`rounded-full border px-2 py-0.5 ${s.cls}`}>{s.label}</span>
              {t.midPrice != null && <span>mid {t.midPrice}</span>}
              <span>{timeAgo(t.ts)}</span>
            </p>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1 text-xs">
          {t.orderDigest && (
            <a
              href={`https://suiscan.xyz/${SUI_NETWORK}/tx/${t.orderDigest}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 font-mono text-accent hover:underline"
            >
              <HiOutlineBolt /> order {t.orderDigest.slice(0, 8)}…
            </a>
          )}
          {t.withdrawDigest && (
            <a
              href={`https://suiscan.xyz/${SUI_NETWORK}/tx/${t.withdrawDigest}`}
              target="_blank"
              rel="noreferrer"
              className="font-mono text-muted hover:text-ink hover:underline"
            >
              vault {t.withdrawDigest.slice(0, 8)}…
            </a>
          )}
        </div>
      </div>

      {(t.rationale || t.reason || showOwner || t.memoriesUsed) && (
        <div className="mt-3 border-t border-border pt-3">
          {t.reason && t.status !== "success" && (
            <p className="text-xs text-orange-200">Reason: {t.reason}</p>
          )}
          {t.rationale && <p className="text-xs text-muted">{t.rationale}</p>}
          <div className="mt-2 flex flex-wrap items-center gap-3 text-[11px] text-dim">
            {showOwner && (
              <span className="inline-flex items-center gap-1">
                iWallet <HashText value={t.identityId} chars={5} />
              </span>
            )}
            {typeof t.memoriesUsed === "number" && t.memoriesUsed > 0 && (
              <span className="inline-flex items-center gap-1">
                <HiOutlineCpuChip /> recalled {t.memoriesUsed} memories
              </span>
            )}
          </div>
        </div>
      )}
    </li>
  );
}
