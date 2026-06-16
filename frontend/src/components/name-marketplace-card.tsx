/* eslint-disable @next/next/no-img-element */
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Avatar as DiceBearAvatar, Style } from "@dicebear/core";
import bigEars from "@dicebear/styles/big-ears.json";

// Pre-generate all avatar URIs at module level — avoids repeated CPU-heavy SVG builds.
const _style = new Style(bigEars);
const _cache = new Map<string, string>();
function getAvatarUri(seed: string): string {
  if (!_cache.has(seed)) {
    _cache.set(
      seed,
      new DiceBearAvatar(_style, {
        seed,
        backgroundColor: ["b6e3f4", "c0aede", "d1d4f9", "ffd5dc", "ffdfbf"],
        size: 48,
      }).toDataUri(),
    );
  }
  return _cache.get(seed)!;
}
import {
  HiOutlineCpuChip,
  HiOutlineChartBar,
  HiOutlineShieldCheck,
  HiOutlineBolt,
  HiOutlineArrowRight,
  HiOutlineBanknotes,
} from "react-icons/hi2";

type AgentStatus = "idle" | "trading" | "verifying" | "transferring";

type AgentItem = {
  id: string;
  handle: string;
  activity: string;
  value: string;
  txHash: string;
  status: AgentStatus;
};

const baseAgents: AgentItem[] = [
  { id: "1", handle: "@alpha-trader",   activity: "Awaiting mandate",   value: "0.00 SUI",    txHash: "0x3a…d91", status: "idle" },
  { id: "2", handle: "@deepbook-bot",   activity: "Monitoring pools",   value: "420.50 SUI",  txHash: "0x7d…49j", status: "trading" },
  { id: "3", handle: "@zk-guard",       activity: "Policy guardian",    value: "0.00 SUI",    txHash: "0xe5…22c", status: "idle" },
  { id: "4", handle: "@liquidity-elf",  activity: "Yield farming",      value: "25.00 SUI",   txHash: "0x9b…11a", status: "trading" },
  { id: "5", handle: "@claude-agent",   activity: "Analyzing prompts",  value: "14.98 SUI",   txHash: "0x47…482", status: "trading" },
];

const marqueeItems = [...baseAgents, ...baseAgents, ...baseAgents];

function StatusDot({ status }: { status: AgentStatus }) {
  const cls =
    status === "trading"     ? "bg-accent" :
    status === "verifying"   ? "bg-amber-400" :
    status === "transferring"? "bg-emerald-500" :
    "bg-dim";
  return <span className={`inline-block h-1.5 w-1.5 flex-shrink-0 rounded-full ${cls}`} />;
}

function ActivityIcon({ status }: { status: AgentStatus }) {
  if (status === "verifying")    return <HiOutlineShieldCheck className="h-3.5 w-3.5 text-amber-500" />;
  if (status === "trading")      return <HiOutlineBolt className="h-3.5 w-3.5 text-accent" />;
  if (status === "transferring") return <HiOutlineBanknotes className="h-3.5 w-3.5 text-emerald-500" />;
  return <HiOutlineCpuChip className="h-3.5 w-3.5 text-dim" />;
}

function AgentRow({ agent, isActive }: { agent: AgentItem; isActive: boolean }) {
  return (
    <div
      className={`flex items-center gap-3 px-5 transition-all duration-500 ${
        isActive
          ? "py-5 bg-accent/8 border-l-[3px] border-accent"
          : "py-3.5 border-l-[3px] border-transparent"
      }`}
    >
      <div className={`flex-shrink-0 transition-all duration-500 ${isActive ? "h-12 w-12" : "h-10 w-10"}`}>
        <img
          src={getAvatarUri(agent.handle)}
          alt=""
          className="h-full w-full rounded-xl object-cover border border-border bg-elevated"
        />
      </div>
      <div className="min-w-0 flex-1">
        <p className={`truncate font-medium text-ink transition-all duration-500 ${isActive ? "text-base" : "text-sm"}`}>
          {agent.handle}
        </p>
        <div className="mt-0.5 flex items-center gap-1.5">
          <StatusDot status={agent.status} />
          <p className="truncate text-xs text-muted">{agent.activity}</p>
        </div>
      </div>
      <div className="flex flex-col items-end gap-0.5">
        <div className="flex items-center gap-1">
          <ActivityIcon status={agent.status} />
          <span className={`font-semibold tabular-nums text-ink transition-all duration-500 ${isActive ? "text-base" : "text-sm"}`}>
            {agent.status === "verifying" ? "Verified" : agent.value}
          </span>
        </div>
        <span className="font-mono text-[10px] text-dim">{agent.txHash}</span>
      </div>
    </div>
  );
}

function MetricRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-border last:border-0">
      <div className="flex items-center gap-2 text-sm text-muted">
        {icon}
        {label}
      </div>
      <span className="font-semibold tabular-nums text-ink">{value}</span>
    </div>
  );
}

export default function IWalletMonitorCard() {
  const [activeId, setActiveId]       = useState<string | null>(null);
  const [liveAgents, setLiveAgents]   = useState<AgentItem[]>(baseAgents);
  const [metrics, setMetrics]         = useState({ active: 1245, volume: 48.2, zkRatio: 99.4 });
  const [highlightPaused, setHighlightPaused] = useState(false);
  const [hoverPaused, setHoverPaused] = useState(false);
  const scrollPaused = highlightPaused || hoverPaused;

  useEffect(() => {
    const actions: { activity: string; status: AgentStatus }[] = [
      { activity: "Placing trade",       status: "trading" },
      { activity: "Verifying ZK proof",  status: "verifying" },
      { activity: "Executing transfer",  status: "transferring" },
    ];

    const interval = setInterval(() => {
      const idx    = Math.floor(Math.random() * baseAgents.length);
      const target = baseAgents[idx];
      setActiveId(target.id);
      setHighlightPaused(true);

      setLiveAgents((prev) =>
        prev.map((agent) => {
          if (agent.id !== target.id) return agent;
          const action = actions[Math.floor(Math.random() * actions.length)];
          return {
            ...agent,
            activity: action.activity,
            status:   action.status,
            value:    `${(Math.random() * 50 + 1).toFixed(2)} SUI`,
          };
        })
      );

      setMetrics((m) => ({
        active:  m.active + Math.floor(Math.random() * 3),
        volume:  parseFloat((m.volume + Math.random() * 5).toFixed(1)),
        zkRatio: parseFloat((99.4 + Math.random() * 0.5).toFixed(1)),
      }));

      setTimeout(() => {
        setActiveId(null);
        setHighlightPaused(false);
      }, 2500);
    }, 4500);

    return () => clearInterval(interval);
  }, []);

  return (
    <section className="bg-canvas px-5 py-16 sm:px-8 lg:px-10">
      <div className="mx-auto max-w-5xl">

        {/* Section header */}
        <div className="mb-10 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-accent">
              Live activity
            </p>
            <h2 className="mt-2 text-3xl font-semibold tracking-[-0.035em] text-ink sm:text-4xl">
              Monitor agents in real time
            </h2>
            <p className="mt-3 max-w-md text-sm leading-6 text-muted">
              Every iWallet agent operates within its on-chain policy — budget
              capped, time-boxed, revocable. Watch trades execute and proofs
              verify without exposing a private key.
            </p>
          </div>
          <Link
            href="/agents"
            className="inline-flex items-center gap-2 self-start rounded-full border border-border px-5 py-2.5 text-sm font-medium text-ink transition hover:border-accent/40 hover:text-accent sm:self-auto"
          >
            View all agents
            <HiOutlineArrowRight className="h-4 w-4" />
          </Link>
        </div>

        {/* Card */}
        <div className="overflow-hidden rounded-3xl border border-border bg-surface shadow-[0_12px_32px_rgba(23,22,15,0.06)]">
          <div className="grid grid-cols-1 md:grid-cols-2">

            {/* Left — metrics + copy */}
            <div className="border-b border-border p-6 sm:p-8 md:border-b-0 md:border-r">
              <p className="text-xs font-semibold uppercase tracking-widest text-muted">
                Network health
              </p>
              <div className="mt-4">
                <MetricRow
                  icon={<HiOutlineCpuChip className="h-4 w-4 text-accent" />}
                  label="Active agents"
                  value={metrics.active.toLocaleString()}
                />
                <MetricRow
                  icon={<HiOutlineChartBar className="h-4 w-4 text-accent" />}
                  label="Volume"
                  value={`${metrics.volume}k SUI`}
                />
                <MetricRow
                  icon={<HiOutlineShieldCheck className="h-4 w-4 text-accent" />}
                  label="Proof success"
                  value={`${metrics.zkRatio}%`}
                />
              </div>

              <div className="mt-6 rounded-2xl bg-elevated p-4">
                <div className="flex items-start gap-3">
                  <HiOutlineShieldCheck className="mt-0.5 h-4 w-4 flex-shrink-0 text-accent" />
                  <p className="text-xs leading-5 text-muted">
                    All transactions are verified on Sui using ZK proofs. No
                    agent can exceed the budget cap set by the owner — enforced
                    by the contract, not by trust.
                  </p>
                </div>
              </div>
            </div>

            {/* Right — scrolling agent feed */}
            <div className="relative h-[340px] overflow-hidden sm:h-[380px]">
              {/* fade overlays */}
              <div className="pointer-events-none absolute inset-x-0 top-0 z-10 h-10 bg-gradient-to-b from-surface to-transparent" />
              <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-10 bg-gradient-to-t from-surface to-transparent" />

              <div
                className="absolute inset-x-0 flex flex-col divide-y divide-border will-change-transform"
                style={{
                  animation: "marquee-y 24s linear infinite",
                  animationPlayState: scrollPaused ? "paused" : "running",
                }}
                onMouseEnter={() => setHoverPaused(true)}
                onMouseLeave={() => setHoverPaused(false)}
              >
                {marqueeItems.map((item, i) => {
                  const live = liveAgents.find((a) => a.id === item.id) ?? item;
                  return (
                    <AgentRow
                      key={`${item.id}-${i}`}
                      agent={live}
                      isActive={live.id === activeId}
                    />
                  );
                })}
              </div>
            </div>

          </div>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes marquee-y {
          from { transform: translateY(0); }
          to   { transform: translateY(-33.3333%); }
        }
      `}} />
    </section>
  );
}
