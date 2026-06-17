"use client";

import { useEffect, useRef, useState } from "react";
import { HashText } from "@/components/hash-text";
import { AgentTradeFeed } from "@/components/agent-trade-feed";
import type { ActivityItem, CoinHolding, IdentityProfile, PolicyView } from "@/lib/sui-client";
import { SUI_NETWORK } from "@/lib/sui-config";
import {
  HiOutlineArrowTopRightOnSquare,
  HiOutlineBanknotes,
  HiOutlineClock,
  HiOutlineCpuChip,
  HiOutlineCube,
  HiOutlinePaperAirplane,
  HiOutlineShieldCheck,
  HiOutlineWallet,
} from "react-icons/hi2";

const BACKEND = (process.env.NEXT_PUBLIC_BACKEND_URL ?? "").replace(/\/$/, "");

type AgentResponse = {
  message: string;
  execution_plan: string[];
  results: { agent: string; status: "success" | "error"; result: unknown }[];
  requires_confirmation: boolean;
};

type ChatMsg = {
  id: string;
  role: "user" | "agent";
  text: string;
  response?: AgentResponse;
  error?: string;
};

const tabs = ["Portfolio", "Policy", "Agent", "Agent Trades", "Activity"] as const;

export function IWalletProfile({
  profile,
  activity,
}: {
  profile: IdentityProfile;
  activity: ActivityItem[];
}) {
  const [tab, setTab] = useState<(typeof tabs)[number]>("Portfolio");

  const sui = profile.coins.find((c) => c.coinType === "0x2::sui::SUI");
  const suiBalance = sui?.amount ?? "0";
  const explorer = `https://suiscan.xyz/${SUI_NETWORK}/object/${profile.objectId}`;
  const funded = profile.coins.length > 0 || profile.stagedBalanceSui > 0;

  return (
    <div className="flex flex-col gap-3">
      <section className="rounded-[2.4rem] border border-border bg-surface p-5 sm:p-7">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex items-center gap-4">
            <div className="grid h-14 w-14 place-items-center rounded-2xl bg-elevated text-2xl text-accent">
              <HiOutlineWallet />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-2xl font-semibold text-ink">{profile.name}</h1>
                <span
                  className={`rounded-full border px-3 py-1.5 text-xs font-medium ${funded ? "border-accent/35 bg-accent/10 text-accent" : "border-orange-300/30 bg-orange-300/10 text-orange-200"}`}
                >
                  {funded ? "Active" : "Unfunded"}
                </span>
              </div>
              <div className="mt-1.5 flex items-center gap-3 text-sm">
                <HashText value={profile.objectId} chars={10} />
                <a
                  href={explorer}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-accent hover:underline"
                >
                  Suiscan <HiOutlineArrowTopRightOnSquare />
                </a>
              </div>
            </div>
          </div>

          <div className="rounded-[1.9rem] border border-border p-5 text-right">
            <p className="inline-flex items-center gap-2 text-sm text-muted">
              <HiOutlineBanknotes className="text-accent" /> SUI Balance
            </p>
            <p className="mt-1 text-5xl font-light tracking-[-0.04em] text-ink">
              {suiBalance}
              <span className="text-2xl text-dim"> SUI</span>
            </p>
            <p className="mt-1 text-xs text-dim">staged in vault: {profile.stagedBalanceSui} SUI</p>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Meta label="Owner" value={profile.owner ? <HashText value={profile.owner} chars={6} /> : "—"} />
          <Meta label="Identity hash" value={<HashText value={profile.identityHash} chars={6} />} />
          <Meta label="Network" value="Sui Testnet" />
          <Meta label="Coin types" value={String(profile.coins.length)} />
        </div>
      </section>

      <section className="rounded-[2.4rem] border border-border bg-surface p-5 sm:p-7">
        <div className="flex gap-2 overflow-x-auto border-b border-border pb-4 [&::-webkit-scrollbar]:hidden">
          {tabs.map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-shrink-0 rounded-full px-4 py-2 text-sm font-medium transition ${t === tab ? "bg-accent text-on-accent" : "text-muted hover:text-ink"}`}
            >
              {t}
            </button>
          ))}
        </div>

        <div className="mt-5">
          {tab === "Portfolio" && <PortfolioTab coins={profile.coins} />}
          {tab === "Policy" && <PolicyTab policy={profile.policy} />}
          {tab === "Agent" && <AgentTab iWalletId={profile.objectId} />}
          {tab === "Agent Trades" && <AgentTradeFeed identityId={profile.objectId} />}
          {tab === "Activity" && <ActivityTab activity={activity} />}
        </div>
      </section>
    </div>
  );
}

function Meta({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-[1.25rem] border border-border p-4">
      <p className="text-xs text-dim">{label}</p>
      <div className="mt-2 truncate text-sm text-ink">{value}</div>
    </div>
  );
}

function PortfolioTab({ coins }: { coins: CoinHolding[] }) {
  if (coins.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted">
        No coins yet. Fund this iWallet by sending SUI to its object address above.
      </p>
    );
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[520px] text-left text-sm">
        <thead className="text-xs uppercase tracking-[0.14em] text-dim">
          <tr>
            <th className="px-3 py-2 font-medium">Coin</th>
            <th className="px-3 py-2 font-medium">Type</th>
            <th className="px-3 py-2 font-medium text-right">Amount</th>
            <th className="px-3 py-2 font-medium text-right">Objects</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {coins.map((c) => (
            <tr key={c.coinType} className="text-muted">
              <td className="px-3 py-3 font-medium text-ink">
                <span className="inline-flex items-center gap-2">
                  <span className="grid h-7 w-7 place-items-center rounded-full bg-elevated text-accent"><HiOutlineCube /></span>
                  {c.symbol}
                </span>
              </td>
              <td className="px-3 py-3"><HashText value={c.coinType} chars={6} /></td>
              <td className="px-3 py-3 text-right font-mono tabular-nums text-ink">{c.amount}</td>
              <td className="px-3 py-3 text-right">{c.objectCount}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function PolicyTab({ policy }: { policy: PolicyView | null }) {
  if (!policy) {
    return (
      <div className="py-8 text-center">
        <p className="text-sm text-ink">No agent policy set.</p>
        <p className="mt-1 text-xs text-muted">
          Set a budget cap, allowed pools, and expiry to authorize an agent on-chain.
        </p>
      </div>
    );
  }
  const pct = policy.budgetCapSui > 0 ? Math.min(100, (policy.amountSpentSui / policy.budgetCapSui) * 100) : 0;
  const remaining = Math.max(0, policy.budgetCapSui - policy.amountSpentSui);
  const expired = policy.expirationMs > 0 && policy.expirationMs < Date.now();
  const expiryLabel = policy.expirationMs ? new Date(policy.expirationMs).toLocaleString() : "—";

  return (
    <div className="flex flex-col gap-5">
      <div className="rounded-[1.6rem] border border-accent/20 bg-accent/5 p-5">
        <p className="inline-flex items-center gap-2 text-sm text-accent">
          <HiOutlineShieldCheck /> Enforced on-chain by AgentPolicy
        </p>
        <p className="mt-1 text-xs text-muted">
          The agent physically cannot exceed these limits — every withdrawal is checked by the Move contract.
        </p>
      </div>

      <div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted">Budget used</span>
          <span className="font-mono text-ink">
            {policy.amountSpentSui} / {policy.budgetCapSui} SUI
          </span>
        </div>
        <div className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-elevated">
          <div className="h-full rounded-full bg-accent" style={{ width: `${pct}%` }} />
        </div>
        <p className="mt-1.5 text-xs text-dim">{remaining} SUI remaining</p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="rounded-[1.25rem] border border-border p-4">
          <p className="inline-flex items-center gap-2 text-xs text-dim"><HiOutlineClock /> Expiry</p>
          <p className={`mt-2 text-sm ${expired ? "text-red-300" : "text-ink"}`}>
            {expiryLabel}{expired ? " (expired)" : ""}
          </p>
        </div>
        <div className="rounded-[1.25rem] border border-border p-4">
          <p className="text-xs text-dim">Allowed recipients (protocol scope)</p>
          {policy.allowRecipients.length === 0 ? (
            <p className="mt-2 text-sm text-muted">None</p>
          ) : (
            <ul className="mt-2 flex flex-col gap-1">
              {policy.allowRecipients.map((r) => (
                <li key={r}><HashText value={r} chars={8} /></li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

function AgentTab({ iWalletId }: { iWalletId: string }) {
  const [msgs, setMsgs] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [msgs, loading]);

  async function send() {
    const text = input.trim();
    if (!text || loading) return;
    setMsgs((p) => [...p, { id: crypto.randomUUID(), role: "user", text }]);
    setInput("");
    setLoading(true);
    try {
      const res = await fetch(`${BACKEND}/v1/agent/execute`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: text, iWalletId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? `Agent error (${res.status})`);
      setMsgs((p) => [
        ...p,
        { id: crypto.randomUUID(), role: "agent", text: data.message, response: data as AgentResponse },
      ]);
    } catch (e) {
      setMsgs((p) => [
        ...p,
        { id: crypto.randomUUID(), role: "agent", text: "", error: e instanceof Error ? e.message : "Unknown error" },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Chat history */}
      <div className="flex min-h-72 max-h-[460px] flex-col gap-3 overflow-y-auto rounded-[1.6rem] border border-border bg-canvas p-4">
        {msgs.length === 0 && (
          <div className="m-auto flex flex-col items-center gap-3 py-8 text-center">
            <span className="grid h-12 w-12 place-items-center rounded-2xl bg-elevated text-2xl text-accent">
              <HiOutlineCpuChip />
            </span>
            <div>
              <p className="text-sm font-medium text-ink">Ask your agent anything</p>
              <p className="mt-1 text-xs text-muted">
                Try &quot;swap 10 SUI for USDC&quot; or &quot;what&apos;s my policy cap?&quot;
              </p>
            </div>
          </div>
        )}

        {msgs.map((msg) => (
          <div
            key={msg.id}
            className={`flex items-start gap-2.5 ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}
          >
            {msg.role === "agent" && (
              <span className="mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-elevated text-accent text-sm">
                <HiOutlineCpuChip />
              </span>
            )}

            <div className={`flex max-w-[85%] flex-col gap-2 ${msg.role === "user" ? "items-end" : "items-start"}`}>
              <div
                className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                  msg.role === "user"
                    ? "rounded-tr-sm bg-accent text-on-accent"
                    : "rounded-tl-sm bg-elevated text-ink"
                }`}
              >
                {msg.role === "user"
                  ? msg.text
                  : msg.error
                    ? msg.error
                    : (msg.response?.message ?? msg.text)}
              </div>

              {msg.response && msg.response.execution_plan.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {msg.response.execution_plan.map((step, i) => (
                    <span key={i} className="rounded-full bg-accent/10 px-2.5 py-1 text-[11px] font-medium text-accent">
                      {step}
                    </span>
                  ))}
                </div>
              )}

              {msg.response?.results.map((r, i) => (
                <div
                  key={i}
                  className={`w-full rounded-[1rem] border p-3 ${
                    r.status === "success"
                      ? "border-emerald-300/25 bg-emerald-300/5"
                      : "border-red-300/25 bg-red-300/5"
                  }`}
                >
                  <p className={`text-[11px] font-semibold mb-1 ${r.status === "success" ? "text-emerald-300" : "text-red-300"}`}>
                    {r.agent}
                  </p>
                  <pre className="whitespace-pre-wrap break-all text-[11px] text-muted">
                    {typeof r.result === "string" ? r.result : JSON.stringify(r.result, null, 2)}
                  </pre>
                </div>
              ))}

              {msg.response?.requires_confirmation && (
                <p className="text-[11px] text-amber-300">
                  ⚠ Multiple actions — verify results above before treating them as final.
                </p>
              )}

              {msg.error && (
                <div className="w-full rounded-[1rem] border border-red-300/25 bg-red-300/5 p-3 text-xs text-red-300">
                  {msg.error}
                </div>
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex items-center gap-2.5">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-elevated text-accent text-sm">
              <HiOutlineCpuChip />
            </span>
            <div className="rounded-2xl rounded-tl-sm bg-elevated px-4 py-3">
              <div className="flex gap-1">
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-accent [animation-delay:0ms]" />
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-accent [animation-delay:150ms]" />
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-accent [animation-delay:300ms]" />
              </div>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input bar */}
      <div className="flex items-end gap-2">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send();
            }
          }}
          placeholder='e.g. "swap 10 SUI for USDC" or "set my budget to 500 SUI"'
          rows={2}
          className="flex-1 resize-none rounded-xl border border-border bg-canvas px-4 py-3 text-sm text-ink outline-none placeholder:text-dim focus:border-accent/50"
        />
        <button
          onClick={send}
          disabled={loading || !input.trim()}
          className="flex-shrink-0 self-end inline-flex items-center gap-2 rounded-full bg-accent px-5 py-3 text-sm font-semibold text-on-accent hover:bg-accent-soft disabled:opacity-40"
        >
          <HiOutlinePaperAirplane />
          <span className="hidden sm:inline">Send</span>
        </button>
      </div>
    </div>
  );
}

function timeAgo(ms: number | null): string {
  if (!ms) return "";
  const s = Math.floor((Date.now() - ms) / 1000);
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

function ActivityTab({ activity }: { activity: ActivityItem[] }) {
  if (activity.length === 0) {
    return <p className="py-8 text-center text-sm text-muted">No on-chain activity yet.</p>;
  }
  return (
    <ul className="flex flex-col divide-y divide-border">
      {activity.map((a) => (
        <li key={a.digest} className="flex items-center justify-between gap-4 py-3">
          <div className="flex items-center gap-3">
            <span className={`h-2 w-2 rounded-full ${a.success ? "bg-emerald-300" : "bg-red-300"}`} />
            <a
              href={`https://suiscan.xyz/${SUI_NETWORK}/tx/${a.digest}`}
              target="_blank"
              rel="noreferrer"
              className="font-mono text-xs text-accent hover:underline"
            >
              {a.digest.slice(0, 10)}…{a.digest.slice(-6)}
            </a>
          </div>
          <span className="text-xs text-muted">{timeAgo(a.timestampMs)}</span>
        </li>
      ))}
    </ul>
  );
}
