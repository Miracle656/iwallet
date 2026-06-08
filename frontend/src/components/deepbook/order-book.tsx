"use client";

import { useEffect, useState } from "react";
import { fetchOrderBook, type OrderBook, type Pool } from "@/lib/deepbook";

export function OrderBookPanel({ pool, pollMs = 2500 }: { pool: Pool; pollMs?: number }) {
  const [book, setBook] = useState<OrderBook>({ bids: [], asks: [] });
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      const b = await fetchOrderBook(pool.key, 12);
      if (alive) {
        setBook(b);
        setLoaded(true);
      }
    };
    load();
    const t = setInterval(load, pollMs);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, [pool.key, pollMs]);

  const asks = book.asks.slice(0, 10).reverse();
  const bids = book.bids.slice(0, 10);
  const maxQty = Math.max(
    1,
    ...asks.map((a) => a.quantity),
    ...bids.map((b) => b.quantity),
  );
  const spread =
    bids[0] && asks[asks.length - 1] ? asks[asks.length - 1].price - bids[0].price : null;

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between px-1 pb-2 text-xs uppercase tracking-[0.14em] text-[#6f747a]">
        <span>Price ({pool.quote})</span>
        <span>Size ({pool.base})</span>
      </div>

      {!loaded ? (
        <p className="py-8 text-center text-sm text-[#6f747a]">Loading book…</p>
      ) : asks.length === 0 && bids.length === 0 ? (
        <p className="py-8 text-center text-sm text-[#6f747a]">No resting orders.</p>
      ) : (
        <div className="flex flex-col gap-px text-xs">
          {asks.map((a, i) => (
            <Row key={`a${i}`} price={a.price} qty={a.quantity} maxQty={maxQty} side="ask" />
          ))}
          <div className="flex items-center justify-between px-1 py-1.5 text-[#92979d]">
            <span className="text-[#6f747a]">Spread</span>
            <span className="font-mono">{spread != null ? spread.toFixed(5) : "—"}</span>
          </div>
          {bids.map((b, i) => (
            <Row key={`b${i}`} price={b.price} qty={b.quantity} maxQty={maxQty} side="bid" />
          ))}
        </div>
      )}
    </div>
  );
}

function Row({
  price,
  qty,
  maxQty,
  side,
}: {
  price: number;
  qty: number;
  maxQty: number;
  side: "ask" | "bid";
}) {
  const pct = Math.min(100, (qty / maxQty) * 100);
  const bar = side === "ask" ? "bg-red-400/15" : "bg-emerald-400/15";
  const text = side === "ask" ? "text-red-300" : "text-emerald-300";
  return (
    <div className="relative flex items-center justify-between px-1 py-1 font-mono">
      <div className={`absolute inset-y-0 right-0 ${bar}`} style={{ width: `${pct}%` }} />
      <span className={`relative ${text}`}>{price.toFixed(5)}</span>
      <span className="relative text-[#b9c2c6]">{qty.toLocaleString()}</span>
    </div>
  );
}
