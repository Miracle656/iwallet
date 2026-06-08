import 'dotenv/config';
import { SuiJsonRpcClient, getJsonRpcFullnodeUrl } from '@mysten/sui/jsonRpc';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { Transaction } from '@mysten/sui/transactions';

/**
 * Owner re-sets the AgentPolicy on an existing iWallet (budget / allowed
 * recipients / expiry) without re-provisioning. Owner-gated on-chain.
 *
 *   POLICY_BUDGET_MIST=2000000000 npm run set-policy
 *
 * Reads IIDENTITY_OBJECT_ID, IWALLET_PACKAGE_ID, SUI_PRIVATE_KEY from env.
 * Allowed recipients default to BALANCE_MANAGER_ID ("DeepBook only").
 */
async function main(): Promise<void> {
  const pk = process.env.SUI_PRIVATE_KEY;
  const pkg = process.env.IWALLET_PACKAGE_ID;
  const identityId = process.env.IIDENTITY_OBJECT_ID;
  const coin = process.env.STAKE_COIN_TYPE ?? '0x2::sui::SUI';
  if (!pk || !pkg || !identityId) {
    throw new Error('Need SUI_PRIVATE_KEY, IWALLET_PACKAGE_ID, IIDENTITY_OBJECT_ID in env');
  }

  const signer = Ed25519Keypair.fromSecretKey(pk);
  const network = (process.env.SUI_NETWORK ?? 'testnet') as 'testnet' | 'mainnet' | 'devnet';
  const client = new SuiJsonRpcClient({ url: getJsonRpcFullnodeUrl(network), network });

  const budgetCap = BigInt(process.env.POLICY_BUDGET_MIST ?? '2000000000'); // 2 SUI
  const allow = (process.env.POLICY_ALLOW_RECIPIENTS ?? process.env.BALANCE_MANAGER_ID ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  const expirationMs = BigInt(Date.now() + Number(process.env.POLICY_TTL_MS ?? 86_400_000));

  const tx = new Transaction();
  tx.moveCall({
    target: `${pkg}::prototype::set_policy`,
    typeArguments: [coin],
    arguments: [
      tx.object(identityId),
      tx.pure.u64(budgetCap),
      tx.pure.vector('address', allow),
      tx.pure.u64(expirationMs),
    ],
  });
  const res = await client.signAndExecuteTransaction({
    transaction: tx,
    signer,
    options: { showEffects: true },
  });
  console.log(
    `[set-policy] budget=${budgetCap} MIST, recipients=${allow.length}, ttl=24h ` +
      `-> ${res.digest} status=${res.effects?.status?.status}`,
  );
  if (res.effects?.status?.status !== 'success') {
    console.error('[set-policy] failed:', res.effects?.status?.error);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('[set-policy] failed:', err instanceof Error ? (err.stack ?? err.message) : err);
  process.exit(1);
});
