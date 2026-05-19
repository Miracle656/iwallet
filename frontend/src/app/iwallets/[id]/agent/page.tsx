import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { LinkedAgentCard } from "@/components/linked-agent-card";
import { getWallet } from "@/lib/demo-data";

export default async function LinkedAgentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const wallet = getWallet(id);

  return (
    <AppShell
      eyebrow="Linked agent"
      title={`Agent link for ${wallet.name}.`}
      description="External agent metadata attached to this iWallet."
    >
      <LinkedAgentCard wallet={wallet} />
      <div>
        <Link href={`/iwallets/${wallet.id}`} className="text-sm font-medium text-[#fbff6c] hover:text-[#f7ff8f]">Back to iWallet dashboard</Link>
      </div>
    </AppShell>
  );
}
