import { AppShell } from "@/components/app-shell";
import { DashboardTabs } from "@/components/dashboard-tabs";

export default function DashboardPage() {
  return (
    <AppShell eyebrow="Control center" title="iWallet Dashboard" description="Wallets, balances, agents, transactions.">
      <DashboardTabs />
    </AppShell>
  );
}
