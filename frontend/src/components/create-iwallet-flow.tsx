"use client";

import Link from "next/link";
import { useState } from "react";
import { AnimatedHoverText } from "@/components/animated-hover-text";
import { HashText } from "@/components/hash-text";
import { identityVisuals } from "@/lib/demo-data";
import { HiOutlineArrowLeft, HiOutlineArrowRight, HiOutlineIdentification, HiOutlineLink, HiOutlineLockClosed, HiOutlineWallet } from "react-icons/hi2";

const steps = ["Info", "Agent", "Identity", "Create"] as const;

export function CreateIWalletFlow() {
  const [step, setStep] = useState(0);
  const identityHash = "0x91b0b36822b7a86e63f91e89f74b4a3a8b6c0d94045c1250f61e8ef1ad6d9284";
  const isLast = step === steps.length - 1;

  return (
    <section className="rounded-[2.4rem] border border-white/10 bg-[#131416] p-5 sm:p-7">
      <div className="flex flex-wrap justify-center gap-2">
        {steps.map((label, index) => (
          <button key={label} onClick={() => setStep(index)} data-hover-trigger className={`cursor-pointer rounded-full border px-5 py-3 text-sm ${index === step ? "border-white/10 text-[#e5eef1]" : "border-transparent text-[#6f747a]"}`}>
            <span className="mr-2 font-mono text-xs">{index + 1}</span>{index === step ? <AnimatedHoverText>{label}</AnimatedHoverText> : null}
          </button>
        ))}
      </div>

      <div className="mt-7">
        {step === 0 ? <Panel icon={<HiOutlineWallet />} title="iWallet"><Field label="Name" value="Operations iWallet" /><Field label="Use case" value="Automation" /></Panel> : null}
        {step === 1 ? <Panel icon={<HiOutlineLink />} title="Existing agent"><Field label="Agent" value="Nova trading runner" /><Field label="Source" value="External daemon" /></Panel> : null}
        {step === 2 ? <Panel icon={<HiOutlineIdentification />} title="Visual ID"><div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">{identityVisuals.map((visual) => <div key={visual.label} className="rounded-[1.25rem] border border-white/10 p-4 text-[#e5eef1] sm:flex-1"><p className="font-mono text-sm">{visual.code}</p><p className="mt-2 text-sm font-medium">{visual.label}</p></div>)}</div></Panel> : null}
        {step === 3 ? <Panel icon={<HiOutlineLockClosed />} title="Security"><div className="rounded-[1.25rem] border border-[#fbff6c]/20 p-4 text-sm text-[#fbff6c]">Secret generated locally</div><div className="rounded-[1.25rem] border border-white/10 p-4"><p className="text-xs text-[#6f747a]">Identity hash</p><p className="mt-3"><HashText value={identityHash} chars={14} /></p></div></Panel> : null}
      </div>

      <div className="mt-7 flex justify-between gap-3">
        <button disabled={step === 0} onClick={() => setStep((value) => Math.max(0, value - 1))} data-hover-trigger className="inline-flex items-center gap-2 rounded-full border border-white/10 px-6 py-3 text-sm font-semibold text-[#e5eef1] disabled:cursor-not-allowed disabled:opacity-30">
          <HiOutlineArrowLeft /> <AnimatedHoverText>Back</AnimatedHoverText>
        </button>
        {isLast ? (
          <Link href="/iwallets/demo/fund" data-hover-trigger className="inline-flex items-center gap-2 rounded-full bg-[#fbff6c] px-8 py-4 text-sm font-semibold text-[#131416] hover:bg-[#f7ff8f]">
            <AnimatedHoverText>Create iWallet</AnimatedHoverText> <HiOutlineArrowRight />
          </Link>
        ) : (
          <button onClick={() => setStep((value) => Math.min(steps.length - 1, value + 1))} data-hover-trigger className="inline-flex items-center gap-2 rounded-full bg-[#fbff6c] px-8 py-4 text-sm font-semibold text-[#131416] hover:bg-[#f7ff8f]">
            <AnimatedHoverText>Continue</AnimatedHoverText> <HiOutlineArrowRight />
          </button>
        )}
      </div>
    </section>
  );
}

function Panel({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return <section className="rounded-[1.9rem] border border-white/10 p-5"><h2 className="inline-flex items-center gap-2 text-xl font-medium text-[#e5eef1]"><span className="text-[#fbff6c]">{icon}</span>{title}</h2><div className="mt-6 flex flex-col gap-5">{children}</div></section>;
}

function Field({ label, value }: { label: string; value: string }) {
  return <div><p className="text-sm text-[#6f747a]">{label}</p><p className="mt-3 text-lg text-[#e5eef1]">{value}</p></div>;
}
