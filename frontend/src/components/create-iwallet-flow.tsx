"use client";

import { useState } from "react";
import Link from "next/link";
import type { PasskeyKeypair } from "@mysten/sui/keypairs/passkey";
import { AnimatedHoverText } from "@/components/animated-hover-text";
import { HashText } from "@/components/hash-text";
import { addLocalIdentityId } from "@/lib/local-identities";
import { createPasskeyOwner } from "@/lib/passkey";
import { buildCreateIdentityTx, buildSetPolicyTx, suiClient } from "@/lib/sui-client";
import { fetchVerificationKeyBytes } from "@/lib/vk";
import { computeIdentityHash, generateWitness, witnessToHex } from "@/lib/witness";
import {
  HiOutlineArrowLeft,
  HiOutlineArrowRight,
  HiOutlineCheckCircle,
  HiOutlineFingerPrint,
  HiOutlineIdentification,
  HiOutlineLockClosed,
  HiOutlineShieldCheck,
} from "react-icons/hi2";

const steps = ["Owner", "Identity", "Policy", "Create"] as const;

type ObjectChange = { type?: string; objectType?: string; objectId?: string };

export function CreateIWalletFlow() {
  const [step, setStep] = useState(0);
  const [name, setName] = useState("Operations iWallet");

  // Owner (passkey)
  const [keypair, setKeypair] = useState<PasskeyKeypair | null>(null);
  const [ownerAddress, setOwnerAddress] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Witness
  const [witnessHex, setWitnessHex] = useState<string | null>(null);
  const [identityHash, setIdentityHash] = useState<string | null>(null);
  const [identityHashBytes, setIdentityHashBytes] = useState<Uint8Array | null>(null);

  // Policy form
  const [budget, setBudget] = useState("100");
  const [expiryDays, setExpiryDays] = useState("1");
  const [recipient, setRecipient] = useState("");

  // Submission
  const [submitting, setSubmitting] = useState(false);
  const [createdId, setCreatedId] = useState<string | null>(null);

  async function onCreatePasskey() {
    setBusy(true);
    setError(null);
    try {
      const owner = await createPasskeyOwner();
      setKeypair(owner.keypair);
      setOwnerAddress(owner.address);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Passkey creation failed");
    } finally {
      setBusy(false);
    }
  }

  function onGenerateWitness() {
    const w = generateWitness();
    const hash = computeIdentityHash(w);
    setWitnessHex(witnessToHex(w));
    setIdentityHash(hash.hex);
    setIdentityHashBytes(hash.bytesLE);
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

  async function onCreate() {
    if (!keypair || !ownerAddress || !identityHashBytes) {
      setError("Owner + identity hash required");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const vkBytes = await fetchVerificationKeyBytes();

      // 1. create_iidentity — owner signs with passkey, owner pays gas
      const tx1 = buildCreateIdentityTx(name, identityHashBytes, vkBytes);
      const r1 = await suiClient.signAndExecuteTransaction({
        transaction: tx1,
        signer: keypair,
        options: { showObjectChanges: true, showEffects: true },
      });
      if (r1.effects?.status?.status !== "success") {
        throw new Error(r1.effects?.status?.error ?? "create_iidentity failed");
      }
      const created = (r1.objectChanges ?? []).find((c: ObjectChange) =>
        String(c.objectType ?? "").includes("::prototype::IIdentity<"),
      ) as ObjectChange | undefined;
      const newId = created?.objectId;
      if (!newId) throw new Error(`IIdentity not created in tx ${r1.digest}`);

      // 2. set_policy — owner-signed
      const budgetMist = BigInt(Math.max(0, Math.floor(Number(budget) * 1e9)));
      const expirationMs = BigInt(Date.now() + Math.max(1, Number(expiryDays)) * 86_400_000);
      const allow = recipient.trim() ? [recipient.trim()] : [];
      const tx2 = buildSetPolicyTx(newId, budgetMist, allow, expirationMs);
      const r2 = await suiClient.signAndExecuteTransaction({
        transaction: tx2,
        signer: keypair,
        options: { showEffects: true },
      });
      if (r2.effects?.status?.status !== "success") {
        throw new Error(r2.effects?.status?.error ?? "set_policy failed");
      }

      addLocalIdentityId(newId);
      setCreatedId(newId);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Create failed";
      // Friendlier gas hint — most likely cause for a fresh passkey.
      if (/insufficient.*gas|GasBalance|no.*gas/i.test(msg)) {
        setError(
          `Owner has no SUI. Send testnet SUI to ${ownerAddress} (the passkey address) and retry. ` +
            `Gas-station sponsorship is the next step.`,
        );
      } else {
        setError(msg);
      }
    } finally {
      setSubmitting(false);
    }
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
            {error && step === 0 && <p className="text-sm text-red-300">{error}</p>}
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
            <Field label="Allowed recipient (DeepBook pool address — optional)">
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

            {!createdId ? (
              <>
                <div className="rounded-[1.25rem] border border-[#fbff6c]/20 bg-[#fbff6c]/5 p-4 text-sm text-[#fbff6c]">
                  Submits <code>create_iidentity</code> + <code>set_policy</code>, both signed by your
                  passkey. The owner address pays gas — fund {ownerAddress ? <HashText value={ownerAddress} chars={6} /> : "your passkey"} with a little testnet SUI first
                  (gas-station sponsorship is the next step).
                </div>
                <button
                  onClick={onCreate}
                  disabled={submitting || !keypair || !identityHashBytes}
                  data-hover-trigger
                  className="inline-flex w-fit items-center gap-2 rounded-full bg-[#fbff6c] px-8 py-4 text-sm font-semibold text-[#131416] hover:bg-[#f7ff8f] disabled:opacity-40"
                >
                  <HiOutlineFingerPrint /> {submitting ? "Signing & submitting…" : "Create iWallet"}
                </button>
                {error && <p className="text-sm text-red-300">{error}</p>}
              </>
            ) : (
              <div className="rounded-[1.25rem] border border-emerald-300/30 bg-emerald-300/10 p-4">
                <p className="inline-flex items-center gap-2 text-sm font-medium text-emerald-200">
                  <HiOutlineCheckCircle /> iWallet created on-chain
                </p>
                <p className="mt-2 text-xs text-[#92979d]">
                  New IIdentity object: <HashText value={createdId} chars={10} />
                </p>
                <Link
                  href={`/iwallets/${createdId}`}
                  className="mt-3 inline-flex items-center gap-2 rounded-full bg-[#fbff6c] px-5 py-2.5 text-sm font-semibold text-[#131416] hover:bg-[#f7ff8f]"
                >
                  View profile <HiOutlineArrowRight />
                </Link>
              </div>
            )}
          </Panel>
        )}
      </div>

      <div className="mt-7 flex justify-between gap-3">
        <button
          disabled={step === 0 || submitting}
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
