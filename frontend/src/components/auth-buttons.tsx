"use client";

import { useCurrentAccount } from "@mysten/dapp-kit";
import { usePasskeyOwner } from "@/lib/use-passkey-owner";
import { PasskeyButton } from "@/components/passkey-button";
import { WalletConnectButton } from "@/components/wallet-connect-button";

/**
 * Shows only the active sign-in method. Once you're authenticated by EITHER a
 * wallet or a passkey, the other option hides — no more "Sign in with passkey"
 * lingering after you connected a wallet (or vice-versa).
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
        </>
      )}
    </div>
  );
}
