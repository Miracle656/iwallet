import type { IWallet } from "@/lib/demo-data";
import { HiOutlineLink, HiOutlineShieldCheck } from "react-icons/hi2";

export function LinkedAgentCard({ wallet }: { wallet: IWallet }) {
  const agent = wallet.linkedAgent;

  return (
    <section className="rounded-[1.8rem] border border-border bg-surface p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="inline-flex items-center gap-2 text-sm font-medium text-muted"><HiOutlineLink className="text-accent" />Linked agent</p>
          <h2 className="mt-2 text-xl font-semibold text-ink">{agent?.name ?? "No agent linked"}</h2>
        </div>
        <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium ${agent?.status === "linked" ? "border-accent/35 bg-accent/10 text-accent" : "border-border bg-elevated text-muted"}`}>
          <HiOutlineShieldCheck /> {agent?.status === "linked" ? "Linked" : "Unlinked"}
        </span>
      </div>
      <div className="mt-5 flex flex-col gap-3 text-sm">
        <Info label="Agent source" value={agent?.source ?? "Not configured"} />
        <Info label="Agent type" value={agent?.type ?? "External agent"} />
        <Info label="MVP model" value="1 agent -> 1 iWallet" />
      </div>
      <p className="mt-5 text-sm leading-6 text-muted">
        I-Wallet does not create the agent. It creates the wallet, identity binding, and transaction surface that an existing agent can use safely.
      </p>
    </section>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-border pb-3 last:border-b-0 last:pb-0">
      <span className="text-muted">{label}</span>
      <span className="text-right font-medium text-ink">{value}</span>
    </div>
  );
}
