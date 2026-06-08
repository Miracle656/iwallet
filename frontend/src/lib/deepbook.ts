/**
 * Browser DeepBook v3 layer for the trading terminal.
 *
 * Reads (order book, mid price, balances, open orders) run straight from the
 * Sui JSON-RPC client — no wallet needed. Writes return a `Transaction` for the
 * connected wallet to sign via dapp-kit's useSignAndExecuteTransaction.
 */

import { DeepBookClient } from "@mysten/deepbook-v3";
import { Transaction } from "@mysten/sui/transactions";
import { suiClient } from "./sui-client";
import { SUI_NETWORK } from "./sui-config";

const ZERO = "0x0000000000000000000000000000000000000000000000000000000000000000";
const MANAGER_KEY = "TERMINAL_BM";

export type Pool = { key: string; base: string; quote: string; label: string };

/** Curated testnet pools (keys must match the SDK's constants). */
export const POOLS: Pool[] = [
  { key: "SUI_DBUSDC", base: "SUI", quote: "DBUSDC", label: "SUI / DBUSDC" },
  { key: "DEEP_SUI", base: "DEEP", quote: "SUI", label: "DEEP / SUI" },
  { key: "DEEP_DBUSDC", base: "DEEP", quote: "DBUSDC", label: "DEEP / DBUSDC" },
  { key: "DBUSDT_DBUSDC", base: "DBUSDT", quote: "DBUSDC", label: "DBUSDT / DBUSDC" },
  { key: "WAL_DBUSDC", base: "WAL", quote: "DBUSDC", label: "WAL / DBUSDC" },
];

export function poolByKey(key: string): Pool {
  return POOLS.find((p) => p.key === key) ?? POOLS[0];
}

/** Build a DeepBookClient. Pass the connected address + BM id for writes. */
function db(address: string = ZERO, balanceManagerId?: string): DeepBookClient {
  return new DeepBookClient({
    address,
    network: SUI_NETWORK,
    client: suiClient,
    balanceManagers: balanceManagerId
      ? { [MANAGER_KEY]: { address: balanceManagerId } }
      : undefined,
  });
}

// ── Reads ──

export type OrderBook = {
  bids: { price: number; quantity: number }[];
  asks: { price: number; quantity: number }[];
};

export async function fetchMidPrice(poolKey: string): Promise<number | null> {
  try {
    return await db().midPrice(poolKey);
  } catch {
    return null;
  }
}

export async function fetchOrderBook(poolKey: string, ticks = 10): Promise<OrderBook> {
  try {
    const r = (await db().getLevel2TicksFromMid(poolKey, ticks)) as {
      bid_prices: number[];
      bid_quantities: number[];
      ask_prices: number[];
      ask_quantities: number[];
    };
    const bids = r.bid_prices.map((price, i) => ({ price, quantity: r.bid_quantities[i] ?? 0 }));
    const asks = r.ask_prices.map((price, i) => ({ price, quantity: r.ask_quantities[i] ?? 0 }));
    return { bids, asks };
  } catch {
    return { bids: [], asks: [] };
  }
}

/** BalanceManager object ids owned by an address (empty if none yet). */
export async function fetchBalanceManagerIds(owner: string): Promise<string[]> {
  try {
    const res = (await db(owner).getBalanceManagerIds(owner)) as unknown;
    if (Array.isArray(res)) return res as string[];
    return [];
  } catch {
    return [];
  }
}

export async function fetchManagerBalance(
  balanceManagerId: string,
  coinKey: string,
): Promise<number> {
  try {
    const r = (await db(ZERO, balanceManagerId).checkManagerBalance(MANAGER_KEY, coinKey)) as {
      balance?: number;
    };
    return Number(r?.balance ?? 0);
  } catch {
    return 0;
  }
}

export type OpenOrder = { orderId: string };

export async function fetchOpenOrders(
  poolKey: string,
  balanceManagerId: string,
): Promise<OpenOrder[]> {
  try {
    const ids = (await db(ZERO, balanceManagerId).accountOpenOrders(poolKey, MANAGER_KEY)) as
      | string[]
      | bigint[];
    return (ids ?? []).map((id) => ({ orderId: String(id) }));
  } catch {
    return [];
  }
}

// ── Writes (return a Transaction for the wallet to sign) ──

export function buildCreateBalanceManagerTx(address: string): Transaction {
  const tx = new Transaction();
  tx.add(db(address).balanceManager.createAndShareBalanceManager());
  return tx;
}

export function buildDepositTx(
  address: string,
  balanceManagerId: string,
  coinKey: string,
  amount: number,
): Transaction {
  const tx = new Transaction();
  tx.add(db(address, balanceManagerId).balanceManager.depositIntoManager(MANAGER_KEY, coinKey, amount));
  return tx;
}

export function buildWithdrawTx(
  address: string,
  balanceManagerId: string,
  coinKey: string,
  amount: number,
): Transaction {
  const tx = new Transaction();
  tx.add(
    db(address, balanceManagerId).balanceManager.withdrawFromManager(
      MANAGER_KEY,
      coinKey,
      amount,
      address,
    ),
  );
  return tx;
}

export type LimitOrderInput = {
  poolKey: string;
  price: number;
  quantity: number;
  isBid: boolean;
  payWithDeep?: boolean;
};

export function buildLimitOrderTx(
  address: string,
  balanceManagerId: string,
  o: LimitOrderInput,
): Transaction {
  const tx = new Transaction();
  tx.add(
    db(address, balanceManagerId).deepBook.placeLimitOrder({
      poolKey: o.poolKey,
      balanceManagerKey: MANAGER_KEY,
      clientOrderId: String(Date.now()),
      price: o.price,
      quantity: o.quantity,
      isBid: o.isBid,
      payWithDeep: o.payWithDeep ?? false,
    }),
  );
  return tx;
}

export function buildMarketOrderTx(
  address: string,
  balanceManagerId: string,
  o: { poolKey: string; quantity: number; isBid: boolean; payWithDeep?: boolean },
): Transaction {
  const tx = new Transaction();
  tx.add(
    db(address, balanceManagerId).deepBook.placeMarketOrder({
      poolKey: o.poolKey,
      balanceManagerKey: MANAGER_KEY,
      clientOrderId: String(Date.now()),
      quantity: o.quantity,
      isBid: o.isBid,
      payWithDeep: o.payWithDeep ?? false,
    }),
  );
  return tx;
}

export function buildCancelOrderTx(
  address: string,
  balanceManagerId: string,
  poolKey: string,
  orderId: string,
): Transaction {
  const tx = new Transaction();
  tx.add(db(address, balanceManagerId).deepBook.cancelOrder(poolKey, MANAGER_KEY, orderId));
  return tx;
}
