"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useCurrentAccount } from "@mysten/dapp-kit";
import { HashText } from "@/components/hash-text";
import { WalletStatusBadge } from "@/components/status-badge";
import { AgentTradeFeed } from "@/components/agent-trade-feed";
import type { IWallet } from "@/lib/demo-data";
import { discoverOwnedIdentities, getIdentity, listIdentities } from "@/lib/sui-client";
import { usePasskeyOwner } from "@/lib/use-passkey-owner";
import { getZkLoginAddress } from "@/lib/zklogin";
import {
  addLocalIdentityId,
  getLocalIdentityIds,
  removeLocalIdentityId,
} from "@/lib/local-identities";
import { RestoreFromFile } from "@/components/restore-from-file";
import {
  HiOutlineArrowRight,
  HiOutlineBanknotes,
  HiOutlineCpuChip,
  HiOutlinePlus,
  HiOutlineTrash,
  HiOutlineWallet,
} from "react-icons/hi2";

/**
 * Real dashboard: the iWallets this browser has created or imported, read live
 * from Sui — no mock data. "Owned" is tracked locally (the contract has no
 * IdentityCreated{owner} event yet — see the note raised with George), so use
 * the import field to add an iWallet provisioned via the CLI.
 */
export function DashboardReal() {
  const account = useCurrentAccount();
  const passkey = usePasskeyOwner();
  const [zkAddress, setZkAddress] = useState<string | null>(null);
  useEffect(() => { setZkAddress(getZkLoginAddress()); }, []);
  const ownerAddress = (account?.address ?? passkey ?? zkAddress ?? null)?.toLowerCase() ?? null;
  const [allWallets, setAllWallets] = useState<IWallet[]>([]);
  const [loading, setLoading] = useState(true);
  const [importId, setImportId] = useState("");
  const [err, setErr] = useState<string | null>(null);

  // Show only iWallets owned by the connected owner. Until you connect, show
  // everything this browser tracks (so import still works).
  const wallets = ownerAddress
    ? allWallets.filter((w) => w.owner?.toLowerCase() === ownerAddress)
    : allWallets;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      // Recover wallets from chain (survives a cleared cache), then persist.
      if (ownerAddress) {
        const discovered = await discoverOwnedIdentities(ownerAddress);
        discovered.forEach(addLocalIdentityId);
      }
      setAllWallets(await listIdentities(getLocalIdentityIds()));
    } catch {
      setAllWallets([]);
    } finally {
      setLoading(false);
    }
  }, [ownerAddress]);

  useEffect(() => {
    load();
  }, [load]);

  async function onImport() {
    const id = importId.trim();
    if (!/^0x[0-9a-fA-F]{6,}$/.test(id)) {
      setErr("Enter a valid 0x iWallet object id");
      return;
    }
    const w = await getIdentity(id);
    if (!w) {
      setErr("No iWallet found at that id");
      return;
    }
    if (ownerAddress && w.owner && w.owner.toLowerCase() !== ownerAddress) {
      setErr(`That iWallet is owned by ${w.owner.slice(0, 6)}…${w.owner.slice(-4)} — connect that wallet to add it`);
      return;
    }
    setErr(null);
    addLocalIdentityId(id);
    setImportId("");
    load();
  }

  function onRemove(id: string) {
    removeLocalIdentityId(id);
    load();
  }

  const suiOf = (w: IWallet) =>
    w.balance.tokens.find((t) => t.symbol === "SUI")?.amount ?? 0;
  const totalSui = wallets.reduce((sum, w) => sum + suiOf(w), 0);
  const funded = wallets.filter((w) => suiOf(w) > 0).length;

  return (
    <div className="flex flex-col gap-3">
      {/* stats */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="iWallets" value={String(wallets.length)} icon={<HiOutlineWallet />} />
        <Stat label="Total balance" value={`${totalSui} SUI`} icon={<HiOutlineBanknotes />} />
        <Stat label="Funded" value={String(funded)} icon={<HiOutlineCpuChip />} />
        <Stat
          label="Owner"
          value={ownerAddress ? `${ownerAddress.slice(0, 6)}…${ownerAddress.slice(-4)}` : "Not connected"}
          icon={<HiOutlineWallet />}
        />
      </div>

      {/* wallets */}
      <section className="rounded-[2.4rem] border border-border bg-surface p-5 sm:p-7">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <h2 className="text-xl font-semibold text-ink">Your iWallets</h2>
          <Link
            href="/iwallets/create"
            className="inline-flex items-center justify-center gap-2 rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-on-accent hover:bg-accent-soft"
          >
            <HiOutlinePlus /> Create iWallet
          </Link>
        </div>

        <div className="mt-5">
          {loading ? (
            <p className="py-8 text-center text-sm text-muted">Reading iWallets from Sui testnet…</p>
          ) : wallets.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted">
              {ownerAddress
                ? "No iWallets owned by the connected address. Create one, or import an existing id below."
                : "No iWallets tracked in this browser yet. Create one, or import an existing id below."}
            </p>
          ) : (
            <ul className="flex flex-col">
              {wallets.map((w) => (
                <li key={w.id} className="flex flex-col gap-3 border-b border-border py-4 last-of-type:border-none sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-3">
                    <div className="grid h-11 w-11 place-items-center rounded-2xl bg-elevated text-xl text-accent">
                      <HiOutlineWallet />
                    </div>
                    <div>
                      <p className="font-medium text-ink">{w.name}</p>
                      <HashText value={w.objectId} chars={8} />
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-sm text-ink">{suiOf(w)} SUI</span>
                    <WalletStatusBadge status={w.status} />
                    <Link href={`/iwallets/${w.id}`} className="inline-flex items-center gap-1 rounded-full bg-elevated px-4 py-2 text-sm font-medium text-ink hover:text-accent">
                      View <HiOutlineArrowRight />
                    </Link>
                    <button onClick={() => onRemove(w.id)} aria-label="Remove from this browser" className="text-dim hover:text-red-300">
                      <HiOutlineTrash />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}

          {/* import-by-id */}
          <div className="mt-5 border-t border-border pt-4">
            <p className="text-xs text-dim">Import an existing iWallet (e.g. one provisioned via the agent CLI)</p>
            <div className="mt-2 flex gap-2">
              <input
                value={importId}
                onChange={(e) => setImportId(e.target.value)}
                placeholder="0x… iWallet object id"
                className="w-full rounded-lg border border-border bg-canvas px-3 py-2 font-mono text-xs text-ink outline-none focus:border-accent/40"
              />
              <button onClick={onImport} className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-ink hover:border-accent/40">
                Import
              </button>
            </div>
            {err && <p className="mt-2 text-xs text-red-300">{err}</p>}
            <div className="mt-4">
              <RestoreFromFile onRestored={load} />
            </div>
          </div>
        </div>
      </section>

      {/* live agent activity — scoped to YOUR iWallets only */}
      <section className="rounded-[2.4rem] border border-border bg-surface p-5 sm:p-7">
        <h2 className="mb-4 text-xl font-semibold text-ink">Your agent activity</h2>
        <AgentTradeFeed limit={20} identityIds={wallets.map((w) => w.objectId)} />
      </section>
    </div>
  );
}

function Stat({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <div className="rounded-[1.6rem] border border-border bg-surface p-5">
      <p className="inline-flex items-center gap-2 text-xs text-dim">
        <span className="text-accent">{icon}</span>
        {label}
      </p>
      <p className="mt-2 text-2xl font-light tracking-[-0.02em] text-ink">{value}</p>
    </div>
  );
}
