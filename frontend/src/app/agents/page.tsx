import { AppShell } from "@/components/app-shell";
import { AgentTradeFeed } from "@/components/agent-trade-feed";

export default function AgentsPage() {
  return (
    <AppShell
      eyebrow="Live"
      title="Agent trading feed"
      description="Every autonomous DeepBook action across all iWallets — policy-gated withdrawals, real orders, and the rejections when an agent hits its ceiling or gets revoked."
    >
      <section className="rounded-[2.4rem] border border-border bg-surface p-5 sm:p-7">
        <AgentTradeFeed />
      </section>
    </AppShell>
  );
}
