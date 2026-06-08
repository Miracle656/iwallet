import type { IWallet } from "@/lib/demo-data";
import { HiOutlineArrowRight, HiOutlineBanknotes, HiOutlineGlobeAlt, HiOutlineWallet } from "react-icons/hi2";

export function FundIWalletPanel({ wallet }: { wallet: IWallet }) {
  return (
    <section className="rounded-[2.4rem] border border-white/10 bg-[#131416] p-5 sm:p-7">
      <div className="flex items-baseline gap-5">
        <span className="inline-flex items-center gap-2 text-2xl font-semibold text-[#e5eef1]"><HiOutlineBanknotes className="text-[#298dff]" />Fund</span>
        <span className="text-2xl text-[#6f747a]">Preview</span>
      </div>

      <div className="mt-7 flex flex-col gap-3 lg:flex-row">
        <div className="w-full rounded-[1.9rem] border border-white/10 p-5 lg:flex-1">
          <div className="flex items-center justify-between gap-3">
            <span className="inline-flex items-center gap-2 text-sm text-[#92979d]"><HiOutlineWallet className="text-[#298dff]" />From</span>
            <span className="rounded-full bg-[#222328] px-4 py-2 font-mono text-xs text-[#e5eef1]">0x8a42...19fd</span>
          </div>
          <div className="mt-8 flex gap-5">
            <Field label="Token" value="SUI" />
            <Field label="Network" value="Sui Testnet" />
          </div>
        </div>

        <div className="w-full rounded-[1.9rem] border border-white/10 p-5 lg:flex-1">
          <div className="flex items-center justify-between gap-3">
            <span className="inline-flex items-center gap-2 text-sm text-[#92979d]"><HiOutlineGlobeAlt className="text-[#298dff]" />To</span>
            <span className="rounded-full bg-[#222328] px-4 py-2 text-xs text-[#e5eef1]">{wallet.name}</span>
          </div>
          <div className="mt-8 flex gap-5">
            <Field label="iWallet" value="Connected" />
            <Field label="Gas" value="0.003 SUI" />
          </div>
        </div>
      </div>

      <div className="mt-3 rounded-[1.9rem] border border-white/10 p-5">
        <div className="flex items-center justify-between text-sm">
          <span className="text-[#e5eef1]">Amount</span>
          <span className="text-[#92979d]">Mock action</span>
        </div>
        <p className="mt-8 text-right text-6xl font-light tracking-[-0.06em] text-[#e5eef1]">25<span className="text-[#6f747a]">.00</span></p>
        <p className="mt-3 text-right text-sm text-[#92979d]">SUI added to controlled agent spending</p>
      </div>

      <div className="mt-7 flex justify-end">
        <button className="inline-flex items-center gap-2 rounded-full bg-[#298dff] px-8 py-4 text-sm font-semibold text-[#131416] transition hover:bg-[#5aa9ff]">Fund iWallet <HiOutlineArrowRight /></button>
      </div>
    </section>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-sm text-[#6f747a]">{label}</p>
      <p className="mt-3 text-lg text-[#e5eef1]">{value}</p>
    </div>
  );
}
