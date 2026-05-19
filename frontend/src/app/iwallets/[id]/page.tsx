import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { AnimatedHoverText } from "@/components/animated-hover-text";
import { HashText } from "@/components/hash-text";
import { IconChip } from "@/components/icon-chip";
import { TransactionStatusBadge, WalletStatusBadge } from "@/components/status-badge";
import { getWallet, getWalletTransactions } from "@/lib/demo-data";
import { HiOutlineBanknotes, HiOutlineDocumentText, HiOutlineLink, HiOutlineLockClosed, HiOutlineShieldCheck, HiOutlineWallet } from "react-icons/hi2";

export default async function IWalletDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const wallet = getWallet(id);
  const transactions = getWalletTransactions(wallet.id);
  const balance = wallet.balance.tokens[0];

  return (
    <AppShell eyebrow="iWallet" title={wallet.name} description="Balance, linked agent, transactions.">
      <section className="rounded-[2.4rem] border border-white/10 bg-[#131416] p-5 sm:p-7">
        <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
          <div className="flex items-baseline gap-5">
            <span className="text-2xl font-semibold text-[#e5eef1]">Wallet</span>
            <span className="text-2xl text-[#6f747a]">Agent</span>
            <span className="text-2xl text-[#6f747a]">Tx</span>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href={`/iwallets/${wallet.id}/fund`} data-hover-trigger className="inline-flex items-center gap-2 rounded-full bg-[#fbff6c] px-5 py-2.5 text-sm font-semibold text-[#131416] hover:bg-[#f7ff8f]"><HiOutlineBanknotes /> <AnimatedHoverText>Fund</AnimatedHoverText></Link>
            <Link href={`/iwallets/${wallet.id}/transactions`} data-hover-trigger className="inline-flex items-center gap-2 rounded-full bg-[#222328] px-5 py-2.5 text-sm font-semibold text-[#e5eef1] hover:text-[#fbff6c]"><HiOutlineDocumentText /> <AnimatedHoverText>Transactions</AnimatedHoverText></Link>
            <Link href={`/iwallets/${wallet.id}/policy`} data-hover-trigger className="inline-flex items-center gap-2 rounded-full bg-[#222328] px-5 py-2.5 text-sm font-semibold text-[#e5eef1] hover:text-[#fbff6c]"><HiOutlineLockClosed /> <AnimatedHoverText>Policy</AnimatedHoverText></Link>
          </div>
        </div>

        <div className="mt-7 flex flex-col gap-3 lg:flex-row">
          <div className="w-full rounded-[1.9rem] border border-white/10 p-5 lg:flex-1">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-3 text-sm text-[#92979d]"><IconChip><HiOutlineWallet /></IconChip><span>Object ID</span></div>
                <p className="mt-2"><HashText value={wallet.objectId} chars={12} /></p>
              </div>
              <WalletStatusBadge status={wallet.status} />
            </div>
            <div className="mt-10 text-right">
              <p className="inline-flex items-center gap-2 text-sm text-[#92979d]"><HiOutlineBanknotes className="text-[#fbff6c]" />Available</p>
              <p className="mt-2 text-6xl font-light tracking-[-0.06em] text-[#e5eef1]">{balance?.amount ?? 0}<span className="text-[#6f747a]"> {balance?.symbol ?? "SUI"}</span></p>
            </div>
          </div>

          <div className="w-full rounded-[1.9rem] border border-white/10 p-5 lg:flex-1">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-3 text-sm text-[#92979d]"><IconChip><HiOutlineLink /></IconChip><span>Linked agent</span></div>
                <h2 className="mt-2 text-2xl font-medium text-[#e5eef1]">{wallet.linkedAgent?.name ?? "Unlinked"}</h2>
              </div>
              <span className="rounded-full border border-[#fbff6c]/35 bg-[#fbff6c]/10 px-3 py-1.5 text-xs font-medium text-[#fbff6c]">1:1</span>
            </div>
            <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <Info label="Source" value={wallet.linkedAgent?.source ?? "-"} />
              <Info label="Network" value="Sui Testnet" />
              <Info label="Identity" value={<HashText value={wallet.identityHash} chars={7} />} />
              <Info label="Tokens" value={wallet.balance.tokens.length.toString()} />
            </div>
          </div>
        </div>

        <div className="mt-3 rounded-[1.9rem] border border-white/10 p-5">
          <div className="flex items-center justify-between gap-4">
            <h2 className="inline-flex items-center gap-2 text-lg font-medium text-[#e5eef1]"><HiOutlineShieldCheck className="text-[#fbff6c]" />Latest processed</h2>
            <Link href={`/iwallets/${wallet.id}/transactions`} data-hover-trigger className="text-sm font-medium text-[#fbff6c]"><AnimatedHoverText>Open ledger</AnimatedHoverText></Link>
          </div>
          <div className="mt-5 flex flex-col">
            {transactions.slice(0, 3).map((tx) => (
              <div key={tx.id} className="flex flex-col gap-3 border-b border-white/10 py-4 last-of-type:border-none sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-medium text-[#e5eef1]">{tx.type.replace("_", " ")}</p>
                  <p className="mt-1 text-xs text-[#92979d]">{tx.target ?? tx.digest}</p>
                </div>
                <p className="font-mono text-xs text-[#b9c2c6]">{tx.amount ? `${tx.amount} ${tx.token}` : tx.timestamp}</p>
                <TransactionStatusBadge status={tx.status} />
              </div>
            ))}
          </div>
        </div>
      </section>
    </AppShell>
  );
}

function Info({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="min-w-0 rounded-[1.25rem] border border-white/10 p-4 sm:flex-1">
      <p className="text-xs text-[#6f747a]">{label}</p>
      <div className="mt-2 truncate text-sm text-[#e5eef1]">{value}</div>
    </div>
  );
}
