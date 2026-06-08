"use client";

import Link from "next/link";
import { useState } from "react";
import { AnimatedHoverText } from "@/components/animated-hover-text";
import { HashText } from "@/components/hash-text";
import { IconChip } from "@/components/icon-chip";
import { TransactionStatusBadge, WalletStatusBadge } from "@/components/status-badge";
import { iwallets, processedTransactions } from "@/lib/demo-data";
import { HiOutlineBanknotes, HiOutlineDocumentText, HiOutlineLink, HiOutlinePlus, HiOutlineWallet } from "react-icons/hi2";

const tabs = ["Overview", "Wallets", "Ledger"] as const;

export function DashboardTabs() {
  const [active, setActive] = useState<(typeof tabs)[number]>("Overview");
  const primary = iwallets[0];
  const totalBalance = iwallets.reduce((sum, wallet) => sum + (wallet.balance.tokens[0]?.amount ?? 0), 0);
  const linkedAgents = iwallets.filter((wallet) => wallet.linkedAgent?.status === "linked").length;

  return (
    <section>
      <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
        <div className="flex items-baseline gap-5">
          {tabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setActive(tab)}
              data-hover-trigger
              className={`cursor-pointer text-2xl ${active === tab ? "font-semibold text-ink" : "text-dim"}`}
            >
              <AnimatedHoverText>{tab}</AnimatedHoverText>
            </button>
          ))}
        </div>
        <Link href="/iwallets/create" data-hover-trigger className="inline-flex items-center justify-center gap-2 rounded-full bg-accent px-6 py-3 text-center text-sm font-semibold text-on-accent hover:bg-accent-soft">
          <HiOutlinePlus /> <AnimatedHoverText>Create iWallet</AnimatedHoverText>
        </Link>
      </div>

      {active === "Overview" ? <Overview primary={primary} totalBalance={totalBalance} linkedAgents={linkedAgents} /> : null}
      {active === "Wallets" ? <WalletsPanel /> : null}
      {active === "Ledger" ? <LedgerPanel /> : null}
    </section>
  );
}

function Overview({ primary, totalBalance, linkedAgents }: { primary: typeof iwallets[number]; totalBalance: number; linkedAgents: number }) {
  return (
    <>
      <div className="mt-7 flex flex-col gap-3 lg:flex-row">
        <Metric icon={<HiOutlineWallet />} label="iWallets" value={iwallets.length.toString()} />
        <Metric icon={<HiOutlineBanknotes />} label="Balance" value={`${totalBalance} SUI`} />
        <Metric icon={<HiOutlineLink />} label="Agents" value={linkedAgents.toString()} />
        <Metric icon={<HiOutlineDocumentText />} label="Processed" value={processedTransactions.length.toString()} />
      </div>

      <div className="mt-3 flex flex-col items-start gap-3 lg:flex-row">
        <div className="w-full rounded-[1.9rem] border border-border bg-surface p-5 lg:flex-[1.05]">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 text-sm text-muted"><IconChip><HiOutlineWallet /></IconChip><span>Primary iWallet</span></div>
              <h2 className="mt-2 text-2xl font-medium text-ink">{primary.name}</h2>
            </div>
            <WalletStatusBadge status={primary.status} />
          </div>
          <div className="mt-6 text-right">
            <p className="text-sm text-muted">Available balance</p>
            <p className="mt-2 text-6xl font-light tracking-[-0.06em] text-ink">{primary.balance.tokens[0]?.amount}<span className="text-dim"> SUI</span></p>
          </div>
          <div className="mt-5 flex flex-col gap-3 sm:flex-row">
            <Mini label="Agent" value={primary.linkedAgent?.name ?? "Unlinked"} />
            <Mini label="Object" value={<HashText value={primary.objectId} chars={7} />} />
          </div>
        </div>

        <div className="w-full rounded-[1.9rem] border border-border bg-surface p-8 lg:flex-[0.95]">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-medium text-ink">Latest processed</h2>
            <button data-hover-trigger className="text-sm font-medium text-accent"><AnimatedHoverText>Open</AnimatedHoverText></button>
          </div>
          <TransactionRows limit={4} />
        </div>
      </div>
    </>
  );
}

function WalletsPanel() {
  return (
    <div className="mt-7 rounded-[2.4rem] border border-border bg-surface p-5 sm:p-7">
      <div className="flex flex-col">
        {iwallets.map((wallet) => (
          <Link key={wallet.id} href={`/iwallets/${wallet.id}`} className="group flex flex-col gap-4 border-b border-border py-5 last-of-type:border-none sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="grid h-11 w-11 place-items-center rounded-2xl bg-elevated text-xl text-accent"><HiOutlineWallet /></div>
              <div>
                <p className="text-lg font-medium text-ink">{wallet.name}</p>
                <HashText value={wallet.objectId} chars={8} />
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-4">
              <span className="text-sm text-muted">{wallet.balance.tokens[0]?.amount ?? 0} {wallet.balance.tokens[0]?.symbol ?? "SUI"}</span>
              <WalletStatusBadge status={wallet.status} />
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

function LedgerPanel() {
  return (
    <div className="mt-7 rounded-[2.4rem] border border-border bg-surface p-5 sm:p-7">
      <TransactionRows />
    </div>
  );
}

function TransactionRows({ limit }: { limit?: number }) {
  return (
    <div className="mt-5 flex flex-col">
      {processedTransactions.slice(0, limit).map((tx) => (
        <div key={tx.id} className="flex items-center justify-between gap-4 border-b border-border py-3 last-of-type:border-none">
          <div>
            <p className="text-sm font-medium text-ink">{tx.type.replace("_", " ")}</p>
            <p className="mt-1 text-xs text-muted">{tx.amount ? `${tx.amount} ${tx.token}` : tx.target}</p>
          </div>
          <TransactionStatusBadge status={tx.status} />
        </div>
      ))}
    </div>
  );
}

function Metric({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="w-full rounded-[1.4rem] border border-border bg-surface p-4 lg:flex-1">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted">{label}</p>
        <span className="text-lg text-accent">{icon}</span>
      </div>
      <p className="mt-4 text-3xl font-light tracking-[-0.04em] text-ink">{value}</p>
    </div>
  );
}

function Mini({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="w-full rounded-[1.25rem] border border-border p-4 sm:flex-1">
      <p className="text-sm text-muted">{label}</p>
      <div className="mt-2 truncate text-sm font-medium text-ink">{value}</div>
    </div>
  );
}
