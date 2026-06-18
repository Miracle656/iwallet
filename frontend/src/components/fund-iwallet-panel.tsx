"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useCurrentAccount, useSignAndExecuteTransaction } from "@mysten/dapp-kit";
import { Transaction } from "@mysten/sui/transactions";
import { toBase64 } from "@mysten/sui/utils";
import { HashText } from "@/components/hash-text";
import { getProfile, suiClient, type IdentityProfile } from "@/lib/sui-client";
import { recoverPasskeyOwner } from "@/lib/passkey";
import { usePasskeyOwner } from "@/lib/use-passkey-owner";
import { getZkLoginAddress, signWithZkLogin } from "@/lib/zklogin";
import { SUI_NETWORK } from "@/lib/sui-config";
import {
  HiOutlineArrowRight,
  HiOutlineBanknotes,
  HiOutlineGlobeAlt,
  HiOutlineWallet,
} from "react-icons/hi2";

/**
 * Real funding: a normal SUI transfer from the connected wallet (or passkey)
 * straight to the iWallet's object address (George's transfer-to-object model).
 * No CLI — the user enters an amount and signs.
 */
export function FundIWalletPanel({ id }: { id: string }) {
  const account = useCurrentAccount();
  const passkey = usePasskeyOwner();
  const [zkAddress, setZkAddress] = useState<string | null>(null);
  useEffect(() => { setZkAddress(getZkLoginAddress()); }, []);
  const funder = account?.address ?? passkey ?? zkAddress ?? null;

  const { mutateAsync: signWithWallet } = useSignAndExecuteTransaction({
    execute: async ({ bytes, signature }) =>
      suiClient.executeTransactionBlock({
        transactionBlock: bytes,
        signature,
        options: { showEffects: true },
      }),
  });

  const [profile, setProfile] = useState<IdentityProfile | null>(null);
  const [amount, setAmount] = useState("1");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string; digest?: string } | null>(null);

  const reload = useCallback(() => {
    getProfile(id).then(setProfile).catch(() => setProfile(null));
  }, [id]);
  useEffect(() => {
    reload();
  }, [reload]);

  const suiAtWallet = profile?.coins.find((c) => c.coinType === "0x2::sui::SUI")?.amount ?? "0";

  async function fund() {
    const amt = Number(amount);
    if (!(amt > 0)) {
      setMsg({ kind: "err", text: "Enter an amount greater than 0" });
      return;
    }
    if (!funder) {
      setMsg({ kind: "err", text: "Connect a wallet or passkey to fund" });
      return;
    }
    setBusy(true);
    setMsg(null);
    try {
      const mist = BigInt(Math.floor(amt * 1e9));
      const tx = new Transaction();
      const [coin] = tx.splitCoins(tx.gas, [mist]);
      tx.transferObjects([coin], id); // transfer-to-object: fund the iWallet

      let res: { digest: string; effects?: { status?: { status?: string; error?: string } } };
      if (account) {
        res = (await signWithWallet({ transaction: tx })) as typeof res;
      } else if (zkAddress) {
        tx.setSenderIfNotSet(zkAddress);
        const txBytes = await tx.build({ client: suiClient });
        const signature = await signWithZkLogin(txBytes);
        res = (await suiClient.executeTransactionBlock({
          transactionBlock: toBase64(txBytes),
          signature,
          options: { showEffects: true },
        })) as typeof res;
      } else {
        const { keypair } = await recoverPasskeyOwner();
        res = (await suiClient.signAndExecuteTransaction({
          transaction: tx,
          signer: keypair,
          options: { showEffects: true },
        })) as typeof res;
      }
      if (res.effects?.status?.status !== "success") {
        throw new Error(res.effects?.status?.error ?? "transfer failed");
      }
      setMsg({ kind: "ok", text: `Funded ${amt} SUI`, digest: res.digest });
      reload();
    } catch (e) {
      const text = e instanceof Error ? e.message : "Fund failed";
      setMsg({
        kind: "err",
        text: /insufficient|GasBalance|no.*coin/i.test(text)
          ? "Not enough SUI in the funding wallet."
          : text,
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-[2.4rem] border border-border bg-surface p-5 sm:p-7">
      <div className="flex items-baseline gap-5">
        <span className="inline-flex items-center gap-2 text-2xl font-semibold text-ink">
          <HiOutlineBanknotes className="text-accent" />
          Fund
        </span>
        <Link href={`/iwallets/${id}`} className="text-2xl text-dim hover:text-accent transition-colors">
          {profile?.name ?? "iWallet"}
        </Link>
      </div>

      <div className="mt-7 flex flex-col gap-3 lg:flex-row">
        <div className="w-full rounded-[1.9rem] border border-border p-5 lg:flex-1">
          <div className="flex items-center justify-between gap-3">
            <span className="inline-flex items-center gap-2 text-sm text-muted">
              <HiOutlineWallet className="text-accent" />From
            </span>
            <span className="rounded-full bg-elevated px-4 py-2 font-mono text-xs text-ink">
              {funder ? <HashText value={funder} chars={6} /> : "Not connected"}
            </span>
          </div>
          <div className="mt-8 flex gap-5">
            <Field label="Token" value="SUI" />
            <Field label="Network" value="Sui Testnet" />
          </div>
        </div>

        <div className="w-full rounded-[1.9rem] border border-border p-5 lg:flex-1">
          <div className="flex items-center justify-between gap-3">
            <span className="inline-flex items-center gap-2 text-sm text-muted">
              <HiOutlineGlobeAlt className="text-accent" />To
            </span>
            <span className="rounded-full bg-elevated px-4 py-2 font-mono text-xs text-ink">
              <HashText value={id} chars={6} />
            </span>
          </div>
          <div className="mt-8 flex gap-5">
            <Field label="iWallet balance" value={`${suiAtWallet} SUI`} />
            <Field label="Staged" value={`${profile?.stagedBalanceSui ?? 0} SUI`} />
          </div>
        </div>
      </div>

      <div className="mt-3 rounded-[1.9rem] border border-border p-5">
        <div className="flex items-center justify-between text-sm">
          <span className="text-ink">Amount</span>
          <span className="text-muted">SUI</span>
        </div>
        <input
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          inputMode="decimal"
          className="mt-6 w-full bg-transparent text-right text-6xl font-light tracking-[-0.06em] text-ink outline-none"
        />
        <p className="mt-3 text-right text-sm text-muted">SUI added to controlled agent spending</p>
      </div>

      <div className="mt-7 flex flex-col items-end gap-3">
        <button
          onClick={fund}
          disabled={busy || !funder}
          className="inline-flex items-center gap-2 rounded-full bg-accent px-8 py-4 text-sm font-semibold text-on-accent transition hover:bg-accent-soft disabled:opacity-40"
        >
          {busy ? "Funding…" : "Fund iWallet"} <HiOutlineArrowRight />
        </button>
        {msg && (
          <p className={`text-sm ${msg.kind === "ok" ? "text-emerald-300" : "text-red-300"}`}>
            {msg.text}
            {msg.digest && (
              <>
                {" — "}
                <a
                  href={`https://suiscan.xyz/${SUI_NETWORK}/tx/${msg.digest}`}
                  target="_blank"
                  rel="noreferrer"
                  className="font-mono text-accent hover:underline"
                >
                  {msg.digest.slice(0, 10)}…
                </a>
              </>
            )}
          </p>
        )}
      </div>
    </section>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-sm text-dim">{label}</p>
      <p className="mt-3 text-lg text-ink">{value}</p>
    </div>
  );
}
