"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useCurrentAccount } from "@mysten/dapp-kit";
import { AnimatedHoverText } from "@/components/animated-hover-text";
import { HashText } from "@/components/hash-text";
import { IconChip } from "@/components/icon-chip";
import type { IWallet } from "@/lib/demo-data";
import { listIdentities } from "@/lib/sui-client";
import { getLocalIdentityIds } from "@/lib/local-identities";
import { usePasskeyOwner } from "@/lib/use-passkey-owner";
import { HiOutlineArrowRight, HiOutlineBolt, HiOutlineCheckBadge } from "react-icons/hi2";

/**
 * Hero preview card. Real-when-connected: if a wallet is connected and you have
 * an iWallet, it shows your actual identity + balance. Otherwise it renders a
 * clearly-labelled "Example" so nothing on the landing page looks like live data.
 */
export function HomeHeroCard() {
  const account = useCurrentAccount();
  const passkey = usePasskeyOwner();
  const ownerAddress = account?.address ?? passkey ?? null;
  const [wallet, setWallet] = useState<IWallet | null>(null);

  useEffect(() => {
    listIdentities(getLocalIdentityIds())
      .then((ws) => setWallet(ws[0] ?? null))
      .catch(() => setWallet(null));
  }, []);

  const live = !!ownerAddress && !!wallet;
  const sui = wallet?.balance.tokens.find((t) => t.symbol === "SUI")?.amount ?? 0;
  const name = wallet?.name ?? "Operations iWallet";
  const objectId = wallet?.objectId ?? "0x7f3a2c91b8e4d5f0cafe1138a6b4e92019ad7c33";
  const status = wallet?.status ?? "unfunded";
  const owner = ownerAddress ? `${ownerAddress.slice(0, 6)}…${ownerAddress.slice(-4)}` : "Not connected";
  const identityHash = wallet ? `${wallet.identityHash.slice(0, 8)}…` : "0x…example";
  const viewHref = wallet ? `/iwallets/${wallet.id}` : "/iwallets/create";

  return (
    <div className="w-full rounded-[2.4rem] border border-border bg-surface/95 p-5 sm:p-8">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-baseline gap-3">
          <span className="text-2xl font-semibold">iWallet</span>
          <span className="text-2xl text-dim">Agent</span>
          <span
            className={`rounded-full px-2.5 py-1 text-xs font-medium ${live ? "bg-emerald-300/15 text-emerald-200" : "bg-elevated text-dim"}`}
          >
            {live ? "Live" : "Example"}
          </span>
        </div>
        <Link href="/dashboard" data-hover-trigger className="inline-flex items-center gap-2 rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-on-accent hover:bg-accent-soft">
          <AnimatedHoverText>Launch App</AnimatedHoverText> <HiOutlineArrowRight />
        </Link>
      </div>

      <div className="mt-7 flex flex-col gap-3 lg:flex-row">
        <Panel eyebrow="Owner" title={ownerAddress ? "Connected" : "Connect to preview"} meta={owner}>
          <Selector label="iWallet" value={name} />
          <Selector label="Network" value="Sui Testnet" />
        </Panel>
        <Panel eyebrow="Identity" title={live ? "Verified" : "Example"} meta={identityHash}>
          <Selector label="Status" value={status} />
          <Selector label="Control" value="Agent-driven" />
        </Panel>
      </div>

      <div className="mt-3 rounded-[1.8rem] border border-border p-5">
        <div className="flex items-center justify-between text-sm">
          <span className="text-ink">Balance</span>
          <span className="text-muted">SUI</span>
        </div>
        <div className="mt-8 flex items-end justify-between gap-4">
          <IconChip tone="accent"><HiOutlineBolt /></IconChip>
          <p className="text-right text-5xl font-light tracking-[-0.06em] text-ink sm:text-6xl">{sui}<span className="text-dim">.00</span></p>
        </div>
        <p className="mt-3 text-right text-sm text-muted">Available for delegated agent actions</p>
      </div>

      <div className="mt-7 flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div className="text-sm text-muted">
          <p><span className="text-ink">Object</span> <HashText value={objectId} chars={7} /></p>
          <p className="mt-2">Status <span className="text-ink">{status}</span></p>
        </div>
        <Link href={viewHref} data-hover-trigger className="inline-flex items-center justify-center gap-2 rounded-full bg-accent px-8 py-4 text-center text-sm font-semibold text-on-accent hover:bg-accent-soft">
          <AnimatedHoverText>{wallet ? "View iWallet" : "Create iWallet"}</AnimatedHoverText> <HiOutlineArrowRight />
        </Link>
      </div>
    </div>
  );
}

function Panel({ eyebrow, title, meta, children }: { eyebrow: string; title: string; meta: string; children: React.ReactNode }) {
  return (
    <div className="w-full rounded-[1.8rem] border border-border p-5 lg:flex-1">
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm text-muted">{eyebrow}</span>
        <span className="inline-flex items-center gap-2 rounded-full bg-elevated px-4 py-2 font-mono text-xs text-ink"><HiOutlineCheckBadge className="text-accent" />{meta}</span>
      </div>
      <p className="mt-6 text-lg font-medium text-ink">{title}</p>
      <div className="mt-5 flex flex-col gap-5 sm:flex-row">{children}</div>
    </div>
  );
}

function Selector({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-sm text-dim">{label}</p>
      <p className="mt-3 truncate text-lg text-ink">{value}</p>
    </div>
  );
}
