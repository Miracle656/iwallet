"use client";

import { useEffect, useState } from "react";
import { useCurrentAccount } from "@mysten/dapp-kit";
import { getStoredOwnerAddress } from "@/lib/passkey";
import { PasskeyButton } from "@/components/passkey-button";
import { WalletConnectButton } from "@/components/wallet-connect-button";

/**
 * Shows only the active sign-in method. Once you're authenticated by EITHER a
 * wallet or a passkey, the other option hides — no more "Sign in with passkey"
 * lingering after you connected a wallet.
 */
export function AuthButtons({ className = "" }: { className?: string }) {
  const account = useCurrentAccount();
  const [passkey, setPasskey] = useState<string | null>(null);

  useEffect(() => {
    setPasskey(getStoredOwnerAddress());
  }, []);

  return (
    <div className={className}>
      {account ? (
        <WalletConnectButton />
      ) : passkey ? (
        <PasskeyButton onOwnerChange={setPasskey} />
      ) : (
        <>
          <WalletConnectButton />
          <PasskeyButton onOwnerChange={setPasskey} />
        </>
      )}
    </div>
  );
}
