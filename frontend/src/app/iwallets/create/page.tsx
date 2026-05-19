import { AppShell } from "@/components/app-shell";
import { CreateIWalletFlow } from "@/components/create-iwallet-flow";

export default function CreateIWalletPage() {
  return (
    <AppShell eyebrow="Create" title="Create iWallet" description="A wallet for an existing agent.">
      <CreateIWalletFlow />
    </AppShell>
  );
}
