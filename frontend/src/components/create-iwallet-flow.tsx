"use client";

import { useState } from "react";
import Link from "next/link";
import type { PasskeyKeypair } from "@mysten/sui/keypairs/passkey";
import { useCurrentAccount, useSignAndExecuteTransaction, useSignTransaction } from "@mysten/dapp-kit";
import type { Transaction } from "@mysten/sui/transactions";
import { toBase64, fromBase64 } from "@mysten/sui/utils";
import { AnimatedHoverText } from "@/components/animated-hover-text";
import { HashText } from "@/components/hash-text";
import { addLocalIdentityId } from "@/lib/local-identities";
import { createPasskeyOwner } from "@/lib/passkey";
import { buildCreateIdentityTx, buildSetPolicyTx, suiClient } from "@/lib/sui-client";
import { IWALLET_PACKAGE_ID } from "@/lib/sui-config";
import { enokiConfigured, executeSponsored, sponsorTransaction } from "@/lib/enoki";
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
  HiOutlineWallet,
} from "react-icons/hi2";

const steps = ["Owner", "Identity", "Policy", "Create"] as const;
type OwnerSource = "wallet" | "passkey";
type ObjectChange = { type?: string; objectType?: string; objectId?: string };
type SubmitResult = {
  digest: string;
  effects?: { status?: { status?: string; error?: string } };
  objectChanges?: ObjectChange[];
};

export function CreateIWalletFlow() {
  const [step, setStep] = useState(0);
  const [name, setName] = useState("Operations iWallet");

  // Owner — either connected wallet OR passkey
  const account = useCurrentAccount();
  const { mutateAsync: signWithWallet } = useSignAndExecuteTransaction({
    execute: async ({ bytes, signature }) =>
      suiClient.executeTransactionBlock({
        transactionBlock: bytes,
        signature,
        options: { showObjectChanges: true, showEffects: true },
      }),
  });
  // sign-only (for the Enoki sponsored path — the backend executes)
  const { mutateAsync: signTx } = useSignTransaction();

  const [ownerSource, setOwnerSource] = useState<OwnerSource | null>(null);
  const [passkey, setPasskey] = useState<PasskeyKeypair | null>(null);
  const [passkeyAddress, setPasskeyAddress] = useState<string | null>(null);
  const [busyPasskey, setBusyPasskey] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const ownerAddress =
    ownerSource === "wallet" ? account?.address ?? null :
    ownerSource === "passkey" ? passkeyAddress : null;

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

  function pickWallet() {
    if (!account) return;
    setError(null);
    setOwnerSource("wallet");
  }

  async function pickPasskey() {
    setBusyPasskey(true);
    setError(null);
    try {
      const owner = await createPasskeyOwner();
      setPasskey(owner.keypair);
      setPasskeyAddress(owner.address);
      setOwnerSource("passkey");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Passkey creation failed");
    } finally {
      setBusyPasskey(false);
    }
  }

  function resetOwner() {
    setOwnerSource(null);
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

  // Direct path: the owner signs AND pays gas.
  async function submitDirect(tx: Transaction): Promise<SubmitResult> {
    if (ownerSource === "wallet") {
      const res = await signWithWallet({ transaction: tx });
      return res as unknown as SubmitResult;
    }
    if (ownerSource === "passkey" && passkey) {
      return (await suiClient.signAndExecuteTransaction({
        transaction: tx,
        signer: passkey,
        options: { showObjectChanges: true, showEffects: true },
      })) as unknown as SubmitResult;
    }
    throw new Error("No owner selected");
  }

  // Sponsored path: Enoki pays gas. Owner only signs. allowedMoveCallTargets
  // scopes what Enoki will sponsor.
  async function submitSponsored(
    tx: Transaction,
    allowedMoveCallTargets: string[],
  ): Promise<SubmitResult> {
    if (!ownerAddress) throw new Error("No owner");
    const kindBytes = await tx.build({ client: suiClient, onlyTransactionKind: true });
    const { bytes, digest } = await sponsorTransaction({
      transactionKindBytes: toBase64(kindBytes),
      sender: ownerAddress,
      allowedMoveCallTargets,
    });

    let signature: string;
    if (ownerSource === "wallet") {
      ({ signature } = await signTx({ transaction: bytes }));
    } else if (passkey) {
      ({ signature } = await passkey.signTransaction(fromBase64(bytes)));
    } else {
      throw new Error("No signer");
    }

    const exec = await executeSponsored(digest, signature);
    return (await suiClient.waitForTransaction({
      digest: exec.digest,
      options: { showObjectChanges: true, showEffects: true },
    })) as unknown as SubmitResult;
  }

  // Try sponsored (gasless) first; fall back to owner-pays-gas on any failure.
  async function submit(tx: Transaction, allowedMoveCallTargets: string[]): Promise<SubmitResult> {
    if (enokiConfigured()) {
      try {
        return await submitSponsored(tx, allowedMoveCallTargets);
      } catch (e) {
        console.warn("[create] sponsored failed, falling back to owner-pays-gas:", e);
      }
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
      const r1 = await submit(tx1, [
        "0x1::option::none",
        `${IWALLET_PACKAGE_ID}::prototype::create_iidentity`,
      ]);
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
      const r2 = await submit(tx2, [`${IWALLET_PACKAGE_ID}::prototype::set_policy`]);
      if (r2.effects?.status?.status !== "success") {
        throw new Error(r2.effects?.status?.error ?? "set_policy failed");
      }

      addLocalIdentityId(newId);
      setCreatedId(newId);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Create failed";
      if (/insufficient.*gas|GasBalance|no.*gas/i.test(msg)) {
        setError(
          ownerSource === "passkey"
            ? `Owner has no SUI. Send testnet SUI to ${ownerAddress} (the passkey address) and retry.`
            : `Wallet has no testnet SUI. Top it up and retry.`,
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

            {ownerSource ? (
              <div className="rounded-[1.25rem] border border-accent/20 bg-accent/5 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="inline-flex items-center gap-2 text-xs text-dim">
                      {ownerSource === "wallet" ? <HiOutlineWallet /> : <HiOutlineFingerPrint />}
                      Owner ({ownerSource})
                    </p>
                    <p className="mt-2"><HashText value={ownerAddress!} chars={16} /></p>
                  </div>
                  <button onClick={resetOwner} className="rounded-full border border-border px-3 py-1.5 text-xs text-ink hover:text-accent">
                    Switch
                  </button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={pickWallet}
                  disabled={!account}
                  className="flex flex-col items-start gap-2 rounded-[1.25rem] border border-border bg-canvas p-4 text-left transition hover:border-accent/40 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <span className="inline-flex items-center gap-2 text-sm font-medium text-ink">
                    <HiOutlineWallet className="text-accent" /> Connected wallet
                  </span>
                  <span className="text-xs text-muted">
                    {account ? <HashText value={account.address} chars={6} /> : "Connect from the navbar first"}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={pickPasskey}
                  disabled={busyPasskey}
                  className="flex flex-col items-start gap-2 rounded-[1.25rem] border border-border bg-canvas p-4 text-left transition hover:border-accent/40 disabled:opacity-50"
                >
                  <span className="inline-flex items-center gap-2 text-sm font-medium text-ink">
                    <HiOutlineFingerPrint className="text-accent" /> Passkey
                  </span>
                  <span className="text-xs text-muted">
                    {busyPasskey ? "Waiting for passkey…" : "Create a new passkey on this device"}
                  </span>
                </button>
              </div>
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
            <Summary label={`Owner (${ownerSource ?? "—"})`} value={ownerAddress ?? "—"} mono />
            <Summary label="Identity hash" value={identityHash ?? "—"} mono />
            <Summary label="Budget cap" value={`${budget} SUI`} />
            <Summary label="Expiry" value={`${expiryDays} day(s)`} />
            <Summary label="Allowed recipient" value={recipient || "—"} mono />

            {!createdId ? (
              <>
                <div className="rounded-[1.25rem] border border-accent/20 bg-accent/5 p-4 text-sm text-accent">
                  Approve with your {ownerSource === "wallet" ? "wallet" : "passkey"} to create the
                  iWallet on-chain.{" "}
                  {enokiConfigured() ? "Gas is sponsored — no SUI needed." : "A small gas fee applies."}
                </div>
                <button
                  onClick={onCreate}
                  disabled={submitting || !ownerSource}
                  data-hover-trigger
                  className="inline-flex w-fit items-center gap-2 rounded-full bg-accent px-8 py-4 text-sm font-semibold text-on-accent hover:bg-accent-soft disabled:opacity-40"
                >
                  {ownerSource === "wallet" ? <HiOutlineWallet /> : <HiOutlineFingerPrint />}
                  {submitting ? "Signing & submitting…" : "Create iWallet"}
                </button>
                {error && <p className="text-sm text-red-300">{error}</p>}
              </>
            ) : (
              <div className="rounded-[1.25rem] border border-emerald-300/30 bg-emerald-300/10 p-4">
                <p className="inline-flex items-center gap-2 text-sm font-medium text-emerald-200">
                  <HiOutlineCheckCircle /> iWallet created on-chain
                </p>
                <p className="mt-2 text-xs text-muted">
                  New IIdentity object: <HashText value={createdId} chars={10} />
                </p>
                <p className="mt-3 text-xs text-emerald-200/80">
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
