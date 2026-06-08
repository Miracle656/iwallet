import type { IWalletStatus, ProcessedTransaction } from "@/lib/demo-data";

const walletTone: Record<IWalletStatus, string> = {
  active: "border-[#298dff]/35 bg-[#298dff]/10 text-[#298dff]",
  unfunded: "border-orange-300/30 bg-orange-300/10 text-orange-200",
  frozen: "border-red-300/30 bg-red-300/10 text-red-200",
  unlinked: "border-white/10 bg-[#222328] text-[#b9c2c6]",
};

const transactionTone: Record<ProcessedTransaction["status"], string> = {
  pending: "border-orange-300/30 bg-orange-300/10 text-orange-200",
  processed: "border-[#298dff]/35 bg-[#298dff]/10 text-[#298dff]",
  verified: "border-emerald-300/30 bg-emerald-300/10 text-emerald-200",
  failed: "border-red-300/30 bg-red-300/10 text-red-200",
};

function label(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1).replace("_", " ");
}

export function WalletStatusBadge({ status }: { status: IWalletStatus }) {
  return <span className={`rounded-full border px-3 py-1.5 text-xs font-medium ${walletTone[status]}`}>{label(status)}</span>;
}

export function TransactionStatusBadge({ status }: { status: ProcessedTransaction["status"] }) {
  return <span className={`rounded-full border px-3 py-1.5 text-xs font-medium ${transactionTone[status]}`}>{label(status)}</span>;
}
