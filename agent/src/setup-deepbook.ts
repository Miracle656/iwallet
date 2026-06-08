import 'dotenv/config';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { DeepBookTrader, type Network } from './deepbook.js';

/**
 * One-time: create the agent's DeepBook BalanceManager and print its id.
 *
 *   SUI_PRIVATE_KEY=... npm run setup:deepbook
 *
 * Then add BALANCE_MANAGER_ID=<id> to agent/.env, and provision the iWallet
 * with that id as the only allowed recipient so the policy enforces
 * "DeepBook only":
 *
 *   POLICY_ALLOW_RECIPIENTS=<id> IWALLET_PACKAGE_ID=0x.. npm run provision
 */
async function main(): Promise<void> {
  const pk = process.env.SUI_PRIVATE_KEY;
  if (!pk) throw new Error('Need SUI_PRIVATE_KEY in env');
  const signer = Ed25519Keypair.fromSecretKey(pk);
  const network = (process.env.SUI_NETWORK ?? 'testnet') as Network;

  if (process.env.BALANCE_MANAGER_ID) {
    console.log(`[setup:deepbook] BALANCE_MANAGER_ID already set: ${process.env.BALANCE_MANAGER_ID}`);
    return;
  }

  const trader = new DeepBookTrader({ signer, network });
  console.log(`[setup:deepbook] signer=${trader.address} network=${network}`);
  const bm = await trader.createBalanceManager();

  console.log(`\n✓ BalanceManager created: ${bm}`);
  console.log('  Add to agent/.env:');
  console.log(`    BALANCE_MANAGER_ID=${bm}`);
  console.log('  Provision the iWallet so the policy whitelists ONLY this manager:');
  console.log(`    POLICY_ALLOW_RECIPIENTS=${bm} IWALLET_PACKAGE_ID=0x.. npm run provision`);
}

main().catch((err) => {
  console.error('[setup:deepbook] failed:', err instanceof Error ? (err.stack ?? err.message) : err);
  process.exit(1);
});
