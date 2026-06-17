/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import { useEffect, useState } from "react";
import {
  HiOutlineClipboard,
  HiOutlineClipboardDocumentCheck,
} from "react-icons/hi2";
import { ZkLoginButton } from "@/components/zklogin-button";
import { clearZkLoginSession } from "@/lib/zklogin";

function shortAddr(addr: string) {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

export function AuthButtons({ className = "" }: { className?: string }) {
  const [address, setAddress] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("zklogin_address");
    if (stored) setAddress(stored);

    const onStorage = (e: StorageEvent) => {
      if (e.key === "zklogin_address") setAddress(e.newValue);
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const copy = async () => {
    if (!address) return;
    await navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const signOut = () => {
    clearZkLoginSession();
    setAddress(null);
  };

  return (
    <div className={className}>
      {address ? (
        <div className="flex items-center gap-2">
          <span className="border-border bg-canvas text-ink inline-flex items-center gap-1.5 rounded-full border px-4 py-2 text-sm font-medium">
            <span className="h-2 w-2 rounded-full bg-green-400" />
            {shortAddr(address)}
          </span>
          <button
            onClick={copy}
            title={copied ? "Copied!" : "Copy full address"}
            className="border-border text-muted hover:border-accent/40 hover:text-accent rounded-full border p-2 transition"
          >
            {copied ? (
              <HiOutlineClipboardDocumentCheck className="h-4 w-4" />
            ) : (
              <HiOutlineClipboard className="h-4 w-4" />
            )}
          </button>
          <button
            onClick={signOut}
            className="border-border text-muted rounded-full border px-3 py-2 text-xs transition hover:border-red-400/40 hover:text-red-400"
          >
            Sign out
          </button>
        </div>
      ) : (
        <ZkLoginButton />
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
