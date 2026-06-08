import 'dotenv/config';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { DeepBookTrader, type Network } from './deepbook.js';
import { VaultWithdrawer } from './vault.js';
import { rememberBet, recallContext } from './memwal.js';
import { postTrade } from './report.js';

/**
 * Autonomous DeepBook trade tick (Sui Overflow Sub-track 2).
 *
 * The full self-driving loop, end to end:
 *   1. Recall the agent's own trade history from Walrus (MemWal).
 *   2. Read the live mid price for the pool.
 *   3. Decide a resting limit order within the on-chain budget.
 *   4. withdraw_with_proof — policy-gated extraction from the iWallet vault
 *      (budget ceiling + DeepBook-only recipient enforced on-chain; emits
 *      AgentExecutionEvent = the on-chain activity log).
 *   5. Deposit into the BalanceManager + place the real DeepBook order.
 *   6. Remember the trade so the next tick reasons with its track record.
 *
 * No human signature anywhere in the loop — that's the whole point of the
 * sub-track. Owner revocation (npm run revoke) kills step 4 at the contract.
 *
 * Strategy v1 is deliberately simple + safe: a resting ASK above mid (sell
 * base), so it demonstrates a real, cancellable order without crossing the
 * book. Tune via env: TRADE_SIDE, TRADE_QTY, TRADE_PRICE, TRADE_OFFSET_PCT.
 */

const POOL_KEY = process.env.DEEPBOOK_POOL_KEY ?? 'SUI_DBUSDC';
// Base-asset coin key for the deposit. SUI_DBUSDC's base is SUI.
const BASE_COIN_KEY = process.env.DEEPBOOK_BASE_COIN_KEY ?? 'SUI';

export type TradeTickResult = {
  ts: number;
  midPrice: number | null;
  side: 'ask' | 'bid';
  price: number;
  quantity: number;
  withdrawDigest?: string;
  orderDigest?: string;
  notes: string[];
  memoriesUsed: string[];
};

function envNum(name: string, fallback: number): number {
  const v = process.env[name];
  const n = v == null ? NaN : Number(v);
  return Number.isFinite(n) ? n : fallback;
}

export async function runTradeTick(): Promise<TradeTickResult> {
  const result: TradeTickResult = {
    ts: Date.now(),
    midPrice: null,
    side: process.env.TRADE_SIDE === 'bid' ? 'bid' : 'ask',
    price: 0,
    quantity: envNum('TRADE_QTY', 1),
    notes: [],
    memoriesUsed: [],
  };

  const pk = process.env.SUI_PRIVATE_KEY;
  if (!pk) throw new Error('Need SUI_PRIVATE_KEY in env');
  const bmId = process.env.BALANCE_MANAGER_ID;
  if (!bmId) throw new Error('Need BALANCE_MANAGER_ID (run setup:deepbook first)');

  const signer = Ed25519Keypair.fromSecretKey(pk);
  const network = (process.env.SUI_NETWORK ?? 'testnet') as Network;

  // 1. Recall prior trades (persistent agent memory on Walrus).
  result.memoriesUsed = await recallContext(
    `recent ${POOL_KEY} orders, fills, and strategy lessons`,
  );

  const trader = new DeepBookTrader({ signer, network, poolKey: POOL_KEY, balanceManagerId: bmId });

  // 2. Read mid price (best-effort — fall back to a fixed resting price).
  let mid: number | null = null;
  try {
    mid = await trader.midPrice();
    result.midPrice = mid;
  } catch (e) {
    result.notes.push(`midPrice read failed: ${e instanceof Error ? e.message : e}`);
  }

  // 3. Decide the order. ASK rests above mid; BID rests below.
  const isBid = result.side === 'bid';
  const offset = envNum('TRADE_OFFSET_PCT', 50) / 100; // default +50% -> rests, won't fill
  const fixedPrice = envNum('TRADE_PRICE', 100); // spike-proven resting price when mid is unknown
  result.price =
    process.env.TRADE_PRICE != null || mid == null
      ? fixedPrice
      : Number((mid * (isBid ? 1 - offset : 1 + offset)).toFixed(6));

  // 4. Policy-gated withdrawal from the iWallet vault. The released coin (the
  //    order's base size) lands in the agent wallet; recipient = the whitelisted
  //    BalanceManager so the spend is bound to DeepBook on-chain.
  // Deposit a buffer above the order size: placing an ask locks the base
  // amount + fees, so the BalanceManager needs more than `quantity` or DeepBook
  // aborts EBalanceManagerBalanceTooLow (code 3). We withdraw the full deposit
  // from the vault so the trade stays fully vault-funded.
  const depositBuffer = envNum('TRADE_DEPOSIT_BUFFER', 0.3);
  const depositAmount = result.quantity + depositBuffer;
  const amountMist = BigInt(Math.ceil(depositAmount * 1e9));
  const owner = signer.toSuiAddress();
  const identityId = process.env.IIDENTITY_OBJECT_ID ?? '';
  const rationale = `Autonomous resting ${result.side} within on-chain budget; mid=${mid ?? 'n/a'}.`;

  const vault = new VaultWithdrawer(signer, network);
  const wd = await vault.withdraw(amountMist, bmId);
  result.withdrawDigest = wd.digest;
  if (wd.status !== 'success') {
    result.notes.push(`withdraw_with_proof failed (${wd.status}): ${wd.error ?? 'unknown'}`);
    // Surface the policy rejection (budget/expiry/recipient/revoked) in the feed.
    await postTrade({
      identityId, owner, pool: POOL_KEY, side: result.side,
      price: result.price, quantity: result.quantity, amountMist: amountMist.toString(),
      midPrice: mid, withdrawDigest: wd.digest, status: 'rejected',
      reason: wd.error ?? wd.status, rationale, memoriesUsed: result.memoriesUsed.length,
    });
    return result; // policy rejected — stop the tick
  }

  // 5. Deposit + place the real DeepBook order.
  const placed = await trader.depositAndPlaceLimitOrder({
    coinKey: BASE_COIN_KEY,
    depositAmount,
    price: result.price,
    quantity: result.quantity,
    isBid,
    payWithDeep: false,
  });
  result.orderDigest = placed.digest;
  if (placed.status !== 'success') {
    result.notes.push(`DeepBook order failed (${placed.status}): ${placed.error ?? 'unknown'}`);
    await postTrade({
      identityId, owner, pool: POOL_KEY, side: result.side,
      price: result.price, quantity: result.quantity, amountMist: amountMist.toString(),
      midPrice: mid, withdrawDigest: wd.digest, orderDigest: placed.digest,
      status: 'failed', reason: placed.error ?? placed.status, rationale,
      memoriesUsed: result.memoriesUsed.length,
    });
    return result;
  }

  // 6. Remember the trade (reuses the MemWal bet-memory shape).
  await rememberBet({
    sport: 'deepbook',
    home: POOL_KEY,
    away: result.side.toUpperCase(),
    outcome: result.side,
    odds: result.price,
    stake: result.quantity,
    rationale,
    digest: placed.digest,
    marketId: bmId,
  });

  // Push the successful trade to the dashboard feed.
  await postTrade({
    identityId, owner, pool: POOL_KEY, side: result.side,
    price: result.price, quantity: result.quantity, amountMist: amountMist.toString(),
    midPrice: mid, withdrawDigest: wd.digest, orderDigest: placed.digest,
    status: 'success', rationale, memoriesUsed: result.memoriesUsed.length,
  });

  return result;
}

async function main(): Promise<void> {
  const r = await runTradeTick();
  console.log(`[trade] pool=${POOL_KEY} mid=${r.midPrice ?? 'n/a'} ${r.side} ${r.quantity} @ ${r.price}`);
  if (r.memoriesUsed.length) console.log(`[trade] recalled ${r.memoriesUsed.length} memories`);
  if (r.withdrawDigest) console.log(`[trade] withdraw_with_proof tx: ${r.withdrawDigest}`);
  if (r.orderDigest) {
    console.log(`[trade] DeepBook order tx: ${r.orderDigest}`);
    console.log(`        https://suiscan.xyz/testnet/tx/${r.orderDigest}`);
  }
  for (const n of r.notes) console.log(`[trade] note: ${n}`);
}

if (process.argv[1]?.endsWith('trade.ts') || process.argv[1]?.endsWith('trade.js')) {
  main().catch((err) => {
    console.error('[trade] fatal:', err instanceof Error ? (err.stack ?? err.message) : err);
    process.exit(1);
  });
}
