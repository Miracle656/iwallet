"use client";

import { useState } from "react";
import { fetchManagerBalance, fetchOpenOrders, type Pool } from "@/lib/deepbook";
import { usePoll } from "@/lib/use-poll";
import { HiOutlineCpuChip, HiOutlineLockClosed } from "react-icons/hi2";

/**
 * Read-only agent monitor (George's call: no manual trading buttons on the
 * DeepBook side — the dedicated agent presses the buttons, users just watch).
 *
 * Shows the agent's BalanceManager balances + open-order count for the pool,
 * if NEXT_PUBLIC_AGENT_BALANCE_MANAGER_ID is set. Everything here is observation;
 * the agent acts autonomously within its on-chain policy.
 */
const AGENT_BM = process.env.NEXT_PUBLIC_AGENT_BALANCE_MANAGER_ID ?? "";

export function AgentPanel({ pool, pollMs = 8000 }: { pool: Pool; pollMs?: number }) {
  const [base, setBase] = useState<number | null>(null);
  const [quote, setQuote] = useState<number | null>(null);
  const [openOrders, setOpenOrders] = useState<number | null>(null);

  usePoll(
    () => {
      if (!AGENT_BM) return;
      Promise.all([
        fetchManagerBalance(AGENT_BM, pool.base),
        fetchManagerBalance(AGENT_BM, pool.quote),
        fetchOpenOrders(pool.key, AGENT_BM),
      ]).then(([b, q, o]) => {
        setBase(b);
        setQuote(q);
        setOpenOrders(o.length);
      });
    },
    pollMs,
    [pool.key, pool.base, pool.quote, pollMs],
  );

  return (
    <div className="flex h-full flex-col gap-4">
      <div className="rounded-[1.6rem] border border-accent/20 bg-accent/5 p-4">
        <p className="inline-flex items-center gap-2 text-sm font-semibold text-accent">
          <HiOutlineCpuChip /> Autonomous agent
        </p>
        <p className="mt-1 inline-flex items-center gap-1.5 text-xs text-muted">
          <HiOutlineLockClosed className="text-dim" />
          No manual trading — the agent acts within its on-chain policy.
        </p>
      </div>

      {AGENT_BM ? (
        <div className="rounded-[1.25rem] border border-border p-4">
          <p className="text-xs uppercase tracking-[0.14em] text-dim">Agent BalanceManager</p>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <Metric label={pool.base} value={base} />
            <Metric label={pool.quote} value={quote} />
          </div>
          <div className="mt-3 flex items-center justify-between rounded-lg bg-canvas px-3 py-2 text-sm">
            <span className="text-dim">Open orders</span>
            <span className="font-mono text-ink">{openOrders ?? "—"}</span>
          </div>
        </div>
      ) : (
        <div className="rounded-[1.25rem] border border-border p-4 text-xs text-muted">
          Set <code className="text-ink">NEXT_PUBLIC_AGENT_BALANCE_MANAGER_ID</code> to show the
          agent&apos;s live balances and open orders on this venue.
        </div>
      )}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number | null }) {
  return (
    <div className="rounded-lg bg-canvas px-3 py-2">
      <p className="text-[11px] text-dim">{label}</p>
      <p className="font-mono text-sm text-ink">{value == null ? "—" : value.toLocaleString()}</p>
    </div>
  );
}
