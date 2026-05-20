import {
  SuiJsonRpcClient,
  getJsonRpcFullnodeUrl,
} from '@mysten/sui/jsonRpc';
import { Transaction } from '@mysten/sui/transactions';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { fromHex } from '@mysten/sui/utils';
import type { Pick } from './picks.js';
import { computeIntentHash, freshNonce, generateProof } from './proof.js';

/** Parse a hex string (with or without 0x) as a big-endian bigint. */
function parseWitness(hex: string): bigint {
  const s = (hex.startsWith('0x') ? hex.slice(2) : hex).trim();
  return BigInt('0x' + (s || '0'));
}

function bytesEq(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
  return true;
}

/**
 * Builds the PTB that drives an agent bet:
 *   tx[0]: iwallet::prototype::withdraw_with_proof   ->  Coin<T>
 *   tx[1]: sportsbook::sportsbook::place_bet         <-  consumes that Coin
 *
 * Atomic: if the bet fails (market closed, mandate violation, etc.), the
 * withdrawal reverts and the nonce isn't burned.
 *
 * Stub gate: if SUI_PRIVATE_KEY or AGENT_WITNESS_W is unset, this returns a
 * fake digest so the rest of the agent loop can be exercised.
 */
export class IWalletClient {
  private client: SuiJsonRpcClient;
  private signer?: Ed25519Keypair;

  private readonly iwalletPackage = process.env.IWALLET_PACKAGE_ID ?? '';
  private readonly sportsbookPackage = process.env.SPORTSBOOK_PACKAGE_ID ?? '';
  private readonly identityObjectId = process.env.IIDENTITY_OBJECT_ID ?? '';
  private readonly identityHashHex = process.env.IDENTITY_HASH ?? '';
  private readonly witnessHex = process.env.AGENT_WITNESS_W ?? '';
  private readonly stakeCoinType = process.env.STAKE_COIN_TYPE ?? '0x2::sui::SUI';
  private readonly stagedBalanceKey = process.env.STAGED_BALANCE_KEY ?? 'default';
  /**
   * Markets the bets route to. The sportsbook allows one bet per bettor per
   * market, so we round-robin a pool minted by `npm run setup:markets`
   * (`MARKET_POOL`). Falls back to a single `SETUP_MARKET_ID`, then to
   * pick.marketId (the-odds-api event id — a placeholder that fails on-chain).
   */
  private readonly marketPool = (process.env.MARKET_POOL ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  private readonly fixedMarketId = process.env.SETUP_MARKET_ID ?? '';
  private readonly resolverCapId = (process.env.RESOLVER_CAP_ID ?? '').trim();
  private marketCursor = 0;

  /**
   * Mint a market that matches THIS pick (same teams/odds) so the on-chain
   * market the agent bets into is coherent with the pick — and so we never
   * hit EBetAlreadyPlaced (every bet gets its own fresh market). Returns the
   * new Market object id.
   */
  private async createMarketForPick(pick: Pick): Promise<string> {
    const tx = new Transaction();
    tx.moveCall({
      target: `${this.sportsbookPackage}::sportsbook::create_market`,
      typeArguments: [this.stakeCoinType],
      arguments: [
        tx.object(this.resolverCapId),
        tx.pure.string(pick.sport),
        tx.pure.string(pick.home),
        tx.pure.string(pick.away),
        tx.pure.u64(BigInt(Math.round(pick.homeOdds * 10000))),
        tx.pure.u64(BigInt(Math.round(pick.awayOdds * 10000))),
        tx.pure.u64(0n),
        tx.pure.u64(BigInt(Date.now() + 14 * 24 * 3600 * 1000)),
      ],
    });
    const res = await this.client.signAndExecuteTransaction({
      transaction: tx,
      signer: this.signer!,
      options: { showObjectChanges: true },
    });
    const m = (res.objectChanges ?? []).find((c: any) =>
      String(c.objectType).includes('::sportsbook::Market<'),
    );
    if (!m) throw new Error(`market not created (tx ${res.digest})`);
    await this.client.waitForTransaction({ digest: res.digest });
    return (m as { objectId: string }).objectId;
  }

  private nextMarketId(fallback: string): string {
    if (this.marketPool.length > 0) {
      const id = this.marketPool[this.marketCursor % this.marketPool.length];
      this.marketCursor += 1;
      return id;
    }
    return this.fixedMarketId || fallback;
  }

  constructor() {
    const network = (process.env.SUI_NETWORK ?? 'testnet') as
      | 'testnet'
      | 'mainnet'
      | 'devnet';
    this.client = new SuiJsonRpcClient({
      url: getJsonRpcFullnodeUrl(network),
      network,
    });

    const pk = process.env.SUI_PRIVATE_KEY;
    if (pk) {
      this.signer = Ed25519Keypair.fromSecretKey(pk);
    }
  }

  async placeBet(pick: Pick): Promise<{ digest: string; marketId: string }> {
    if (!this.signer || !this.witnessHex) {
      console.warn('[iwallet] keys/witness not set — stub mode');
      return { digest: `stub-${pick.marketId}-${Date.now()}`, marketId: '' };
    }

    const recipient = this.signer.toSuiAddress();
    const nonce = freshNonce();
    const amount = BigInt(pick.stake);
    const w = parseWitness(this.witnessHex);

    // Mint a market matching this pick (coherent + no EBetAlreadyPlaced).
    // Fall back to the pool / fixed market if no ResolverCap is configured.
    const marketId = this.resolverCapId
      ? await this.createMarketForPick(pick)
      : this.nextMarketId(pick.marketId);

    const intentHash = computeIntentHash(nonce, amount, recipient);
    const { proofBytes, publicInputs, identityHashBytes } = await generateProof({
      w,
      intentHash,
    });

    // Sanity: the registered identity_hash on-chain must equal Poseidon(w),
    // LE-encoded. Better to fail loudly here than burn a nonce on an
    // EIntentMismatch abort.
    if (this.identityHashHex) {
      const envBytes = fromHex(this.identityHashHex);
      if (!bytesEq(envBytes, identityHashBytes)) {
        throw new Error(
          '[iwallet] IDENTITY_HASH env does not equal Poseidon(AGENT_WITNESS_W) LE bytes — ' +
            'witness/registration mismatch',
        );
      }
    }

    const tx = new Transaction();

    const [stakeCoin] = tx.moveCall({
      target: `${this.iwalletPackage}::prototype::withdraw_with_proof`,
      typeArguments: [this.stakeCoinType],
      arguments: [
        tx.object(this.identityObjectId),
        tx.pure.vector('u8', Array.from(proofBytes)),
        tx.pure.vector('u8', Array.from(publicInputs)),
        tx.pure.vector('u8', Array.from(nonce)),
        tx.pure.u64(amount),
        tx.pure.address(recipient),
        tx.pure.string(this.stagedBalanceKey),
      ],
    });

    tx.moveCall({
      target: `${this.sportsbookPackage}::sportsbook::place_bet`,
      typeArguments: [this.stakeCoinType],
      arguments: [
        tx.object(marketId),
        tx.pure.id(this.identityObjectId),
        tx.pure.u8(outcomeCode(pick.outcome)),
        stakeCoin,
        tx.object('0x6'), // Clock
      ],
    });

    const result = await this.client.signAndExecuteTransaction({
      transaction: tx,
      signer: this.signer,
    });
    return { digest: result.digest, marketId };
  }
}

/** Matches sportsbook::OUTCOME_* constants. */
export function outcomeCode(o: Pick['outcome']): number {
  if (o === 'home') return 1;
  if (o === 'away') return 2;
  return 3;
}
