import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { FundIWalletPanel } from "@/components/fund-iwallet-panel";
import { getWallet } from "@/lib/demo-data";

export default async function FundIWalletPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const wallet = getWallet(id);

  return (
    <AppShell
      eyebrow="Fund iWallet"
      title={`Add funds to ${wallet.name}.`}
      description="Add controlled spending capacity."
    >
      <FundIWalletPanel wallet={wallet} />
      <div>
        <Link href={`/iwallets/${wallet.id}`} className="text-sm font-medium text-[#fbff6c] hover:text-[#f7ff8f]">Back to iWallet dashboard</Link>
      </div>
    </AppShell>
  );
}
