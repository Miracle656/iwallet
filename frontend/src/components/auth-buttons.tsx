/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import {
  useCurrentAccount,
  // useConnectWallet,
  // useDisconnectWallet,
  // useWallets,
} from "@mysten/dapp-kit";
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
  // const wallets = useWallets();
  // const { mutate: connect } = useConnectWallet();
  // const { mutate: disconnect } = useDisconnectWallet();
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

  // useEffect(() => {
  //   // Check if connected wallet is Enoki (zkLogin)
  //   if (
  //     account?.label?.includes("Enoki") ||
  //     account?.address?.startsWith("0x")
  //   ) {
  //     setIsEnoki(true);
  //   }
  // }, [account]);

  // const handleLogin = () => {
  //   // This triggers the wallet-standard connect flow
  //   // Enoki wallet will show as an option, clicking it opens Google OAuth popup
  //   if (enokiWallet) {
  //     // Connect directly to Enoki wallet
  //     connect({ wallet: enokiWallet });
  //   } else {
  //     // Fallback: open wallet picker (dapp-kit handles this)
  //     // Or show a modal with wallet options
  //     console.error(
  //       "Enoki wallet not found. Make sure providers.tsx is set up correctly.",
  //     );
  //   }
  // };

  // const handleLogout = () => {
  //   disconnect();
  // };

  // if (account) {
  //   return (
  //     <div className="flex items-center gap-3">
  //       <span className="text-muted-foreground font-mono text-sm">
  //         {account.address.slice(0, 6)}...{account.address.slice(-4)}
  //       </span>
  //       {isEnoki && (
  //         <span className="rounded bg-blue-100 px-2 py-0.5 text-xs text-blue-800">
  //           zkLogin
  //         </span>
  //       )}
  //       <button
  //         onClick={handleLogout}
  //         className="bg-destructive text-destructive-foreground rounded-md px-4 py-2 text-sm"
  //       >
  //         Disconnect
  //       </button>
  //     </div>
  //   );
  // }

  // return (
  //   <button
  //     onClick={handleLogin}
  //     disabled={!enokiWallet}
  //     className="bg-primary text-primary-foreground rounded-md px-4 py-2 text-sm disabled:opacity-50"
  //   >
  //     Sign in with Google
  //   </button>
  // );
}
