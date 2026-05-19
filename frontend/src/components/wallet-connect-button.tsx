import { HiOutlineWallet } from "react-icons/hi2";

export function WalletConnectButton() {
  return (
    <button className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-[#222328] px-4 py-2 text-sm font-medium text-[#e5eef1] transition hover:border-[#fbff6c]/50 hover:text-[#fbff6c]">
      <HiOutlineWallet className="text-base" />
      0x8a42...19fd
    </button>
  );
}
