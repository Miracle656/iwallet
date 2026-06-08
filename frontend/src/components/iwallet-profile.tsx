"use client";

import { useState } from "react";
import { HashText } from "@/components/hash-text";
import { AgentTradeFeed } from "@/components/agent-trade-feed";
import type { ActivityItem, CoinHolding, IdentityProfile, PolicyView } from "@/lib/sui-client";
import { SUI_NETWORK } from "@/lib/sui-config";
import {
  HiOutlineArrowTopRightOnSquare,
  HiOutlineBanknotes,
  HiOutlineClock,
  HiOutlineCube,
  HiOutlineShieldCheck,
  HiOutlineWallet,
} from "react-icons/hi2";

const tabs = ["Portfolio", "Policy", "Agent Trades", "Activity"] as const;

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
      <section className="rounded-[2.4rem] border border-white/10 bg-[#131416] p-5 sm:p-7">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex items-center gap-4">
            <div className="grid h-14 w-14 place-items-center rounded-2xl bg-[#222328] text-2xl text-[#298dff]">
              <HiOutlineWallet />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-2xl font-semibold text-[#e5eef1]">{profile.name}</h1>
                <span
                  className={`rounded-full border px-3 py-1.5 text-xs font-medium ${funded ? "border-[#298dff]/35 bg-[#298dff]/10 text-[#298dff]" : "border-orange-300/30 bg-orange-300/10 text-orange-200"}`}
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
                  className="inline-flex items-center gap-1 text-[#298dff] hover:underline"
                >
                  Suiscan <HiOutlineArrowTopRightOnSquare />
                </a>
              </div>
            </div>
          </div>

          <div className="rounded-[1.9rem] border border-white/10 p-5 text-right">
            <p className="inline-flex items-center gap-2 text-sm text-[#92979d]">
              <HiOutlineBanknotes className="text-[#298dff]" /> SUI Balance
            </p>
            <p className="mt-1 text-5xl font-light tracking-[-0.04em] text-[#e5eef1]">
              {suiBalance}
              <span className="text-2xl text-[#6f747a]"> SUI</span>
            </p>
            <p className="mt-1 text-xs text-[#6f747a]">staged in vault: {profile.stagedBalanceSui} SUI</p>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Meta label="Owner (passkey)" value={profile.owner ? <HashText value={profile.owner} chars={6} /> : "—"} />
          <Meta label="Identity hash" value={<HashText value={profile.identityHash} chars={6} />} />
          <Meta label="Network" value="Sui Testnet" />
          <Meta label="Coin types" value={String(profile.coins.length)} />
        </div>
      </section>

      <section className="rounded-[2.4rem] border border-white/10 bg-[#131416] p-5 sm:p-7">
        <div className="flex flex-wrap gap-2 border-b border-white/10 pb-4">
          {tabs.map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`rounded-full px-4 py-2 text-sm font-medium transition ${t === tab ? "bg-[#298dff] text-[#131416]" : "text-[#92979d] hover:text-[#e5eef1]"}`}
            >
              {t}
            </button>
          ))}
        </div>

        <div className="mt-5">
          {tab === "Portfolio" && <PortfolioTab coins={profile.coins} />}
          {tab === "Policy" && <PolicyTab policy={profile.policy} />}
          {tab === "Agent Trades" && <AgentTradeFeed identityId={profile.objectId} />}
          {tab === "Activity" && <ActivityTab activity={activity} />}
        </div>
      </section>
    </div>
  );
}

function Meta({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-[1.25rem] border border-white/10 p-4">
      <p className="text-xs text-[#6f747a]">{label}</p>
      <div className="mt-2 truncate text-sm text-[#e5eef1]">{value}</div>
    </div>
  );
}

function PortfolioTab({ coins }: { coins: CoinHolding[] }) {
  if (coins.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-[#92979d]">
        No coins yet. Fund this iWallet by sending SUI to its object address above.
      </p>
    );
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[520px] text-left text-sm">
        <thead className="text-xs uppercase tracking-[0.14em] text-[#6f747a]">
          <tr>
            <th className="px-3 py-2 font-medium">Coin</th>
            <th className="px-3 py-2 font-medium">Type</th>
            <th className="px-3 py-2 font-medium text-right">Amount</th>
            <th className="px-3 py-2 font-medium text-right">Objects</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/10">
          {coins.map((c) => (
            <tr key={c.coinType} className="text-[#b9c2c6]">
              <td className="px-3 py-3 font-medium text-[#e5eef1]">
                <span className="inline-flex items-center gap-2">
                  <span className="grid h-7 w-7 place-items-center rounded-full bg-[#222328] text-[#298dff]"><HiOutlineCube /></span>
                  {c.symbol}
                </span>
              </td>
              <td className="px-3 py-3"><HashText value={c.coinType} chars={6} /></td>
              <td className="px-3 py-3 text-right font-mono tabular-nums text-[#e5eef1]">{c.amount}</td>
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
        <p className="text-sm text-[#e5eef1]">No agent policy set.</p>
        <p className="mt-1 text-xs text-[#92979d]">
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
      <div className="rounded-[1.6rem] border border-[#298dff]/20 bg-[#298dff]/5 p-5">
        <p className="inline-flex items-center gap-2 text-sm text-[#298dff]">
          <HiOutlineShieldCheck /> Enforced on-chain by AgentPolicy
        </p>
        <p className="mt-1 text-xs text-[#92979d]">
          The agent physically cannot exceed these limits — every withdrawal is checked by the Move contract.
        </p>
      </div>

      <div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-[#92979d]">Budget used</span>
          <span className="font-mono text-[#e5eef1]">
            {policy.amountSpentSui} / {policy.budgetCapSui} SUI
          </span>
        </div>
        <div className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-[#222328]">
          <div className="h-full rounded-full bg-[#298dff]" style={{ width: `${pct}%` }} />
        </div>
        <p className="mt-1.5 text-xs text-[#6f747a]">{remaining} SUI remaining</p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="rounded-[1.25rem] border border-white/10 p-4">
          <p className="inline-flex items-center gap-2 text-xs text-[#6f747a]"><HiOutlineClock /> Expiry</p>
          <p className={`mt-2 text-sm ${expired ? "text-red-300" : "text-[#e5eef1]"}`}>
            {expiryLabel}{expired ? " (expired)" : ""}
          </p>
        </div>
        <div className="rounded-[1.25rem] border border-white/10 p-4">
          <p className="text-xs text-[#6f747a]">Allowed recipients (protocol scope)</p>
          {policy.allowRecipients.length === 0 ? (
            <p className="mt-2 text-sm text-[#92979d]">None</p>
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
    return <p className="py-8 text-center text-sm text-[#92979d]">No on-chain activity yet.</p>;
  }
  return (
    <ul className="flex flex-col divide-y divide-white/10">
      {activity.map((a) => (
        <li key={a.digest} className="flex items-center justify-between gap-4 py-3">
          <div className="flex items-center gap-3">
            <span className={`h-2 w-2 rounded-full ${a.success ? "bg-emerald-300" : "bg-red-300"}`} />
            <a
              href={`https://suiscan.xyz/${SUI_NETWORK}/tx/${a.digest}`}
              target="_blank"
              rel="noreferrer"
              className="font-mono text-xs text-[#298dff] hover:underline"
            >
              {a.digest.slice(0, 10)}…{a.digest.slice(-6)}
            </a>
          </div>
          <span className="text-xs text-[#92979d]">{timeAgo(a.timestampMs)}</span>
        </li>
      ))}
    </ul>
  );
}
