import { AppShell } from "@/components/app-shell";
import { IWalletsTabs } from "@/components/iwallets-tabs";

export default function IWalletsPage() {
  return (
    <AppShell eyebrow="Owned iWallets" title="iWallets" description="Wallets created for existing agents.">
      <IWalletsTabs />
    </AppShell>
  );
}
