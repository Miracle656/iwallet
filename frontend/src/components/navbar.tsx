import Link from "next/link";
import { AnimatedHoverText } from "@/components/animated-hover-text";
import { WalletConnectButton } from "@/components/wallet-connect-button";
import { HiOutlineWallet } from "react-icons/hi2";

const nav = [
  { href: "/", label: "Home" },
  { href: "/dashboard", label: "Dashboard" },
  { href: "/iwallets", label: "iWallets" },
  { href: "/iwallets/create", label: "Create" },
  { href: "/iwallets/demo/transactions", label: "Ledger" },
];

export function Navbar() {
  return (
    <header className="fixed left-0 top-0 z-50 w-full border-b border-white/10 bg-[#101113]">
      <div className="flex w-full flex-col gap-4 px-5 py-4 sm:px-8 lg:flex-row lg:items-center lg:justify-between lg:px-10">
        <Link href="/" className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-2xl border border-white/10 bg-[#222328] text-lg text-[#fbff6c]">
            <HiOutlineWallet />
          </div>
          <p className="text-base font-semibold text-[#e5eef1]">iWallet</p>
        </Link>
        <div className="flex flex-wrap items-center gap-3">
          <nav className="flex flex-wrap gap-2">
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
          <WalletConnectButton />
        </div>
      </div>
    </header>
  );
}
