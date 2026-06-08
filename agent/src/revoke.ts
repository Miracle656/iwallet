import 'dotenv/config';
import { SuiJsonRpcClient, getJsonRpcFullnodeUrl } from '@mysten/sui/jsonRpc';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { Transaction } from '@mysten/sui/transactions';

/**
 * Owner revocation demo (Sub-track 2 "must have").
 *
 * Calls `prototype::revoke_policy`, which is owner-gated (ctx.sender ==
 * identity.owner) and extracts the active policy, leaving it None. After this,
 * any `withdraw_with_proof` aborts immediately with EPolicyExpired — the agent
 * is instantly defunded, no key rotation needed. Re-run `npm run trade` after
 * this to show the next tick getting rejected at the contract.
 *
 *   IWALLET_PACKAGE_ID=0x.. npm run revoke
 */
async function main(): Promise<void> {
  const pk = process.env.SUI_PRIVATE_KEY;
  const pkg = process.env.IWALLET_PACKAGE_ID;
  const identityId = process.env.IIDENTITY_OBJECT_ID;
  const coinType = process.env.STAKE_COIN_TYPE ?? '0x2::sui::SUI';
  if (!pk || !pkg || !identityId) {
    throw new Error('Need SUI_PRIVATE_KEY, IWALLET_PACKAGE_ID, IIDENTITY_OBJECT_ID in env');
  }

  const signer = Ed25519Keypair.fromSecretKey(pk);
  const network = (process.env.SUI_NETWORK ?? 'testnet') as 'testnet' | 'mainnet' | 'devnet';
  const client = new SuiJsonRpcClient({ url: getJsonRpcFullnodeUrl(network), network });
  console.log(`[revoke] owner=${signer.toSuiAddress()} identity=${identityId}`);

  const tx = new Transaction();
  tx.moveCall({
    target: `${pkg}::prototype::revoke_policy`,
    typeArguments: [coinType],
    arguments: [tx.object(identityId)],
  });
  const res = await client.signAndExecuteTransaction({
    transaction: tx,
    signer,
    options: { showEffects: true },
  });
  const status = res.effects?.status?.status;
  console.log(`[revoke] revoke_policy tx: ${res.digest} status=${status}`);
  if (status !== 'success') {
    console.error('[revoke] failed:', res.effects?.status?.error);
    process.exit(1);
  }
  console.log('\n✓ Policy revoked. The agent is now defunded.');
  console.log('  Run `npm run trade` again — withdraw_with_proof will abort with EPolicyExpired.');
  console.log(`  https://suiscan.xyz/testnet/tx/${res.digest}`);
}

main().catch((err) => {
  console.error('[revoke] failed:', err instanceof Error ? (err.stack ?? err.message) : err);
  process.exit(1);
});
