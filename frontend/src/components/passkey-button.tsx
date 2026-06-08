"use client";

import { useEffect, useState } from "react";
import {
  clearStoredOwner,
  getStoredOwnerAddress,
  recoverPasskeyOwner,
} from "@/lib/passkey";
import { HiOutlineFingerPrint } from "react-icons/hi2";

const buttonClass =
  "inline-flex items-center gap-2 rounded-full border border-border bg-elevated px-4 py-2 text-sm font-medium text-ink transition hover:border-accent/50 hover:text-accent disabled:opacity-50";

function shortAddress(address: string): string {
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

/** Passkey-based owner sign-in (independent of the dapp-kit wallet connect). */
export function PasskeyButton() {
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
      // No existing passkey for this domain or cancelled — created via /iwallets/create.
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
        <HiOutlineFingerPrint className="text-base text-accent" />
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
