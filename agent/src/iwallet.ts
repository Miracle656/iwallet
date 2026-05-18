import {
  SuiJsonRpcClient,
  getJsonRpcFullnodeUrl,
} from '@mysten/sui/jsonRpc';
import { Transaction } from '@mysten/sui/transactions';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { fromHex } from '@mysten/sui/utils';
import type { Pick } from './picks.js';
import {
  assemblePublicInputs,
  computeIntentHash,
  freshNonce,
  generateProof,
} from './proof.js';

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

  async placeBet(pick: Pick): Promise<{ digest: string }> {
    if (!this.signer || !this.witnessHex) {
      console.warn('[iwallet] keys/witness not set — stub mode');
      return { digest: `stub-${pick.marketId}-${Date.now()}` };
    }

    const recipient = this.signer.toSuiAddress();
    const nonce = freshNonce();
    const amount = BigInt(pick.stake);
    const identityHash = fromHex(this.identityHashHex);
    const witness = fromHex(this.witnessHex);

    const intentHash = computeIntentHash(nonce, amount, recipient);
    const publicInputs = assemblePublicInputs(identityHash, intentHash);
    const { proofBytes } = await generateProof({ witness, identityHash, intentHash });

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
        tx.object(pick.marketId),
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
    return { digest: result.digest };
  }
}

/** Matches sportsbook::OUTCOME_* constants. */
export function outcomeCode(o: Pick['outcome']): number {
  if (o === 'home') return 1;
  if (o === 'away') return 2;
  return 3;
}
