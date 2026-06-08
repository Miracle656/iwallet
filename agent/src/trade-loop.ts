import 'dotenv/config';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { DeepBookTrader, type Network } from './deepbook.js';
import { VaultWithdrawer } from './vault.js';
import { recallContext } from './memwal.js';
import { postTrade } from './report.js';

/**
 * Continuous autonomous DeepBook agent (Sub-track 2).
 *
 * The sustainable model: the policy budget caps how much the agent can pull
 * from the iWallet vault into its BalanceManager. Each tick:
 *   1. If the BalanceManager is low on base, top it up from the vault via
 *      withdraw_with_proof (policy-gated — budget/expiry/recipient/revocation).
 *   2. Cancel stale orders and place a fresh resting order using funds already
 *      in the BalanceManager — free DeepBook trading, no budget spent.
 *
 * So it trades forever within whatever the policy allowed; revocation just
 * stops further top-ups. Each agent is distinguished by AGENT_NAME + its own
 * iWallet / witness / BalanceManager / pool / memory namespace, so two configs
 * = two visibly different agents in the feed.
 *
 * Run:  AGENT_NAME="Maker-1" TRADE_INTERVAL_MS=20000 npm run trade:loop
 */

const POOL_KEY = process.env.DEEPBOOK_POOL_KEY ?? 'SUI_DBUSDC';
const BASE_COIN_KEY = process.env.DEEPBOOK_BASE_COIN_KEY ?? 'SUI';
const AGENT_NAME = process.env.AGENT_NAME ?? 'iWallet-Agent';

function envNum(name: string, fallback: number): number {
  const v = process.env[name];
  const n = v == null ? NaN : Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

async function tick(
  trader: DeepBookTrader,
  vault: VaultWithdrawer,
  owner: string,
  identityId: string,
  bmId: string,
): Promise<void> {
  const side = process.env.TRADE_SIDE === 'bid' ? 'bid' : 'ask';
  const isBid = side === 'bid';
  const qty = envNum('TRADE_QTY', 1);
  const offset = envNum('TRADE_OFFSET_PCT', 50) / 100;
  const buffer = envNum('TRADE_DEPOSIT_BUFFER', 0.3);

  const memoriesUsed = (await recallContext(`recent ${POOL_KEY} ${side} orders`)).length;

  let mid: number | null = null;
  try {
    mid = await trader.midPrice();
  } catch {
    /* ignore — fall back to a fixed resting price */
  }
  const price =
    process.env.TRADE_PRICE != null || mid == null
      ? envNum('TRADE_PRICE', 100)
      : Number((mid * (isBid ? 1 - offset : 1 + offset)).toFixed(6));

  const rationale = `${AGENT_NAME}: resting ${side} ${qty} @ ${price} (mid ${mid ?? 'n/a'}).`;
  const base = {
    identityId,
    agentName: AGENT_NAME,
    owner,
    pool: POOL_KEY,
    side: side as 'ask' | 'bid',
    price,
    quantity: qty,
    midPrice: mid,
    rationale,
    memoriesUsed,
  };

  // 1. Top up the BalanceManager from the vault only if it's low (ask side
  //    sells base, so we need base in the manager). Policy-gated.
  const need = qty + buffer;
  const have = await trader.managerBalanceNum(BASE_COIN_KEY);
  if (have < need) {
    const topUp = need - have;
    const amountMist = BigInt(Math.ceil(topUp * 1e9));
    const wd = await vault.withdraw(amountMist, bmId);
    if (wd.status !== 'success') {
      // Budget exhausted / expired / revoked — surface it and skip this tick.
      console.log(`[loop] ${AGENT_NAME} top-up rejected: ${wd.error ?? wd.status}`);
      await postTrade({ ...base, withdrawDigest: wd.digest, status: 'rejected', reason: wd.error ?? wd.status });
      return;
    }
    const dep = await trader.deposit(BASE_COIN_KEY, topUp);
    if (dep.status !== 'success') {
      await postTrade({ ...base, withdrawDigest: wd.digest, status: 'failed', reason: dep.error ?? 'deposit failed' });
      return;
    }
    base.rationale = `${rationale} (topped up ${topUp.toFixed(3)} ${BASE_COIN_KEY} from vault)`;
  }

  // 2. Cancel stale orders, place a fresh one within the BalanceManager.
  try {
    await trader.cancelAll();
  } catch {
    /* no open orders — fine */
  }
  const placed = await trader.placeLimitOrder({ price, quantity: qty, isBid });
  if (placed.status !== 'success') {
    console.log(`[loop] ${AGENT_NAME} order failed: ${placed.error}`);
    await postTrade({ ...base, orderDigest: placed.digest, status: 'failed', reason: placed.error ?? 'order failed' });
    return;
  }
  console.log(`[loop] ${AGENT_NAME} ${side} ${qty} @ ${price} -> ${placed.digest}`);
  await postTrade({ ...base, orderDigest: placed.digest, status: 'success' });
}

async function main(): Promise<void> {
  const pk = process.env.SUI_PRIVATE_KEY;
  const bmId = process.env.BALANCE_MANAGER_ID;
  const identityId = process.env.IIDENTITY_OBJECT_ID;
  if (!pk || !bmId || !identityId) {
    throw new Error('Need SUI_PRIVATE_KEY, BALANCE_MANAGER_ID, IIDENTITY_OBJECT_ID in env');
  }
  const signer = Ed25519Keypair.fromSecretKey(pk);
  const network = (process.env.SUI_NETWORK ?? 'testnet') as Network;
  const owner = signer.toSuiAddress();
  const interval = envNum('TRADE_INTERVAL_MS', 30000);

  const trader = new DeepBookTrader({ signer, network, poolKey: POOL_KEY, balanceManagerId: bmId });
  const vault = new VaultWithdrawer(signer, network);

  console.log(`[loop] ${AGENT_NAME} started — pool=${POOL_KEY} every ${interval}ms (Ctrl+C to stop)`);
  for (;;) {
    try {
      await tick(trader, vault, owner, identityId, bmId);
    } catch (e) {
      console.warn(`[loop] ${AGENT_NAME} tick error:`, e instanceof Error ? e.message : e);
    }
    await sleep(interval);
  }
}

main().catch((err) => {
  console.error('[loop] fatal:', err instanceof Error ? (err.stack ?? err.message) : err);
  process.exit(1);
});
