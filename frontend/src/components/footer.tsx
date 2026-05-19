import Link from "next/link";
import { AnimatedHoverText } from "@/components/animated-hover-text";
import { HiOutlineDocumentText, HiOutlineShieldCheck, HiOutlineWallet } from "react-icons/hi2";

export function Footer() {
  return (
    <footer className="relative mt-10 border-t border-white/10 px-5 py-8 sm:px-8 lg:px-10">
      <div className="mx-auto flex w-full max-w-7xl flex-col justify-between gap-6 text-sm text-[#92979d] md:flex-row md:items-center">
        <div className="flex items-center gap-3">
          <div className="grid h-9 w-9 place-items-center rounded-2xl border border-white/10 bg-[#222328] text-[#fbff6c]">
            <HiOutlineWallet />
          </div>
          <div>
            <p className="font-semibold text-[#e5eef1]">iWallet</p>
            <p className="mt-1">Secure wallet infrastructure for existing agents.</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link href="/iwallets" data-hover-trigger className="inline-flex items-center gap-2 rounded-full border border-white/10 px-4 py-2 hover:text-[#fbff6c]">
            <HiOutlineWallet /> <AnimatedHoverText>iWallets</AnimatedHoverText>
          </Link>
          <Link href="/iwallets/demo/transactions" data-hover-trigger className="inline-flex items-center gap-2 rounded-full border border-white/10 px-4 py-2 hover:text-[#fbff6c]">
            <HiOutlineDocumentText /> <AnimatedHoverText>Ledger</AnimatedHoverText>
          </Link>
          <Link href="/iwallets/demo/policy" data-hover-trigger className="inline-flex items-center gap-2 rounded-full border border-white/10 px-4 py-2 hover:text-[#fbff6c]">
            <HiOutlineShieldCheck /> <AnimatedHoverText>Policy</AnimatedHoverText>
          </Link>
        </div>
      </div>
    </footer>
  );
}
