import Link from "next/link";
import { HashText } from "@/components/hash-text";
import { WalletStatusBadge } from "@/components/status-badge";
import type { IWallet } from "@/lib/demo-data";

export function IWalletTable({ wallets }: { wallets: IWallet[] }) {
  return (
    <div className="overflow-hidden rounded-[1.6rem] border border-white/10 bg-[#131416]">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[860px] text-left text-sm">
          <thead className="border-b border-white/10 text-xs uppercase tracking-[0.14em] text-[#92979d]">
            <tr>
              <th className="px-4 py-3 font-medium">iWallet</th>
              <th className="px-4 py-3 font-medium">Object ID</th>
              <th className="px-4 py-3 font-medium">Linked Agent</th>
              <th className="px-4 py-3 font-medium">Balance</th>
              <th className="px-4 py-3 font-medium">Tokens</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Last Tx</th>
              <th className="px-4 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/10">
            {wallets.map((wallet) => (
              <tr key={wallet.id} className="text-[#b9c2c6] transition hover:bg-[#222328]/40">
                <td className="px-4 py-4 font-medium text-[#e5eef1]">{wallet.name}</td>
                <td className="px-4 py-4"><HashText value={wallet.objectId} chars={7} /></td>
                <td className="px-4 py-4">{wallet.linkedAgent?.name ?? "Unlinked"}</td>
                <td className="px-4 py-4 font-mono text-xs">{wallet.balance.tokens[0]?.amount ?? 0} {wallet.balance.tokens[0]?.symbol ?? "SUI"}</td>
                <td className="px-4 py-4">{wallet.balance.tokens.length}</td>
                <td className="px-4 py-4"><WalletStatusBadge status={wallet.status} /></td>
                <td className="px-4 py-4 text-[#92979d]">{wallet.lastTransactionAt ?? "No transactions"}</td>
                <td className="px-4 py-4">
                  <div className="flex gap-2">
                    <Link href={`/iwallets/${wallet.id}`} className="rounded-full border border-white/10 bg-[#222328] px-3 py-1.5 text-xs font-medium text-[#e5eef1] hover:border-[#298dff]/50">View</Link>
                    <Link href={`/iwallets/${wallet.id}/fund`} className="rounded-full bg-[#298dff] px-3 py-1.5 text-xs font-semibold text-[#131416] hover:bg-[#5aa9ff]">Fund</Link>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
