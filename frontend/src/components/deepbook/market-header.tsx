"use client";

import { useEffect, useRef, useState } from "react";
import { POOLS, fetchMidPrice, type Pool } from "@/lib/deepbook";
import { HiChevronDown, HiOutlineChartBar } from "react-icons/hi2";

export function MarketHeader({
  pool,
  onSelect,
}: {
  pool: Pool;
  onSelect: (p: Pool) => void;
}) {
  const [open, setOpen] = useState(false);
  const [mid, setMid] = useState<number | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let alive = true;
    const tick = async () => {
      const m = await fetchMidPrice(pool.key);
      if (alive) setMid(m);
    };
    tick();
    const t = setInterval(tick, 3000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, [pool.key]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  return (
    <div className="flex flex-wrap items-center gap-5 border-b border-border px-5 py-4">
      <div ref={ref} className="relative">
        <button
          onClick={() => setOpen((v) => !v)}
          className="flex items-center gap-2 rounded-xl border border-border bg-canvas px-3 py-2 text-sm font-semibold text-ink hover:border-accent/40"
        >
          <span className="grid h-7 w-7 place-items-center rounded-full bg-elevated text-accent">
            <HiOutlineChartBar />
          </span>
          {pool.label}
          <HiChevronDown className="text-dim" />
        </button>
        {open && (
          <div className="absolute left-0 top-full z-20 mt-2 w-56 overflow-hidden rounded-xl border border-border bg-elevated shadow-xl">
            {POOLS.map((p) => (
              <button
                key={p.key}
                onClick={() => {
                  onSelect(p);
                  setOpen(false);
                }}
                className={`flex w-full items-center justify-between px-4 py-2.5 text-left text-sm transition hover:bg-elevated ${p.key === pool.key ? "text-accent" : "text-ink"}`}
              >
                {p.label}
              </button>
            ))}
          </div>
        )}
      </div>

      <div>
        <p className="text-xs uppercase tracking-[0.14em] text-dim">Mid price</p>
        <p className="font-mono text-2xl font-light tracking-[-0.02em] text-ink">
          {mid != null ? mid.toFixed(5) : "—"}
          <span className="ml-1 text-sm text-dim">{pool.quote}</span>
        </p>
      </div>
    </div>
  );
}
