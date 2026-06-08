"use client";

import { useCallback, useEffect, useState } from "react";
import { useCurrentAccount, useSignAndExecuteTransaction } from "@mysten/dapp-kit";
import type { Transaction } from "@mysten/sui/transactions";
import { HashText } from "@/components/hash-text";
import { suiClient } from "@/lib/sui-client";
import {
  buildCreateBalanceManagerTx,
  buildDepositTx,
  buildLimitOrderTx,
  buildMarketOrderTx,
  buildWithdrawTx,
  fetchBalanceManagerIds,
  fetchManagerBalance,
  fetchMidPrice,
  type Pool,
} from "@/lib/deepbook";
import { HiOutlineBanknotes, HiOutlineWallet } from "react-icons/hi2";

type Side = "buy" | "sell";
type OrderType = "limit" | "market";

export function TradePanel({ pool, onChange }: { pool: Pool; onChange?: () => void }) {
  const account = useCurrentAccount();
  const { mutateAsync: signAndExecute } = useSignAndExecuteTransaction({
    execute: async ({ bytes, signature }) =>
      suiClient.executeTransactionBlock({
        transactionBlock: bytes,
        signature,
        options: { showEffects: true, showObjectChanges: true },
      }),
  });

  const [bmId, setBmId] = useState<string | null>(null);
  const [baseBal, setBaseBal] = useState(0);
  const [quoteBal, setQuoteBal] = useState(0);

  const [side, setSide] = useState<Side>("buy");
  const [orderType, setOrderType] = useState<OrderType>("limit");
  const [price, setPrice] = useState("");
  const [amount, setAmount] = useState("");
  const [depositAmt, setDepositAmt] = useState("");
  const [depositCoin, setDepositCoin] = useState<string>(pool.base);

  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  const refreshBm = useCallback(async () => {
    if (!account) return;
    const ids = await fetchBalanceManagerIds(account.address);
    setBmId(ids[0] ?? null);
  }, [account]);

  const refreshBalances = useCallback(async () => {
    if (!bmId) return;
    const [b, q] = await Promise.all([
      fetchManagerBalance(bmId, pool.base),
      fetchManagerBalance(bmId, pool.quote),
    ]);
    setBaseBal(b);
    setQuoteBal(q);
  }, [bmId, pool.base, pool.quote]);

  useEffect(() => {
    refreshBm();
  }, [refreshBm]);
  useEffect(() => {
    refreshBalances();
  }, [refreshBalances]);
  useEffect(() => {
    setDepositCoin(pool.base);
  }, [pool.base]);

  async function submit(tx: Transaction, okText: string) {
    setBusy(true);
    setMsg(null);
    try {
      const res = await signAndExecute({ transaction: tx });
      const status = (res as { effects?: { status?: { status?: string; error?: string } } }).effects
        ?.status;
      if (status?.status !== "success") throw new Error(status?.error ?? "transaction failed");
      setMsg({ kind: "ok", text: `${okText} — ${res.digest.slice(0, 10)}…` });
      await refreshBm();
      await refreshBalances();
      onChange?.();
    } catch (e) {
      setMsg({ kind: "err", text: e instanceof Error ? e.message : "failed" });
    } finally {
      setBusy(false);
    }
  }

  async function useMid() {
    const m = await fetchMidPrice(pool.key);
    if (m != null) setPrice(String(m));
  }

  if (!account) {
    return (
      <Card>
        <Empty icon={<HiOutlineWallet />} title="Connect a wallet to trade" hint="Use the navbar to connect, then create a BalanceManager." />
      </Card>
    );
  }

  if (!bmId) {
    return (
      <Card>
        <Empty
          icon={<HiOutlineBanknotes />}
          title="No BalanceManager yet"
          hint="DeepBook trades from a BalanceManager — your on-chain trading account."
        />
        <button
          disabled={busy}
          onClick={() => submit(buildCreateBalanceManagerTx(account.address), "BalanceManager created")}
          className="mt-4 w-full rounded-xl bg-[#298dff] py-3 text-sm font-semibold text-[#131416] hover:bg-[#5aa9ff] disabled:opacity-40"
        >
          {busy ? "Creating…" : "Create BalanceManager"}
        </button>
        {msg && <Msg msg={msg} />}
      </Card>
    );
  }

  const num = (s: string) => Number(s) || 0;
  const isBid = side === "buy";

  function placeOrder() {
    if (orderType === "limit") {
      if (num(price) <= 0 || num(amount) <= 0) {
        setMsg({ kind: "err", text: "Enter price and amount" });
        return;
      }
      submit(
        buildLimitOrderTx(account!.address, bmId!, {
          poolKey: pool.key,
          price: num(price),
          quantity: num(amount),
          isBid,
        }),
        `${side.toUpperCase()} limit placed`,
      );
    } else {
      if (num(amount) <= 0) {
        setMsg({ kind: "err", text: "Enter amount" });
        return;
      }
      submit(
        buildMarketOrderTx(account!.address, bmId!, {
          poolKey: pool.key,
          quantity: num(amount),
          isBid,
        }),
        `${side.toUpperCase()} market sent`,
      );
    }
  }

  return (
    <Card>
      {/* BalanceManager funds */}
      <div className="rounded-[1.25rem] border border-white/10 p-4">
        <div className="flex items-center justify-between">
          <p className="text-xs uppercase tracking-[0.14em] text-[#6f747a]">BalanceManager</p>
          <HashText value={bmId} chars={5} />
        </div>
        <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
          <Bal label={pool.base} value={baseBal} />
          <Bal label={pool.quote} value={quoteBal} />
        </div>
        <div className="mt-3 flex gap-2">
          <select
            value={depositCoin}
            onChange={(e) => setDepositCoin(e.target.value)}
            className="rounded-lg border border-white/10 bg-[#101113] px-2 py-1.5 text-xs text-[#e5eef1] outline-none"
          >
            <option value={pool.base}>{pool.base}</option>
            <option value={pool.quote}>{pool.quote}</option>
          </select>
          <input
            value={depositAmt}
            onChange={(e) => setDepositAmt(e.target.value)}
            inputMode="decimal"
            placeholder="0.0"
            className="w-full rounded-lg border border-white/10 bg-[#101113] px-3 py-1.5 text-xs text-[#e5eef1] outline-none focus:border-[#298dff]/40"
          />
          <button
            disabled={busy}
            onClick={() => submit(buildDepositTx(account.address, bmId, depositCoin, num(depositAmt)), "Deposited")}
            className="rounded-lg border border-white/10 px-3 py-1.5 text-xs font-medium text-[#e5eef1] hover:border-[#298dff]/40 disabled:opacity-40"
          >
            Deposit
          </button>
          <button
            disabled={busy}
            onClick={() => submit(buildWithdrawTx(account.address, bmId, depositCoin, num(depositAmt)), "Withdrew")}
            className="rounded-lg border border-white/10 px-3 py-1.5 text-xs font-medium text-[#e5eef1] hover:border-[#298dff]/40 disabled:opacity-40"
          >
            Withdraw
          </button>
        </div>
      </div>

      {/* Order entry */}
      <div className="mt-4 grid grid-cols-2 gap-2">
        <button
          onClick={() => setSide("buy")}
          className={`rounded-xl py-2.5 text-sm font-semibold transition ${side === "buy" ? "bg-emerald-400/20 text-emerald-200" : "border border-white/10 text-[#92979d]"}`}
        >
          Buy {pool.base}
        </button>
        <button
          onClick={() => setSide("sell")}
          className={`rounded-xl py-2.5 text-sm font-semibold transition ${side === "sell" ? "bg-red-400/20 text-red-200" : "border border-white/10 text-[#92979d]"}`}
        >
          Sell {pool.base}
        </button>
      </div>

      <div className="mt-3 flex gap-3 text-xs">
        {(["limit", "market"] as OrderType[]).map((t) => (
          <button
            key={t}
            onClick={() => setOrderType(t)}
            className={`uppercase tracking-[0.1em] ${orderType === t ? "text-[#298dff]" : "text-[#6f747a] hover:text-[#e5eef1]"}`}
          >
            {t}
          </button>
        ))}
      </div>

      {orderType === "limit" && (
        <Field label={`Price (${pool.quote})`} action={<button onClick={useMid} className="text-[10px] text-[#298dff] hover:underline">MID</button>}>
          <input
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            inputMode="decimal"
            placeholder="0.0"
            className="w-full bg-transparent text-right font-mono text-sm text-[#e5eef1] outline-none"
          />
        </Field>
      )}

      <Field label={`Amount (${pool.base})`}>
        <input
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          inputMode="decimal"
          placeholder="0.0"
          className="w-full bg-transparent text-right font-mono text-sm text-[#e5eef1] outline-none"
        />
      </Field>

      <button
        disabled={busy}
        onClick={placeOrder}
        className={`mt-4 w-full rounded-xl py-3 text-sm font-semibold disabled:opacity-40 ${side === "buy" ? "bg-emerald-400 text-[#06281c] hover:bg-emerald-300" : "bg-red-400 text-[#2a0b0b] hover:bg-red-300"}`}
      >
        {busy ? "Submitting…" : `${side === "buy" ? "Buy" : "Sell"} ${pool.base}`}
      </button>

      <p className="mt-2 text-center text-[11px] text-[#6f747a]">
        Pays fees in the input token (no DEEP required).
      </p>
      {msg && <Msg msg={msg} />}
    </Card>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return <div className="rounded-[1.6rem] border border-white/10 bg-[#131416] p-4">{children}</div>;
}

function Empty({ icon, title, hint }: { icon: React.ReactNode; title: string; hint: string }) {
  return (
    <div className="py-6 text-center">
      <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-[#222328] text-2xl text-[#298dff]">
        {icon}
      </span>
      <p className="mt-3 text-sm font-medium text-[#e5eef1]">{title}</p>
      <p className="mt-1 text-xs text-[#92979d]">{hint}</p>
    </div>
  );
}

function Bal({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg bg-[#101113] px-3 py-2">
      <p className="text-[11px] text-[#6f747a]">{label}</p>
      <p className="font-mono text-sm text-[#e5eef1]">{value.toLocaleString()}</p>
    </div>
  );
}

function Field({
  label,
  action,
  children,
}: {
  label: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="mt-3 rounded-xl border border-white/10 bg-[#101113] px-3 py-2.5">
      <div className="flex items-center justify-between">
        <span className="text-[11px] text-[#6f747a]">{label}</span>
        {action}
      </div>
      <div className="mt-1">{children}</div>
    </div>
  );
}

function Msg({ msg }: { msg: { kind: "ok" | "err"; text: string } }) {
  return (
    <p className={`mt-3 text-xs ${msg.kind === "ok" ? "text-emerald-300" : "text-red-300"}`}>
      {msg.text}
    </p>
  );
}
