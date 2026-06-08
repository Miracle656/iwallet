import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { PolicyControlsPanel } from "@/components/policy-controls-panel";
import { getWallet } from "@/lib/demo-data";

export default async function PolicyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const wallet = getWallet(id);

  return (
    <AppShell
      eyebrow="Policy controls"
      title={`Spending rules for ${wallet.name}.`}
      description="Limits, allowed targets, freeze, and revoke."
    >
      <PolicyControlsPanel wallet={wallet} />
      <div>
        <Link href={`/iwallets/${wallet.id}`} className="text-sm font-medium text-accent hover:text-accent-soft">Back to iWallet dashboard</Link>
      </div>
    </AppShell>
  );
}
