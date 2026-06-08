"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AnimatedHoverText } from "@/components/animated-hover-text";
import { HashText } from "@/components/hash-text";
import { WalletStatusBadge } from "@/components/status-badge";
import type { IWallet } from "@/lib/demo-data";
import { listIdentities } from "@/lib/sui-client";
import { getLocalIdentityIds } from "@/lib/local-identities";
import { HiOutlineBanknotes, HiOutlineEye, HiOutlineLink, HiOutlinePlus, HiOutlineWallet } from "react-icons/hi2";

const tabs = ["Owned", "Fund"] as const;

export function IWalletsTabs() {
  const [active, setActive] = useState<(typeof tabs)[number]>("Owned");
  const [wallets, setWallets] = useState<IWallet[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    listIdentities(getLocalIdentityIds())
      .then((result) => {
        if (!cancelled) setWallets(result);
      })
      .catch(() => {
        if (!cancelled) setWallets([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section className="rounded-[2.4rem] border border-border bg-surface p-5 sm:p-7">
      <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
        <div className="flex items-baseline gap-5">
          {tabs.map((tab) => (
            <button key={tab} onClick={() => setActive(tab)} data-hover-trigger className={`cursor-pointer text-2xl ${active === tab ? "font-semibold text-ink" : "text-dim"}`}>
              <AnimatedHoverText>{tab}</AnimatedHoverText>
            </button>
          ))}
        </div>
        <Link href="/iwallets/create" data-hover-trigger className="inline-flex items-center justify-center gap-2 rounded-full bg-accent px-6 py-3 text-center text-sm font-semibold text-on-accent hover:bg-accent-soft">
          <HiOutlinePlus /> <AnimatedHoverText>Create iWallet</AnimatedHoverText>
        </Link>
      </div>

      <div className="mt-7 flex flex-col">
        {loading && (
          <p className="py-10 text-center text-sm text-muted">Reading iWallets from Sui testnet…</p>
        )}

        {!loading && wallets.length === 0 && (
          <div className="py-10 text-center">
            <p className="text-sm text-ink">No iWallets yet.</p>
            <p className="mt-1 text-xs text-muted">Create one to register an on-chain identity for your agent.</p>
          </div>
        )}

        {!loading && wallets.map((wallet) => (
          <Link key={wallet.id} href={active === "Owned" ? `/iwallets/${wallet.id}` : `/iwallets/${wallet.id}/fund`} className="group flex flex-col gap-4 border-b border-border py-5 last-of-type:border-none sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="grid h-11 w-11 place-items-center rounded-2xl bg-elevated text-xl text-accent"><HiOutlineWallet /></div>
              <div>
                <p className="text-lg font-medium text-ink">{wallet.name}</p>
                <HashText value={wallet.objectId} chars={8} />
              </div>
            </div>
            <div className="flex flex-col gap-3 sm:min-w-[22rem] sm:flex-row sm:items-center sm:justify-between">
              <Cell icon={<HiOutlineBanknotes />} label="Balance" value={`${wallet.balance.tokens[0]?.amount ?? 0} ${wallet.balance.tokens[0]?.symbol ?? "SUI"}`} />
              <Cell icon={<HiOutlineLink />} label="Agent" value={wallet.linkedAgent?.name ?? "Unlinked"} />
            </div>
            <div className="flex items-center justify-between gap-3 sm:justify-end">
              <WalletStatusBadge status={wallet.status} />
              <span data-hover-trigger className="inline-flex items-center gap-2 rounded-full bg-elevated px-4 py-2 text-sm font-medium text-ink group-hover:text-accent">
                {active === "Owned" ? <HiOutlineEye /> : <HiOutlineBanknotes />}
                <AnimatedHoverText>{active === "Owned" ? "View" : "Fund"}</AnimatedHoverText>
              </span>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}

function Cell({ icon, label, value }: { icon?: React.ReactNode; label: string; value: string }) {
  return (
    <div>
      <p className="inline-flex items-center gap-1.5 text-xs text-dim">{icon ? <span className="text-accent">{icon}</span> : null}{label}</p>
      <p className="mt-1 truncate text-sm text-ink">{value}</p>
    </div>
  );
}
