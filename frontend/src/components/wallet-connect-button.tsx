"use client";

import { useState } from "react";
import { ConnectModal, useCurrentAccount, useDisconnectWallet } from "@mysten/dapp-kit";
import { HiOutlineWallet } from "react-icons/hi2";

const buttonClass =
  "inline-flex items-center gap-2 rounded-full border border-border bg-elevated px-4 py-2 text-sm font-medium text-ink transition hover:border-accent/50 hover:text-accent";

function shortAddress(address: string): string {
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

/** Browser-wallet connect via dapp-kit. Lives alongside the passkey button. */
export function WalletConnectButton() {
  const account = useCurrentAccount();
  const { mutate: disconnect } = useDisconnectWallet();
  // Controlled open state — keeps the Radix Dialog from flipping
  // uncontrolled→controlled (the React dev warning).
  const [open, setOpen] = useState(false);

  if (account) {
    return (
      <button onClick={() => disconnect()} className={buttonClass} title="Disconnect wallet">
        <HiOutlineWallet className="text-base" />
        {shortAddress(account.address)}
      </button>
    );
  }

  return (
    <ConnectModal
      open={open}
      onOpenChange={setOpen}
      trigger={
        <button className={buttonClass}>
          <HiOutlineWallet className="text-base" />
          Connect Wallet
        </button>
      }
    />
  );
}
