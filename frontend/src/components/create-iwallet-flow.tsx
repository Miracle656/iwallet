"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { Transaction } from "@mysten/sui/transactions";
import { toBase64, fromBase64 } from "@mysten/sui/utils";
import { prepareZkTx, executeZkSponsored } from "@/lib/enoki";
import { AnimatedHoverText } from "@/components/animated-hover-text";
import { HashText } from "@/components/hash-text";
import { addLocalIdentityId } from "@/lib/local-identities";
import { buildCreateIdentityTx, buildSetPolicyTx, suiClient } from "@/lib/sui-client";
import { fetchVerificationKeyBytes } from "@/lib/vk";
import { computeIdentityHash, generateWitness, witnessToHex } from "@/lib/witness";
import { getZkLoginAddress, signWithZkLogin } from "@/lib/zklogin";
import {
  HiOutlineArrowLeft,
  HiOutlineArrowRight,
  HiOutlineCheckCircle,
  HiOutlineIdentification,
  HiOutlineLockClosed,
  HiOutlineShieldCheck,
} from "react-icons/hi2";

const steps = ["Owner", "Identity", "Policy", "Create"] as const;
type ObjectChange = { type?: string; objectType?: string; objectId?: string };
type SubmitResult = {
  digest: string;
  effects?: { status?: { status?: string; error?: string } };
  objectChanges?: ObjectChange[];
};

export function CreateIWalletFlow() {
  const [step, setStep] = useState(0);
  const [name, setName] = useState("Operations iWallet");

  const [ownerPicked, setOwnerPicked] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [zkAddress, setZkAddress] = useState<string | null>(null);
  useEffect(() => { setZkAddress(getZkLoginAddress()); }, []);

  const ownerAddress = ownerPicked ? zkAddress : null;

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

  function pickZkLogin() {
    if (!zkAddress) return;
    setError(null);
    setOwnerPicked(true);
  }

  function resetOwner() {
    setOwnerPicked(false);
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
      // The iWallet object id (filled once created). With this + the witness you
      // can fully restore: AGENT_WITNESS_W + IIDENTITY_OBJECT_ID in the agent.
      `iwallet_id=${createdId ?? ""}`,
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

  // Sponsored: backend pays gas — user needs 0 SUI (requires SPONSOR_PRIVATE_KEY on backend)
  async function submitSponsored(tx: Transaction): Promise<SubmitResult> {
    if (!ownerAddress) throw new Error("No owner");
    const kindBytes = await tx.build({ client: suiClient, onlyTransactionKind: true });
    const { txBytes } = await prepareZkTx({ txKindBytes: toBase64(kindBytes), sender: ownerAddress });
    const signature = await signWithZkLogin(fromBase64(txBytes));
    return (await executeZkSponsored({ txBytes, userSignature: signature })) as unknown as SubmitResult;
  }

  // Direct: zkLogin address pays its own gas (needs SUI in the address)
  async function submitDirect(tx: Transaction): Promise<SubmitResult> {
    if (!ownerAddress) throw new Error("No owner");
    tx.setSenderIfNotSet(ownerAddress);
    const txBytes = await tx.build({ client: suiClient });
    const signature = await signWithZkLogin(txBytes);
    return (await suiClient.executeTransactionBlock({
      transactionBlock: toBase64(txBytes),
      signature,
      options: { showObjectChanges: true, showEffects: true },
    })) as unknown as SubmitResult;
  }

  async function submit(tx: Transaction): Promise<SubmitResult> {
    try {
      return await submitSponsored(tx);
    } catch (e) {
      console.warn("[create] sponsored failed, falling back to direct:", e);
    }
    return submitDirect(tx);
  }

  async function onCreate() {
    if (!ownerAddress || !identityHashBytes) {
      setError("Owner + identity hash required");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const vkBytes = await fetchVerificationKeyBytes();

      const tx1 = buildCreateIdentityTx(name, identityHashBytes, vkBytes);
      const r1 = await submit(tx1);
      if (r1.effects?.status?.status !== "success") {
        throw new Error(r1.effects?.status?.error ?? "create_iidentity failed");
      }
      const created = (r1.objectChanges ?? []).find((c) =>
        String(c.objectType ?? "").includes("::prototype::IIdentity<"),
      );
      const newId = created?.objectId;
      if (!newId) throw new Error(`IIdentity not created in tx ${r1.digest}`);

      const budgetMist = BigInt(Math.max(0, Math.floor(Number(budget) * 1e9)));
      const expirationMs = BigInt(Date.now() + Math.max(1, Number(expiryDays)) * 86_400_000);
      const allow = recipient.trim() ? [recipient.trim()] : [];
      const tx2 = buildSetPolicyTx(newId, budgetMist, allow, expirationMs);
      const r2 = await submit(tx2);
      if (r2.effects?.status?.status !== "success") {
        throw new Error(r2.effects?.status?.error ?? "set_policy failed");
      }

      addLocalIdentityId(newId);
      setCreatedId(newId);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Create failed";
      if (/insufficient.*gas|GasBalance|no.*gas/i.test(msg)) {
        setError(`Sponsor key has no testnet SUI — top up the backend SPONSOR_PRIVATE_KEY address and retry.`);
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
    <section className="rounded-[2.4rem] border border-border bg-surface p-5 sm:p-7">
      <div className="flex flex-wrap justify-center gap-2">
        {steps.map((label, index) => (
          <button
            key={label}
            onClick={() => setStep(index)}
            data-hover-trigger
            className={`cursor-pointer rounded-full border px-5 py-3 text-sm ${index === step ? "border-border text-ink" : "border-transparent text-dim"}`}
          >
            <span className="mr-2 font-mono text-xs">{index + 1}</span>
            {index === step ? <AnimatedHoverText>{label}</AnimatedHoverText> : label}
          </button>
        ))}
      </div>

      <div className="mt-7">
        {step === 0 && (
          <Panel icon={<HiOutlineShieldCheck />} title="Owner — pick one">
            <Field label="iWallet name">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-xl border border-border bg-canvas px-4 py-2.5 text-sm text-ink outline-none focus:border-accent/50"
              />
            </Field>

            {ownerPicked ? (
              <div className="rounded-[1.25rem] border border-accent/20 bg-accent/5 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="inline-flex items-center gap-2 text-xs text-dim">
                      <GoogleIcon />
                      Owner (Google / zkLogin)
                    </p>
                    <p className="mt-2"><HashText value={ownerAddress!} chars={16} /></p>
                  </div>
                  <button onClick={resetOwner} className="rounded-full border border-border px-3 py-1.5 text-xs text-ink hover:text-accent">
                    Switch
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={pickZkLogin}
                disabled={!zkAddress}
                className="flex flex-col items-start gap-2 rounded-[1.25rem] border border-border bg-canvas p-4 text-left transition hover:border-accent/40 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <span className="inline-flex items-center gap-2 text-sm font-medium text-ink">
                  <GoogleIcon /> Google / zkLogin
                </span>
                <span className="text-xs text-muted">
                  {zkAddress ? <HashText value={zkAddress} chars={6} /> : "Sign in with Google first"}
                </span>
              </button>
            )}

            {error && step === 0 && <p className="text-sm text-red-300">{error}</p>}
          </Panel>
        )}

        {step === 1 && (
          <Panel icon={<HiOutlineIdentification />} title="Identity — secret witness">
            <p className="text-sm text-muted">
              The secret witness <code className="text-ink">w</code> is generated locally and
              never leaves your browser. The chain only ever sees{" "}
              <code className="text-ink">Poseidon(w)</code>. Keep the recovery file — it&apos;s
              your fund-recovery key if the agent goes offline.
            </p>
            {identityHash ? (
              <>
                <div className="rounded-[1.25rem] border border-border p-4">
                  <p className="text-xs text-dim">Identity hash — Poseidon(w), 32-byte LE</p>
                  <p className="mt-2"><HashText value={identityHash} chars={16} /></p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button onClick={onGenerateWitness} data-hover-trigger className="rounded-full border border-border px-5 py-2.5 text-sm font-medium text-ink hover:text-accent">
                    <AnimatedHoverText>Regenerate</AnimatedHoverText>
                  </button>
                  <button onClick={onDownloadRecovery} data-hover-trigger className="inline-flex items-center gap-2 rounded-full bg-elevated px-5 py-2.5 text-sm font-semibold text-ink hover:text-accent">
                    <HiOutlineShieldCheck /> Download recovery
                  </button>
                </div>
              </>
            ) : (
              <button onClick={onGenerateWitness} data-hover-trigger className="inline-flex w-fit items-center gap-2 rounded-full bg-accent px-6 py-3 text-sm font-semibold text-on-accent hover:bg-accent-soft">
                <HiOutlineIdentification /> Generate secret witness
              </button>
            )}
          </Panel>
        )}

        {step === 2 && (
          <Panel icon={<HiOutlineLockClosed />} title="Policy — on-chain mandate">
            <p className="text-sm text-muted">
              These caps are enforced on-chain by <code className="text-ink">AgentPolicy</code>:
              the agent can never exceed the budget, send outside the allowed pool, or act past expiry.
            </p>
            <Field label="Budget cap (SUI)">
              <input value={budget} onChange={(e) => setBudget(e.target.value)} inputMode="decimal" className="w-full rounded-xl border border-border bg-canvas px-4 py-2.5 text-sm text-ink outline-none focus:border-accent/50" />
            </Field>
            <Field label="Expires in (days)">
              <input value={expiryDays} onChange={(e) => setExpiryDays(e.target.value)} inputMode="numeric" className="w-full rounded-xl border border-border bg-canvas px-4 py-2.5 text-sm text-ink outline-none focus:border-accent/50" />
            </Field>
            <Field label="Allowed recipient (DeepBook pool address — optional)">
              <input value={recipient} onChange={(e) => setRecipient(e.target.value)} placeholder="0x… pool id" className="w-full rounded-xl border border-border bg-canvas px-4 py-2.5 font-mono text-xs text-ink outline-none placeholder:text-dim focus:border-accent/50" />
            </Field>
          </Panel>
        )}

        {step === 3 && (
          <Panel icon={<HiOutlineShieldCheck />} title="Review & create">
            <Summary label="Owner (Google / zkLogin)" value={ownerAddress ?? "—"} mono />
            <Summary label="Identity hash" value={identityHash ?? "—"} mono />
            <Summary label="Budget cap" value={`${budget} SUI`} />
            <Summary label="Expiry" value={`${expiryDays} day(s)`} />
            <Summary label="Allowed recipient" value={recipient || "—"} mono />

            {!createdId ? (
              <>
                <div className="rounded-[1.25rem] border border-accent/20 bg-accent/5 p-4 text-sm text-accent">
                  Approve with your Google account to create the iWallet on-chain. Gas is sponsored — no SUI needed.
                </div>
                <button
                  onClick={onCreate}
                  disabled={submitting || !ownerPicked}
                  data-hover-trigger
                  className="inline-flex w-fit items-center gap-2 rounded-full bg-accent px-8 py-4 text-sm font-semibold text-on-accent hover:bg-accent-soft disabled:opacity-40"
                >
                  <GoogleIcon />
                  {submitting ? "Signing & submitting…" : "Create iWallet"}
                </button>
                {error && <p className="text-sm text-red-300">{error}</p>}
              </>
            ) : (
              <div className="rounded-[1.25rem] border border-emerald-600/30 bg-emerald-50 p-4 dark:border-emerald-300/30 dark:bg-emerald-300/10">
                <p className="inline-flex items-center gap-2 text-sm font-medium text-emerald-700 dark:text-emerald-300">
                  <HiOutlineCheckCircle /> iWallet created on-chain
                </p>
                <p className="mt-2 text-xs text-muted">
                  New IIdentity object: <HashText value={createdId} chars={10} />
                </p>
                <p className="mt-3 text-xs text-emerald-600 dark:text-emerald-200/80">
                  Download your recovery file now — it includes this object id + the witness, so you
                  can restore control later. Keep it secret.
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    onClick={onDownloadRecovery}
                    className="inline-flex items-center gap-2 rounded-full bg-elevated px-5 py-2.5 text-sm font-semibold text-ink hover:text-accent"
                  >
                    <HiOutlineShieldCheck /> Download recovery
                  </button>
                  <Link
                    href={`/iwallets/${createdId}`}
                    className="inline-flex items-center gap-2 rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-on-accent hover:bg-accent-soft"
                  >
                    View profile <HiOutlineArrowRight />
                  </Link>
                </div>
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
          className="inline-flex items-center gap-2 rounded-full border border-border px-6 py-3 text-sm font-semibold text-ink disabled:cursor-not-allowed disabled:opacity-30"
        >
          <HiOutlineArrowLeft /> <AnimatedHoverText>Back</AnimatedHoverText>
        </button>
        {!isLast && (
          <button
            disabled={!canContinue}
            onClick={() => setStep((v) => Math.min(steps.length - 1, v + 1))}
            data-hover-trigger
            className="inline-flex items-center gap-2 rounded-full bg-accent px-8 py-4 text-sm font-semibold text-on-accent hover:bg-accent-soft disabled:opacity-40"
          >
            <AnimatedHoverText>Continue</AnimatedHoverText> <HiOutlineArrowRight />
          </button>
        )}
      </div>
    </section>
  );
}

function GoogleIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden>
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
  );
}

function Panel({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-[1.9rem] border border-border p-5">
      <h2 className="inline-flex items-center gap-2 text-xl font-medium text-ink">
        <span className="text-accent">{icon}</span>
        {title}
      </h2>
      <div className="mt-6 flex flex-col gap-5">{children}</div>
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-2 text-sm text-dim">{label}</p>
      {children}
    </div>
  );
}

function Summary({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-border pb-3 last-of-type:border-none">
      <span className="text-sm text-dim">{label}</span>
      <span className={`truncate text-sm text-ink ${mono ? "font-mono text-xs" : ""}`}>{value}</span>
    </div>
  );
}
