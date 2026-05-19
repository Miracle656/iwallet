import { HashText } from "@/components/hash-text";
import { TransactionStatusBadge } from "@/components/status-badge";
import type { ProcessedTransaction } from "@/lib/demo-data";

export function ProcessedTransactionsTable({ transactions, compact = false }: { transactions: ProcessedTransaction[]; compact?: boolean }) {
  return (
    <div className="overflow-hidden rounded-[1.6rem] border border-white/10 bg-[#131416]">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="border-b border-white/10 text-xs uppercase tracking-[0.14em] text-[#92979d]">
            <tr>
              <th className="px-4 py-3 font-medium">Type</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Amount</th>
              <th className="px-4 py-3 font-medium">Target</th>
              <th className="px-4 py-3 font-medium">Proof</th>
              {!compact ? <th className="px-4 py-3 font-medium">Walrus</th> : null}
              <th className="px-4 py-3 font-medium">Digest</th>
              <th className="px-4 py-3 font-medium">Time</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/10">
            {transactions.map((transaction) => (
              <tr key={transaction.id} className="text-[#b9c2c6] transition hover:bg-[#222328]/40">
                <td className="px-4 py-4 font-medium text-[#e5eef1]">{transaction.type.replace("_", " ")}</td>
                <td className="px-4 py-4"><TransactionStatusBadge status={transaction.status} /></td>
                <td className="px-4 py-4 font-mono text-xs">{transaction.amount ? `${transaction.amount} ${transaction.token}` : "-"}</td>
                <td className="px-4 py-4">{transaction.target ?? "-"}</td>
                <td className="px-4 py-4 capitalize">{transaction.proofStatus ?? "none"}</td>
                {!compact ? <td className="px-4 py-4 capitalize">{transaction.walrusStatus ?? "none"}</td> : null}
                <td className="px-4 py-4">{transaction.digest ? <HashText value={transaction.digest} chars={6} /> : <span className="text-[#666b70]">-</span>}</td>
                <td className="px-4 py-4 text-[#92979d]">{transaction.timestamp}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
