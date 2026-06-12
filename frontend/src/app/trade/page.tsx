import { AppShell } from "@/components/app-shell";
import { DeepBookTerminal } from "@/components/deepbook/deepbook-terminal";

export default function TradePage() {
  return (
    <AppShell
      eyebrow="DeepBook"
      title="Agent terminal"
      description="Live order book + chart on DeepBook v3. No buttons — your dedicated agent trades the pool within its on-chain policy, and you watch it work here."
    >
      <DeepBookTerminal />
    </AppShell>
  );
}
