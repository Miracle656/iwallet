import 'dotenv/config';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { SuiJsonRpcClient, getJsonRpcFullnodeUrl } from '@mysten/sui/jsonRpc';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { Transaction } from '@mysten/sui/transactions';

/**
 * Mint a pool of fresh sportsbook markets in one PTB and write their object
 * ids to `MARKET_POOL` in agent/.env. The agent round-robins picks across the
 * pool so each bet hits a market the identity hasn't bet on yet (sportsbook
 * enforces one bet per bettor per market).
 *
 * Run: `npm run setup:markets [count]`  (default 12)
 */

const ENV_PATH = resolve('.env');
const COIN = process.env.STAKE_COIN_TYPE ?? '0x2::sui::SUI';
const COUNT = Number(process.argv[2] ?? '12');

function setEnv(key: string, value: string): void {
  const lines = existsSync(ENV_PATH)
    ? readFileSync(ENV_PATH, 'utf8').split(/\r?\n/)
    : [];
  let seen = false;
  const out = lines.map((line) => {
    const eq = line.indexOf('=');
    if (eq > 0 && line.slice(0, eq).trim() === key) {
      seen = true;
      return `${key}=${value}`;
    }
    return line;
  });
  if (!seen) out.push(`${key}=${value}`);
  writeFileSync(ENV_PATH, out.join('\n'));
}

const SAMPLE = [
  ['tennis', 'K. Khachanov', 'H. Gaston', 15500, 23500],
  ['tennis', 'T. Paul', 'T.M. Etcheverry', 15500, 27800],
  ['tennis', 'M. Frech', 'L. Fernandez', 18000, 19500],
  ['tennis', 'D. Altmaier', 'B. Shelton', 29000, 13900],
  ['cricket', 'Rajasthan Royals', 'Lucknow SG', 24300, 14500],
  ['baseball', 'NC State', 'Duke', 11600, 41000],
  ['soccer', 'Djurgardens IF', 'IK Sirius', 14900, 46000],
  ['soccer', 'Arka Gdynia', 'Nieciecza', 26300, 24000],
  ['tennis', 'A. Eala', 'O. Oliynykova', 16900, 24200],
  ['tennis', 'M. Sherif', 'A. Lazaro Garcia', 17100, 21600],
  ['cricket', 'Chennai SK', 'Sunrisers Hyd', 16500, 20500],
  ['baseball', 'Ole Miss', 'Missouri', 13300, 33800],
] as const;

async function main(): Promise<void> {
  const pk = process.env.SUI_PRIVATE_KEY;
  const sportsbookPkg = (process.env.SPORTSBOOK_PACKAGE_ID ?? '').trim();
  const resolverCap = (process.env.RESOLVER_CAP_ID ?? '').trim();
  if (!pk) throw new Error('SUI_PRIVATE_KEY required');
  if (!sportsbookPkg || !resolverCap)
    throw new Error('SPORTSBOOK_PACKAGE_ID and RESOLVER_CAP_ID required (run setup:testnet first)');

  const signer = Ed25519Keypair.fromSecretKey(pk);
  const network = (process.env.SUI_NETWORK ?? 'testnet') as
    | 'testnet'
    | 'mainnet'
    | 'devnet';
  const client = new SuiJsonRpcClient({
    url: getJsonRpcFullnodeUrl(network),
    network,
  });

  const closesAt = BigInt(Date.now() + 14 * 24 * 3600 * 1000);
  const tx = new Transaction();
  for (let i = 0; i < COUNT; i++) {
    const [sport, home, away, ho, ao] = SAMPLE[i % SAMPLE.length];
    tx.moveCall({
      target: `${sportsbookPkg}::sportsbook::create_market`,
      typeArguments: [COIN],
      arguments: [
        tx.object(resolverCap),
        tx.pure.string(sport),
        tx.pure.string(home),
        tx.pure.string(away),
        tx.pure.u64(BigInt(ho)),
        tx.pure.u64(BigInt(ao)),
        tx.pure.u64(0n),
        tx.pure.u64(closesAt),
      ],
    });
  }

  console.log(`[markets] creating ${COUNT} markets…`);
  const res = await client.signAndExecuteTransaction({
    transaction: tx,
    signer,
    options: { showObjectChanges: true },
  });
  const ids = (res.objectChanges ?? [])
    .filter((c: any) => String(c.objectType).includes('::sportsbook::Market<'))
    .map((c: any) => c.objectId as string);

  if (ids.length === 0)
    throw new Error(`no markets created (tx ${res.digest})`);

  setEnv('MARKET_POOL', ids.join(','));
  console.log(`[markets] created ${ids.length} (tx ${res.digest})`);
  console.log(`[markets] MARKET_POOL written to agent/.env`);
}

main().catch((err) => {
  console.error('[markets] failed:', err instanceof Error ? err.message : err);
  process.exit(1);
});
