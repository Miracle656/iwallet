"use client";

import { useState } from "react";
import { AnimatedHoverText } from "@/components/animated-hover-text";
import { HashText } from "@/components/hash-text";
import { createPasskeyOwner } from "@/lib/passkey";
import { computeIdentityHash, generateWitness, witnessToHex } from "@/lib/witness";
import {
  HiOutlineArrowLeft,
  HiOutlineArrowRight,
  HiOutlineFingerPrint,
  HiOutlineIdentification,
  HiOutlineLockClosed,
  HiOutlineShieldCheck,
} from "react-icons/hi2";

const steps = ["Owner", "Identity", "Policy", "Create"] as const;

export function CreateIWalletFlow() {
  const [step, setStep] = useState(0);
  const [name, setName] = useState("Operations iWallet");

  // Step 1 — passkey owner
  const [ownerAddress, setOwnerAddress] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Step 2 — witness + identity hash
  const [witnessHex, setWitnessHex] = useState<string | null>(null);
  const [identityHash, setIdentityHash] = useState<string | null>(null);

  // Step 3 — policy
  const [budget, setBudget] = useState("100");
  const [expiryDays, setExpiryDays] = useState("1");
  const [recipient, setRecipient] = useState("");

  async function onCreatePasskey() {
    setBusy(true);
    setError(null);
    try {
      const { address } = await createPasskeyOwner();
      setOwnerAddress(address);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Passkey creation failed");
    } finally {
      setBusy(false);
    }
  }

  function onGenerateWitness() {
    const w = generateWitness();
    setWitnessHex(witnessToHex(w));
    setIdentityHash(computeIdentityHash(w).hex);
  }

  function onDownloadRecovery() {
    if (!witnessHex || !identityHash) return;
    const body = [
      "# I-Wallet recovery — KEEP SECRET",
      `owner_address=${ownerAddress ?? ""}`,
      `identity_hash=${identityHash}`,
      `witness_w=${witnessHex}`,
    ].join("\n");
    const url = URL.createObjectURL(new Blob([body], { type: "text/plain" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "iwallet-recovery.txt";
    a.click();
    URL.revokeObjectURL(url);
  }

  const canContinue =
    (step === 0 && !!ownerAddress) ||
    (step === 1 && !!identityHash) ||
    step === 2;
  const isLast = step === steps.length - 1;

  return (
    <section className="rounded-[2.4rem] border border-white/10 bg-[#131416] p-5 sm:p-7">
      <div className="flex flex-wrap justify-center gap-2">
        {steps.map((label, index) => (
          <button
            key={label}
            onClick={() => setStep(index)}
            data-hover-trigger
            className={`cursor-pointer rounded-full border px-5 py-3 text-sm ${index === step ? "border-white/10 text-[#e5eef1]" : "border-transparent text-[#6f747a]"}`}
          >
            <span className="mr-2 font-mono text-xs">{index + 1}</span>
            {index === step ? <AnimatedHoverText>{label}</AnimatedHoverText> : label}
          </button>
        ))}
      </div>

      <div className="mt-7">
        {step === 0 && (
          <Panel icon={<HiOutlineFingerPrint />} title="Owner — passkey">
            <p className="text-sm text-[#92979d]">
              Your passkey is the iWallet owner. It authorizes creation, sets the agent&apos;s
              policy, and can revoke it — no seed phrase, no private key in the browser.
            </p>
            <Field label="iWallet name">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-[#101113] px-4 py-2.5 text-sm text-[#e5eef1] outline-none focus:border-[#fbff6c]/50"
              />
            </Field>
            {ownerAddress ? (
              <div className="rounded-[1.25rem] border border-[#fbff6c]/20 p-4">
                <p className="text-xs text-[#6f747a]">Owner address (passkey)</p>
                <p className="mt-2"><HashText value={ownerAddress} chars={16} /></p>
              </div>
            ) : (
              <button
                onClick={onCreatePasskey}
                disabled={busy}
                data-hover-trigger
                className="inline-flex w-fit items-center gap-2 rounded-full bg-[#fbff6c] px-6 py-3 text-sm font-semibold text-[#131416] hover:bg-[#f7ff8f] disabled:opacity-40"
              >
                <HiOutlineFingerPrint /> {busy ? "Waiting for passkey…" : "Create passkey owner"}
              </button>
            )}
            {error && <p className="text-sm text-[#E64545]">{error}</p>}
          </Panel>
        )}

        {step === 1 && (
          <Panel icon={<HiOutlineIdentification />} title="Identity — secret witness">
            <p className="text-sm text-[#92979d]">
              The secret witness <code className="text-[#e5eef1]">w</code> is generated locally and
              never leaves your browser. The chain only ever sees{" "}
              <code className="text-[#e5eef1]">Poseidon(w)</code>. Keep the recovery file — it&apos;s
              your fund-recovery key if the agent goes offline.
            </p>
            {identityHash ? (
              <>
                <div className="rounded-[1.25rem] border border-white/10 p-4">
                  <p className="text-xs text-[#6f747a]">Identity hash — Poseidon(w), 32-byte LE</p>
                  <p className="mt-2"><HashText value={identityHash} chars={16} /></p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button onClick={onGenerateWitness} data-hover-trigger className="rounded-full border border-white/10 px-5 py-2.5 text-sm font-medium text-[#e5eef1] hover:text-[#fbff6c]">
                    <AnimatedHoverText>Regenerate</AnimatedHoverText>
                  </button>
                  <button onClick={onDownloadRecovery} data-hover-trigger className="inline-flex items-center gap-2 rounded-full bg-[#222328] px-5 py-2.5 text-sm font-semibold text-[#e5eef1] hover:text-[#fbff6c]">
                    <HiOutlineShieldCheck /> Download recovery
                  </button>
                </div>
              </>
            ) : (
              <button onClick={onGenerateWitness} data-hover-trigger className="inline-flex w-fit items-center gap-2 rounded-full bg-[#fbff6c] px-6 py-3 text-sm font-semibold text-[#131416] hover:bg-[#f7ff8f]">
                <HiOutlineIdentification /> Generate secret witness
              </button>
            )}
          </Panel>
        )}

        {step === 2 && (
          <Panel icon={<HiOutlineLockClosed />} title="Policy — on-chain mandate">
            <p className="text-sm text-[#92979d]">
              These caps are enforced on-chain by <code className="text-[#e5eef1]">AgentPolicy</code>:
              the agent can never exceed the budget, send outside the allowed pool, or act past expiry.
            </p>
            <Field label="Budget cap (SUI)">
              <input value={budget} onChange={(e) => setBudget(e.target.value)} inputMode="decimal" className="w-full rounded-xl border border-white/10 bg-[#101113] px-4 py-2.5 text-sm text-[#e5eef1] outline-none focus:border-[#fbff6c]/50" />
            </Field>
            <Field label="Expires in (days)">
              <input value={expiryDays} onChange={(e) => setExpiryDays(e.target.value)} inputMode="numeric" className="w-full rounded-xl border border-white/10 bg-[#101113] px-4 py-2.5 text-sm text-[#e5eef1] outline-none focus:border-[#fbff6c]/50" />
            </Field>
            <Field label="Allowed recipient (DeepBook pool address)">
              <input value={recipient} onChange={(e) => setRecipient(e.target.value)} placeholder="0x… pool id" className="w-full rounded-xl border border-white/10 bg-[#101113] px-4 py-2.5 font-mono text-xs text-[#e5eef1] outline-none placeholder:text-[#6f747a] focus:border-[#fbff6c]/50" />
            </Field>
          </Panel>
        )}

        {step === 3 && (
          <Panel icon={<HiOutlineShieldCheck />} title="Review & create">
            <Summary label="Owner (passkey)" value={ownerAddress ?? "—"} mono />
            <Summary label="Identity hash" value={identityHash ?? "—"} mono />
            <Summary label="Budget cap" value={`${budget} SUI`} />
            <Summary label="Expiry" value={`${expiryDays} day(s)`} />
            <Summary label="Allowed recipient" value={recipient || "—"} mono />
            <div className="rounded-[1.25rem] border border-[#fbff6c]/20 bg-[#fbff6c]/5 p-4 text-sm text-[#fbff6c]">
              Ready to submit: <code>create_iidentity</code> + <code>set_policy</code>, owner-signed by
              passkey and sponsored by the gas station. On-chain submission activates once George&apos;s
              updated contract is republished (new package id + vk asset wired).
            </div>
          </Panel>
        )}
      </div>

      <div className="mt-7 flex justify-between gap-3">
        <button
          disabled={step === 0}
          onClick={() => setStep((v) => Math.max(0, v - 1))}
          data-hover-trigger
          className="inline-flex items-center gap-2 rounded-full border border-white/10 px-6 py-3 text-sm font-semibold text-[#e5eef1] disabled:cursor-not-allowed disabled:opacity-30"
        >
          <HiOutlineArrowLeft /> <AnimatedHoverText>Back</AnimatedHoverText>
        </button>
        {!isLast && (
          <button
            disabled={!canContinue}
            onClick={() => setStep((v) => Math.min(steps.length - 1, v + 1))}
            data-hover-trigger
            className="inline-flex items-center gap-2 rounded-full bg-[#fbff6c] px-8 py-4 text-sm font-semibold text-[#131416] hover:bg-[#f7ff8f] disabled:opacity-40"
          >
            <AnimatedHoverText>Continue</AnimatedHoverText> <HiOutlineArrowRight />
          </button>
        )}
      </div>
    </section>
  );
}

function Panel({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-[1.9rem] border border-white/10 p-5">
      <h2 className="inline-flex items-center gap-2 text-xl font-medium text-[#e5eef1]">
        <span className="text-[#fbff6c]">{icon}</span>
        {title}
      </h2>
      <div className="mt-6 flex flex-col gap-5">{children}</div>
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-2 text-sm text-[#6f747a]">{label}</p>
      {children}
    </div>
  );
}

function Summary({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-white/10 pb-3 last-of-type:border-none">
      <span className="text-sm text-[#6f747a]">{label}</span>
      <span className={`truncate text-sm text-[#e5eef1] ${mono ? "font-mono text-xs" : ""}`}>{value}</span>
    </div>
  );
}
