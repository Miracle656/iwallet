"use client";

import { useEffect, useState } from "react";
import {
  clearStoredOwner,
  getStoredOwnerAddress,
  recoverPasskeyOwner,
} from "@/lib/passkey";
import { HiOutlineFingerPrint } from "react-icons/hi2";

const buttonClass =
  "inline-flex items-center gap-2 rounded-full border border-white/10 bg-[#222328] px-4 py-2 text-sm font-medium text-[#e5eef1] transition hover:border-[#fbff6c]/50 hover:text-[#fbff6c] disabled:opacity-50";

function shortAddress(address: string): string {
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

/**
 * Owner auth = passkey (not a browser wallet). The owner is created in the
 * create-iWallet flow; here we just reflect the signed-in owner and offer
 * sign-in (recover) / sign-out.
 */
export function WalletConnectButton() {
  const [owner, setOwner] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setOwner(getStoredOwnerAddress());
  }, []);

  async function signIn() {
    setBusy(true);
    try {
      const { address } = await recoverPasskeyOwner();
      setOwner(address);
    } catch {
      // No existing passkey for this site (or cancelled) — owner is created in
      // the create-iWallet flow.
    } finally {
      setBusy(false);
    }
  }

  function signOut() {
    clearStoredOwner();
    setOwner(null);
  }

  if (owner) {
    return (
      <button onClick={signOut} className={buttonClass} title="Sign out of passkey">
        <HiOutlineFingerPrint className="text-base text-[#fbff6c]" />
        {shortAddress(owner)}
      </button>
    );
  }

  return (
    <button onClick={signIn} disabled={busy} className={buttonClass}>
      <HiOutlineFingerPrint className="text-base" />
      {busy ? "Passkey…" : "Sign in with passkey"}
    </button>
  );
}
