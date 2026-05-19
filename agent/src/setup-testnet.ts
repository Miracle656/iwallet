import 'dotenv/config';
import { execSync } from 'node:child_process';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { SuiJsonRpcClient, getJsonRpcFullnodeUrl } from '@mysten/sui/jsonRpc';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { Transaction } from '@mysten/sui/transactions';
import { computeIdentityHash } from './proof.js';
import { verificationKeyToBytes } from './vk.js';

/**
 * One-shot testnet provisioner. Idempotent per-step: anything already set in
 * .env is reused instead of re-created.
 *
 *   1. publish iwallet package          -> IWALLET_PACKAGE_ID
 *   2. publish sportsbook package       -> SPORTSBOOK_PACKAGE_ID, RESOLVER_CAP_ID
 *   3. create_iidentity (LE Poseidon(w) + converted vk_bytes)
 *                                       -> IIDENTITY_OBJECT_ID, IDENTITY_HASH
 *   4. create one market                -> SETUP_MARKET_ID
 *   5. stage a balance into the identity (transfer-to-object + receive_coin)
 *
 * Requires a working, funded `sui` CLI wallet (publish shells out to it) and
 * SUI_PRIVATE_KEY / AGENT_WITNESS_W in agent/.env.
 *
 * Run: `npx tsx src/setup-testnet.ts`
 */

const REPO = resolve('..');
const ENV_PATH = resolve('.env');
const COIN = process.env.STAKE_COIN_TYPE ?? '0x2::sui::SUI';
const KEY = process.env.STAGED_BALANCE_KEY ?? 'default';
const STAGE_AMOUNT = BigInt(process.env.SETUP_STAGE_AMOUNT ?? '50000000'); // 0.05 SUI

function sh(cmd: string, cwd: string): string {
  return execSync(cmd, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
}

/** Read .env into a map, preserving unknown lines on write-back. */
function readEnv(): Map<string, string> {
  const m = new Map<string, string>();
  if (!existsSync(ENV_PATH)) return m;
  for (const line of readFileSync(ENV_PATH, 'utf8').split(/\r?\n/)) {
    const eq = line.indexOf('=');
    if (eq > 0 && !line.trimStart().startsWith('#')) {
      m.set(line.slice(0, eq).trim(), line.slice(eq + 1).trim());
    }
  }
  return m;
}

function setEnv(updates: Record<string, string>): void {
  const lines = existsSync(ENV_PATH)
    ? readFileSync(ENV_PATH, 'utf8').split(/\r?\n/)
    : [];
  const seen = new Set<string>();
  const out = lines.map((line) => {
    const eq = line.indexOf('=');
    if (eq > 0 && !line.trimStart().startsWith('#')) {
      const k = line.slice(0, eq).trim();
      if (k in updates) {
        seen.add(k);
        return `${k}=${updates[k]}`;
      }
    }
    return line;
  });
  for (const [k, v] of Object.entries(updates)) {
    if (!seen.has(k)) out.push(`${k}=${v}`);
  }
  writeFileSync(ENV_PATH, out.join('\n'));
}

function publish(dir: string): { packageId: string; created: any[] } {
  const raw = sh(
    'sui client publish --skip-dependency-verification --json --gas-budget 500000000 .',
    dir,
  );
  const json = JSON.parse(raw);
  const changes = json.objectChanges ?? [];
  const pub = changes.find((c: any) => c.type === 'published');
  if (!pub) throw new Error(`no 'published' change in ${dir}`);
  return { packageId: pub.packageId, created: changes.filter((c: any) => c.type === 'created') };
}

async function main(): Promise<void> {
  const pk = process.env.SUI_PRIVATE_KEY;
  const wHex = process.env.AGENT_WITNESS_W;
  if (!pk || !wHex) throw new Error('SUI_PRIVATE_KEY and AGENT_WITNESS_W required');

  const signer = Ed25519Keypair.fromSecretKey(pk);
  const me = signer.toSuiAddress();
  const network = (process.env.SUI_NETWORK ?? 'testnet') as 'testnet' | 'mainnet' | 'devnet';
  const client = new SuiJsonRpcClient({ url: getJsonRpcFullnodeUrl(network), network });
  const env = readEnv();
  console.log(`[setup] signer ${me} on ${network}`);

  // 1. iwallet package
  let iwalletPkg = env.get('IWALLET_PACKAGE_ID');
  if (!iwalletPkg) {
    console.log('[setup] publishing iwallet…');
    iwalletPkg = publish(REPO).packageId;
    setEnv({ IWALLET_PACKAGE_ID: iwalletPkg });
    console.log(`[setup] IWALLET_PACKAGE_ID=${iwalletPkg}`);
  } else console.log(`[setup] reuse IWALLET_PACKAGE_ID=${iwalletPkg}`);

  // 2. sportsbook package + ResolverCap
  let sportsbookPkg = env.get('SPORTSBOOK_PACKAGE_ID');
  let resolverCap = env.get('RESOLVER_CAP_ID');
  if (!sportsbookPkg) {
    console.log('[setup] publishing sportsbook…');
    const r = publish(resolve(REPO, 'packages/sportsbook'));
    sportsbookPkg = r.packageId;
    const cap = r.created.find((c: any) =>
      String(c.objectType).includes('::sportsbook::ResolverCap'),
    );
    if (!cap) throw new Error('ResolverCap not found in sportsbook publish');
    resolverCap = cap.objectId;
    setEnv({ SPORTSBOOK_PACKAGE_ID: sportsbookPkg, RESOLVER_CAP_ID: resolverCap! });
    console.log(`[setup] SPORTSBOOK_PACKAGE_ID=${sportsbookPkg} RESOLVER_CAP_ID=${resolverCap}`);
  } else console.log(`[setup] reuse SPORTSBOOK_PACKAGE_ID=${sportsbookPkg}`);

  // 3. identity
  let identityId = env.get('IIDENTITY_OBJECT_ID');
  const w = BigInt(wHex.startsWith('0x') ? wHex : '0x' + wHex);
  const { bytes: idHashLE } = await computeIdentityHash(w);
  const idHashHex = Buffer.from(idHashLE).toString('hex');
  if (!identityId) {
    console.log('[setup] create_iidentity…');
    const vkBytes = verificationKeyToBytes(resolve(REPO, 'circuits/verification_key.json'));
    const tx = new Transaction();
    tx.moveCall({
      target: `${iwalletPkg!}::prototype::create_iidentity`,
      typeArguments: [COIN],
      arguments: [
        tx.pure.string('iwallet-agent'),
        tx.pure.vector('u8', Array.from(idHashLE)),
        tx.pure.vector('u8', Array.from(vkBytes)),
      ],
    });
    const res = await client.signAndExecuteTransaction({
      transaction: tx,
      signer,
      options: { showObjectChanges: true },
    });
    const created = (res.objectChanges ?? []).find((c: any) =>
      String(c.objectType).includes('::prototype::IIdentity<'),
    );
    if (!created) throw new Error(`IIdentity not created (tx ${res.digest})`);
    identityId = (created as any).objectId;
    setEnv({ IIDENTITY_OBJECT_ID: identityId!, IDENTITY_HASH: idHashHex });
    console.log(`[setup] IIDENTITY_OBJECT_ID=${identityId}`);
  } else {
    console.log(`[setup] reuse IIDENTITY_OBJECT_ID=${identityId}`);
    setEnv({ IDENTITY_HASH: idHashHex }); // keep in sync with current w
  }

  // 4. one market
  let marketId = env.get('SETUP_MARKET_ID');
  if (!marketId) {
    console.log('[setup] create_market…');
    const tx = new Transaction();
    tx.moveCall({
      target: `${sportsbookPkg!}::sportsbook::create_market`,
      typeArguments: [COIN],
      arguments: [
        tx.object(resolverCap!),
        tx.pure.string('demo'),
        tx.pure.string('Home FC'),
        tx.pure.string('Away FC'),
        tx.pure.u64(15000n), // 1.50
        tx.pure.u64(26000n), // 2.60
        tx.pure.u64(0n),
        tx.pure.u64(BigInt(Date.now() + 7 * 24 * 3600 * 1000)),
      ],
    });
    const res = await client.signAndExecuteTransaction({
      transaction: tx,
      signer,
      options: { showObjectChanges: true },
    });
    const m = (res.objectChanges ?? []).find((c: any) =>
      String(c.objectType).includes('::sportsbook::Market<'),
    );
    if (!m) throw new Error(`Market not created (tx ${res.digest})`);
    marketId = (m as any).objectId;
    setEnv({ SETUP_MARKET_ID: marketId! });
    console.log(`[setup] SETUP_MARKET_ID=${marketId}`);
  } else console.log(`[setup] reuse SETUP_MARKET_ID=${marketId}`);

  // 5. stage a balance: transfer-to-object then receive_coin
  console.log(`[setup] staging ${STAGE_AMOUNT} into ${identityId} key="${KEY}"…`);
  const t1 = new Transaction();
  const [coin] = t1.splitCoins(t1.gas, [t1.pure.u64(STAGE_AMOUNT)]);
  t1.transferObjects([coin], t1.pure.address(identityId!));
  const send = await client.signAndExecuteTransaction({
    transaction: t1,
    signer,
    options: { showObjectChanges: true },
  });
  const sent = (send.objectChanges ?? []).find(
    (c: any) => c.type === 'created' && String(c.objectType).includes('::coin::Coin<'),
  );
  if (!sent) throw new Error(`staged coin not found (tx ${send.digest})`);

  const t2 = new Transaction();
  t2.moveCall({
    target: `${iwalletPkg!}::prototype::receive_coin`,
    typeArguments: [COIN],
    arguments: [
      t2.object(identityId!),
      t2.pure.string(KEY),
      t2.object((sent as any).objectId),
    ],
  });
  const recv = await client.signAndExecuteTransaction({ transaction: t2, signer });
  console.log(`[setup] staged (tx ${recv.digest})`);

  console.log('\n[setup] done. agent/.env updated. flip the stub gate by keeping');
  console.log('SUI_PRIVATE_KEY + AGENT_WITNESS_W set, then run npm run serve.');
}

main().catch((err) => {
  console.error('[setup] failed:', err instanceof Error ? err.message : err);
  process.exit(1);
});
