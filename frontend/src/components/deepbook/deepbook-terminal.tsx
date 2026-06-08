"use client";

import { useState } from "react";
import { POOLS, type Pool } from "@/lib/deepbook";
import { AgentTradeFeed } from "@/components/agent-trade-feed";
import { MarketHeader } from "./market-header";
import { OrderBookPanel } from "./order-book";
import { PriceChart } from "./price-chart";
import { TradePanel } from "./trade-panel";

/**
 * Full DeepBook trading terminal: live chart + order book, a wallet-signed
 * Buy/Sell + BalanceManager panel, and the autonomous-agent trade feed below —
 * humans and agents trading the same pool, side by side.
 */
export function DeepBookTerminal() {
  const [pool, setPool] = useState<Pool>(POOLS[0]);

  return (
    <div className="overflow-hidden rounded-[2.4rem] border border-white/10 bg-[#131416]">
      <MarketHeader pool={pool} onSelect={setPool} />

      <div className="grid grid-cols-1 gap-px bg-white/5 lg:grid-cols-[1fr_300px_320px]">
        {/* chart + agent feed */}
        <div className="flex flex-col gap-px bg-white/5">
          <div className="h-[340px] bg-[#131416] p-3">
            <PriceChart pool={pool} />
          </div>
          <div className="bg-[#131416] p-5">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-[#e5eef1]">Agent activity</h3>
              <span className="text-xs text-[#6f747a]">autonomous trades on this venue</span>
            </div>
            <AgentTradeFeed limit={20} />
          </div>
        </div>

        {/* order book */}
        <div className="bg-[#131416] p-4">
          <OrderBookPanel pool={pool} />
        </div>

        {/* trade panel */}
        <div className="bg-[#131416] p-4">
          <TradePanel pool={pool} />
        </div>
      </div>
    </div>
  );
}
