import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { HashText } from "@/components/hash-text";
import { TransactionStatusBadge } from "@/components/status-badge";
import { getWallet, getWalletTransactions } from "@/lib/demo-data";
import { HiOutlineArrowLeft, HiOutlineDocumentText } from "react-icons/hi2";

export default async function IWalletTransactionsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const wallet = getWallet(id);
  const transactions = getWalletTransactions(wallet.id);

  return (
    <AppShell eyebrow="Transactions" title="Audit Trail" description="Processed actions and digests.">
      <section className="rounded-[2.4rem] border border-white/10 bg-[#131416] p-5 sm:p-7">
        <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
          <div className="flex items-baseline gap-5">
            <span className="text-2xl font-semibold text-[#e5eef1]">Processed</span>
            <span className="text-2xl text-[#6f747a]">Proofs</span>
            <span className="text-2xl text-[#6f747a]">Walrus</span>
          </div>
          <Link href={`/iwallets/${wallet.id}`} className="inline-flex items-center gap-2 rounded-full bg-[#222328] px-5 py-2.5 text-sm font-semibold text-[#e5eef1] hover:text-[#fbff6c]"><HiOutlineArrowLeft />Back</Link>
        </div>

        <div className="mt-7 flex flex-col">
          {transactions.map((tx) => (
            <div key={tx.id} className="flex flex-col gap-4 border-b border-white/10 py-5 last-of-type:border-none sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="inline-flex items-center gap-2 text-lg font-medium text-[#e5eef1]"><HiOutlineDocumentText className="text-[#fbff6c]" />{tx.type.replace("_", " ")}</p>
                <p className="mt-2 text-sm text-[#92979d]">{tx.target ?? "Wallet operation"}</p>
              </div>
              <div className="text-left sm:text-right">
                <p className="font-mono text-sm text-[#e5eef1]">{tx.amount ? `${tx.amount} ${tx.token}` : tx.timestamp}</p>
                <p className="mt-2">{tx.digest ? <HashText value={tx.digest} chars={7} /> : <span className="text-xs text-[#6f747a]">No digest</span>}</p>
              </div>
              <TransactionStatusBadge status={tx.status} />
            </div>
          ))}
        </div>
      </section>
    </AppShell>
  );
}
