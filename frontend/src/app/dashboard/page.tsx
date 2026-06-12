import { AppShell } from "@/components/app-shell";
import { DashboardReal } from "@/components/dashboard-real";

export default function DashboardPage() {
  return (
    <AppShell eyebrow="Control center" title="iWallet Dashboard" description="Your iWallets, balances, and live agent activity.">
      <DashboardReal />
    </AppShell>
  );
}
