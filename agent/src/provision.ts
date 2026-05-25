import 'dotenv/config';
import { resolve } from 'node:path';
import { SuiJsonRpcClient, getJsonRpcFullnodeUrl } from '@mysten/sui/jsonRpc';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { Transaction } from '@mysten/sui/transactions';
import { computeIdentityHash } from './proof.js';
import { verificationKeyToBytes } from './vk.js';

/**
 * Provision a fresh IIdentity under the (re)deployed AgentPolicy contract.
 *
 *   create_iidentity(name, identity_hash, vk_bytes, none)  ->  shared IIdentity
 *   set_policy(budget_cap, allow_recipients, expiration_ms) ->  on-chain mandate
 *
 * No funding here (send SUI to the printed object address to fund — George's
 * transfer-to-object model). Reads SUI_PRIVATE_KEY + AGENT_WITNESS_W from
 * agent/.env. Pass IWALLET_PACKAGE_ID on the command line to target the new
 * package without editing .env:
 *
 *   IWALLET_PACKAGE_ID=0x.. npm run provision
 *
 * Optional policy knobs: POLICY_BUDGET_MIST, POLICY_ALLOW_RECIPIENTS (csv),
 * POLICY_TTL_MS.
 */

const REPO = resolve('..');

async function main(): Promise<void> {
  const pk = process.env.SUI_PRIVATE_KEY;
  const wHex = process.env.AGENT_WITNESS_W;
  const pkg = process.env.IWALLET_PACKAGE_ID;
  const coin = process.env.STAKE_COIN_TYPE ?? '0x2::sui::SUI';
  if (!pk || !wHex || !pkg) {
    throw new Error('Need SUI_PRIVATE_KEY + AGENT_WITNESS_W (in .env) and IWALLET_PACKAGE_ID');
  }

  const signer = Ed25519Keypair.fromSecretKey(pk);
  const network = (process.env.SUI_NETWORK ?? 'testnet') as 'testnet' | 'mainnet' | 'devnet';
  const client = new SuiJsonRpcClient({ url: getJsonRpcFullnodeUrl(network), network });
  console.log(`[provision] signer=${signer.toSuiAddress()} pkg=${pkg} network=${network}`);

  const w = BigInt(wHex.startsWith('0x') ? wHex : '0x' + wHex);
  const { bytes: idHashLE } = await computeIdentityHash(w);
  const vkBytes = verificationKeyToBytes(resolve(REPO, 'circuits/verification_key.json'));

  // 1. create_iidentity(..., none)
  const t1 = new Transaction();
  // Option<AgentPolicy> is a struct option — can't be a pure arg. Build None on-chain.
  const nonePolicy = t1.moveCall({
    target: '0x1::option::none',
    typeArguments: [`${pkg}::prototype::AgentPolicy`],
  });
  t1.moveCall({
    target: `${pkg}::prototype::create_iidentity`,
    typeArguments: [coin],
    arguments: [
      t1.pure.string('iwallet-agent'),
      t1.pure.vector('u8', Array.from(idHashLE)),
      t1.pure.vector('u8', Array.from(vkBytes)),
      nonePolicy,
    ],
  });
  const r1 = await client.signAndExecuteTransaction({
    transaction: t1,
    signer,
    options: { showObjectChanges: true },
  });
  const created = (r1.objectChanges ?? []).find((c: { objectType?: string }) =>
    String(c.objectType).includes('::prototype::IIdentity<'),
  ) as { objectId?: string } | undefined;
  const identityId = created?.objectId;
  if (!identityId) throw new Error(`IIdentity not created (tx ${r1.digest})`);
  console.log(`[provision] IIdentity created: ${identityId} (tx ${r1.digest})`);

  // 2. set_policy(budget_cap, allow_recipients, expiration_ms) — owner only
  const budgetCap = BigInt(process.env.POLICY_BUDGET_MIST ?? '500000000'); // 0.5 SUI
  const allow = (process.env.POLICY_ALLOW_RECIPIENTS ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  const expirationMs = BigInt(Date.now() + Number(process.env.POLICY_TTL_MS ?? 86_400_000)); // 24h

  const t2 = new Transaction();
  t2.moveCall({
    target: `${pkg}::prototype::set_policy`,
    typeArguments: [coin],
    arguments: [
      t2.object(identityId),
      t2.pure.u64(budgetCap),
      t2.pure.vector('address', allow),
      t2.pure.u64(expirationMs),
    ],
  });
  const r2 = await client.signAndExecuteTransaction({ transaction: t2, signer });
  console.log(`[provision] policy set: budget=${budgetCap} MIST, recipients=${allow.length}, ttl=24h (tx ${r2.digest})`);

  console.log(`\n✓ New IIdentity under the new package: ${identityId}`);
  console.log(`  Fund it by sending SUI to ${identityId}`);
  console.log(`  Show it in the frontend: set NEXT_PUBLIC_SEED_IDENTITY_IDS=${identityId}`);
}

main().catch((err) => {
  console.error('[provision] failed:', err instanceof Error ? (err.stack ?? err.message) : err);
  process.exit(1);
});
