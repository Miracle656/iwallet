import Link from "next/link";
import { AnimatedHoverText } from "@/components/animated-hover-text";
import { HashText } from "@/components/hash-text";
import { HomeHeroCycle } from "@/components/home-hero-cycle";
import { IconChip } from "@/components/icon-chip";
import { iwallets, processedTransactions } from "@/lib/demo-data";
import { HiOutlineArrowRight, HiOutlineBolt, HiOutlineCheckBadge } from "react-icons/hi2";

export default function Home() {
  const wallet = iwallets[0];
  const latest = processedTransactions[0];

  return (
    <main className="min-h-screen bg-[#101113] text-[#e5eef1]">
      <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-5 pb-6 pt-36 sm:px-8">
        <section className="flex flex-1 flex-col items-center justify-center gap-7 py-12">
          <HomeHeroCycle />

          <div className="w-full rounded-[2.4rem] border border-white/10 bg-[#131416]/95 p-5 sm:p-8">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-baseline gap-5">
                <span className="text-2xl font-semibold">iWallet</span>
                <span className="text-2xl text-[#6f747a]">Agent</span>
              </div>
              <Link href="/dashboard" data-hover-trigger className="inline-flex items-center gap-2 rounded-full bg-[#298dff] px-5 py-2.5 text-sm font-semibold text-[#131416] hover:bg-[#5aa9ff]">
                <AnimatedHoverText>Launch App</AnimatedHoverText> <HiOutlineArrowRight />
              </Link>
            </div>

            <div className="mt-7 flex flex-col gap-3 lg:flex-row">
              <Panel eyebrow="Owner wallet" title="Connected" meta="0x8a42...19fd">
                <Selector label="iWallet" value={wallet.name} />
                <Selector label="Network" value="Sui Testnet" />
              </Panel>
              <Panel eyebrow="Linked agent" title="Verified" meta={wallet.linkedAgent?.id ?? "Unlinked"}>
                <Selector label="Agent" value={wallet.linkedAgent?.name ?? "No agent"} />
                <Selector label="Source" value={wallet.linkedAgent?.source ?? "External"} />
              </Panel>
            </div>

            <div className="mt-3 flex flex-col gap-3 lg:flex-row">
              <AmountCard label="Balance" value="120" suffix="SUI" sub="Available for delegated actions" />
              <AmountCard label="Latest processed" value={latest.amount?.toLocaleString() ?? "1"} suffix={latest.token ?? "tx"} sub={latest.target ?? "Policy verified"} />
            </div>

            <div className="mt-7 flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
              <div className="text-sm text-[#92979d]">
                <p><span className="text-[#e5eef1]">Object</span> <HashText value={wallet.objectId} chars={7} /></p>
                <p className="mt-2">Last digest <HashText value={latest.digest ?? "pending"} chars={7} /></p>
              </div>
              <Link href="/iwallets/demo" data-hover-trigger className="inline-flex items-center justify-center gap-2 rounded-full bg-[#298dff] px-8 py-4 text-center text-sm font-semibold text-[#131416] hover:bg-[#5aa9ff]">
                <AnimatedHoverText>View iWallet</AnimatedHoverText> <HiOutlineArrowRight />
              </Link>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

function Panel({ eyebrow, title, meta, children }: { eyebrow: string; title: string; meta: string; children: React.ReactNode }) {
  return (
    <div className="w-full rounded-[1.8rem] border border-white/10 p-5 lg:flex-1">
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm text-[#92979d]">{eyebrow}</span>
        <span className="inline-flex items-center gap-2 rounded-full bg-[#222328] px-4 py-2 font-mono text-xs text-[#e5eef1]"><HiOutlineCheckBadge className="text-[#298dff]" />{meta}</span>
      </div>
      <p className="mt-6 text-lg font-medium text-[#e5eef1]">{title}</p>
      <div className="mt-5 flex flex-col gap-5 sm:flex-row">{children}</div>
    </div>
  );
}

function Selector({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-sm text-[#6f747a]">{label}</p>
      <p className="mt-3 truncate text-lg text-[#e5eef1]">{value}</p>
    </div>
  );
}

function AmountCard({ label, value, suffix, sub }: { label: string; value: string; suffix: string; sub: string }) {
  return (
    <div className="w-full rounded-[1.8rem] border border-white/10 p-5 lg:flex-1">
      <div className="flex items-center justify-between text-sm">
        <span className="text-[#e5eef1]">{label}</span>
        <span className="text-[#92979d]">{suffix}</span>
      </div>
      <div className="mt-8 flex items-end justify-between gap-4">
        <IconChip tone="accent"><HiOutlineBolt /></IconChip>
        <p className="text-right text-5xl font-light tracking-[-0.06em] text-[#e5eef1] sm:text-6xl">
          {value}<span className="text-[#6f747a]">.{suffix === "SUI" ? "00" : ""}</span>
        </p>
      </div>
      <p className="mt-3 text-right text-sm text-[#92979d]">{sub}</p>
    </div>
  );
}
