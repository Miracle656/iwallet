"use client";

import Link from "next/link";
import { useState } from "react";
import { AnimatedHoverText } from "@/components/animated-hover-text";
import { PasskeyButton } from "@/components/passkey-button";
import { WalletConnectButton } from "@/components/wallet-connect-button";
import { HiOutlineBars3, HiOutlineWallet, HiOutlineXMark } from "react-icons/hi2";

const nav = [
  { href: "/", label: "Home" },
  { href: "/dashboard", label: "Dashboard" },
  { href: "/iwallets", label: "iWallets" },
  { href: "/iwallets/create", label: "Create" },
  { href: "/agents", label: "Agents" },
  { href: "/iwallets/demo/transactions", label: "Ledger" },
];

export function Navbar() {
  const [open, setOpen] = useState(false);

  return (
    <header className="fixed left-0 top-0 z-50 w-full border-b border-white/10 bg-[#101113]">
      <div className="flex w-full items-center justify-between gap-3 px-5 py-4 sm:px-8 lg:px-10">
        <Link href="/" className="flex items-center gap-3" onClick={() => setOpen(false)}>
          <div className="grid h-10 w-10 place-items-center rounded-2xl border border-white/10 bg-[#222328] text-lg text-[#fbff6c]">
            <HiOutlineWallet />
          </div>
          <p className="text-base font-semibold text-[#e5eef1]">iWallet</p>
        </Link>

        {/* desktop: nav links inline */}
        <nav className="hidden flex-wrap gap-2 lg:flex">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              data-hover-trigger
              className="rounded-full px-3 py-2 text-sm font-medium text-[#92979d] transition hover:text-[#e5eef1]"
            >
              <AnimatedHoverText>{item.label}</AnimatedHoverText>
            </Link>
          ))}
        </nav>

        {/* desktop: both auth buttons inline; mobile: only the hamburger */}
        <div className="flex items-center gap-2">
          <div className="hidden items-center gap-2 lg:flex">
            <WalletConnectButton />
            <PasskeyButton />
          </div>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-label={open ? "Close menu" : "Open menu"}
            className="grid h-10 w-10 place-items-center rounded-2xl border border-white/10 bg-[#222328] text-[#e5eef1] transition hover:border-[#fbff6c]/40 hover:text-[#fbff6c] lg:hidden"
          >
            {open ? <HiOutlineXMark /> : <HiOutlineBars3 />}
          </button>
        </div>
      </div>

      {/* mobile drawer */}
      {open && (
        <div className="border-t border-white/10 bg-[#101113] lg:hidden">
          <nav className="flex flex-col px-5 py-3 sm:px-8">
            {nav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className="rounded-xl px-3 py-3 text-sm font-medium text-[#e5eef1] transition hover:bg-[#222328] hover:text-[#fbff6c]"
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="flex flex-col gap-2 border-t border-white/10 px-5 py-4 sm:px-8 sm:flex-row sm:gap-3">
            <WalletConnectButton />
            <PasskeyButton />
          </div>
        </div>
      )}
    </header>
  );
}
