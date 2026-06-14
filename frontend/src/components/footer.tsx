import Link from "next/link";
import { AnimatedHoverText } from "@/components/animated-hover-text";
import {
  HiOutlineDocumentText,
  HiOutlineShieldCheck,
  HiOutlineWallet,
} from "react-icons/hi2";

export function Footer() {
  return (
    <footer className="border-border relative mt-10 border-t px-5 py-8 sm:px-8 lg:px-10">
      <div className="text-muted mx-auto flex w-full max-w-7xl flex-col justify-between gap-6 text-sm md:flex-row md:items-center">
        <div className="flex items-center gap-3">
          <div className="border-border bg-elevated text-accent grid h-9 w-9 place-items-center rounded-2xl border">
            <HiOutlineWallet />
          </div>
          <div>
            <p className="text-ink font-semibold">iWallet</p>
            <p className="mt-1">
              Secure wallet infrastructure for existing agents.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/iwallets"
            data-hover-trigger
            className="border-border hover:text-accent inline-flex items-center gap-2 rounded-full border px-4 py-2"
          >
            <HiOutlineWallet /> <AnimatedHoverText>iWallets</AnimatedHoverText>
          </Link>
          <Link
            href="/iwallets/demo/transactions"
            data-hover-trigger
            className="border-border hover:text-accent inline-flex items-center gap-2 rounded-full border px-4 py-2"
          >
            <HiOutlineDocumentText />{" "}
            <AnimatedHoverText>Ledger</AnimatedHoverText>
          </Link>
          <Link
            href="/iwallets/demo/policy"
            data-hover-trigger
            className="border-border hover:text-accent inline-flex items-center gap-2 rounded-full border px-4 py-2"
          >
            <HiOutlineShieldCheck />{" "}
            <AnimatedHoverText>Policy</AnimatedHoverText>
          </Link>
        </div>
      </div>
    </footer>
  );
}
