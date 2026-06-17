"use client";

import { useCurrentAccount } from "@mysten/dapp-kit";
import { usePasskeyOwner } from "@/lib/use-passkey-owner";
import { PasskeyButton } from "@/components/passkey-button";
import { WalletConnectButton } from "@/components/wallet-connect-button";
import { ZkLoginButton } from "@/components/zklogin-button";

/**
 * Shows only the active sign-in method. Once authenticated (wallet, passkey,
 * or zkLogin/Google), the other options hide.
 */
export function AuthButtons({ className = "" }: { className?: string }) {
  const account = useCurrentAccount();
  const passkey = usePasskeyOwner();

  return (
    <div className={className}>
      {account ? (
        <WalletConnectButton />
      ) : passkey ? (
        <PasskeyButton />
      ) : (
        <>
          <WalletConnectButton />
          <PasskeyButton />
          <ZkLoginButton />
        </>
      )}
    </div>
  );
}
