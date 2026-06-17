/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import { useCurrentAccount, useConnectWallet, useDisconnectWallet, useWallets } from "@mysten/dapp-kit";
import { usePasskeyOwner } from "@/lib/use-passkey-owner";
import { PasskeyButton } from "@/components/passkey-button";
import { WalletConnectButton } from "@/components/wallet-connect-button";
import { useEffect, useState } from 'react';


/**
 * Shows only the active sign-in method. Once you're authenticated by EITHER a
 * wallet or a passkey, the other option hides — no more "Sign in with passkey"
 * lingering after you connected a wallet (or vice-versa).
 */
export function AuthButtons({ className = "" }: { className?: string }) {
  const account = useCurrentAccount();
  const wallets = useWallets()
  const { mutate: connect } = useConnectWallet();
  const { mutate: disconnect } = useDisconnectWallet();
  const [isEnoki, setIsEnoki] = useState(false);
  const passkey = usePasskeyOwner();

  // Find the Enoki wallet from available wallets
  const enokiWallet = wallets.find((w) => 
    w.name.toLowerCase().includes('enoki') || 
    w.name.toLowerCase().includes('google') ||
    w.name.toLowerCase().includes('zklogin')
  );

  useEffect(() => {
    // Check if connected wallet is Enoki (zkLogin)
    if (account?.label?.includes('Enoki') || account?.address?.startsWith('0x')) {
      setIsEnoki(true);
    }
  }, [account]);

  const handleLogin = () => {
    // This triggers the wallet-standard connect flow
    // Enoki wallet will show as an option, clicking it opens Google OAuth popup
    if (enokiWallet) {
      // Connect directly to Enoki wallet
      connect({ wallet: enokiWallet });
    } else {
      // Fallback: open wallet picker (dapp-kit handles this)
      // Or show a modal with wallet options
      console.error('Enoki wallet not found. Make sure providers.tsx is set up correctly.');
    }
  };

  const handleLogout = () => {
    disconnect();
  };


    if (account) {
    return (
      <div className="flex items-center gap-3">
        <span className="text-sm font-mono text-muted-foreground">
          {account.address.slice(0, 6)}...{account.address.slice(-4)}
        </span>
        {isEnoki && (
          <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded">
            zkLogin
          </span>
        )}
        <button 
          onClick={handleLogout}
          className="px-4 py-2 text-sm bg-destructive text-destructive-foreground rounded-md"
        >
          Disconnect
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={handleLogin}
      disabled={!enokiWallet}
      className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-md disabled:opacity-50"
    >
      Sign in with Google
    </button>
  );
}