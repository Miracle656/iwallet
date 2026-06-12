"use client";

import { useEffect, useState } from "react";
import { PASSKEY_CHANGE_EVENT, getStoredOwnerAddress } from "@/lib/passkey";

/** Reactive passkey-owner address — updates app-wide when sign-in/out happens. */
export function usePasskeyOwner(): string | null {
  const [owner, setOwner] = useState<string | null>(null);

  useEffect(() => {
    const sync = () => setOwner(getStoredOwnerAddress());
    sync();
    window.addEventListener(PASSKEY_CHANGE_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(PASSKEY_CHANGE_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  return owner;
}
