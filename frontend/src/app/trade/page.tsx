import { AppShell } from "@/components/app-shell";
import { DeepBookTerminal } from "@/components/deepbook/deepbook-terminal";

export default function TradePage() {
  return (
    <AppShell
      eyebrow="DeepBook"
      title="Trading terminal"
      description="Live order book + chart on DeepBook v3. Trade by hand from your BalanceManager, and watch the autonomous agents work the same pool below."
    >
      <DeepBookTerminal />
    </AppShell>
  );
}
