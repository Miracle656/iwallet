"use client";

import { useEffect, useState } from "react";
import { HiOutlineClipboard, HiOutlineClipboardDocumentCheck } from "react-icons/hi2";
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
          <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-canvas px-4 py-2 text-sm font-medium text-ink">
            <span className="h-2 w-2 rounded-full bg-green-400" />
            {shortAddr(address)}
          </span>
          <button
            onClick={copy}
            title={copied ? "Copied!" : "Copy full address"}
            className="rounded-full border border-border p-2 text-muted hover:border-accent/40 hover:text-accent transition"
          >
            {copied
              ? <HiOutlineClipboardDocumentCheck className="h-4 w-4" />
              : <HiOutlineClipboard className="h-4 w-4" />}
          </button>
          <button
            onClick={signOut}
            className="rounded-full border border-border px-3 py-2 text-xs text-muted hover:border-red-400/40 hover:text-red-400 transition"
          >
            Sign out
          </button>
        </div>
      ) : (
        <ZkLoginButton />
      )}
    </div>
  );
}
