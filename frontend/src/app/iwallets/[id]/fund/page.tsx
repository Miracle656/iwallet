import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { FundIWalletPanel } from "@/components/fund-iwallet-panel";

export default async function FundIWalletPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  return (
    <AppShell
      eyebrow="Fund iWallet"
      title="Add funds"
      description="Top up your iWallet's spending capacity — a normal SUI transfer, no CLI."
    >
      <FundIWalletPanel id={id} />
      <div>
        <Link href={`/iwallets/${id}`} className="text-sm font-medium text-accent hover:text-accent-soft">Back to iWallet</Link>
      </div>
    </AppShell>
  );
}
