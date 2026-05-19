import type { IWallet } from "@/lib/demo-data";
import { HiOutlineLockClosed, HiOutlineShieldCheck } from "react-icons/hi2";

export function PolicyControlsPanel({ wallet }: { wallet: IWallet }) {
  return (
    <section className="rounded-[1.8rem] border border-white/10 bg-[#131416] p-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div>
          <p className="inline-flex items-center gap-2 text-sm font-medium text-[#92979d]"><HiOutlineLockClosed className="text-[#fbff6c]" />Spending rules</p>
          <h2 className="mt-2 text-2xl font-semibold text-[#e5eef1]">Policy controls for this iWallet</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[#92979d]">Policy controls are secondary in the MVP, but they remain attached to the iWallet rather than the agent.</p>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-[#fbff6c]/35 bg-[#fbff6c]/10 px-3 py-1.5 text-xs font-medium text-[#fbff6c]"><HiOutlineShieldCheck />Move enforced</span>
      </div>
      <div className="mt-6 flex flex-col gap-4 md:flex-row md:flex-wrap">
        <Rule label="Max per transaction" value={wallet.policy.maxPerTransaction} />
        <Rule label="Session limit" value={wallet.policy.sessionLimit} />
        <Rule label="Expiry" value={wallet.policy.expiry} />
        <Rule label="Allowed targets" value={wallet.policy.allowedTargets.join(", ")} />
      </div>
      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <button className="rounded-full border border-orange-300/30 bg-orange-300/10 px-4 py-3 text-left text-sm font-semibold text-orange-100">Freeze iWallet</button>
        <button className="rounded-full border border-red-300/30 bg-red-300/10 px-4 py-3 text-left text-sm font-semibold text-red-100">Revoke linked agent</button>
      </div>
    </section>
  );
}

function Rule({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[1.25rem] border border-white/10 p-4 md:flex-1">
      <p className="text-xs uppercase tracking-[0.16em] text-[#92979d]">{label}</p>
      <p className="mt-2 text-sm font-medium text-[#e5eef1]">{value}</p>
    </div>
  );
}
