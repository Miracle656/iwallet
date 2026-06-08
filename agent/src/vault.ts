import { SuiJsonRpcClient, getJsonRpcFullnodeUrl } from '@mysten/sui/jsonRpc';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { Transaction } from '@mysten/sui/transactions';
import { fromHex } from '@mysten/sui/utils';
import { computeIntentHash, freshNonce, generateProof } from './proof.js';

/**
 * Policy-gated withdrawal from the iWallet vault (the Sub-track 2 budget gate).
 *
 * Calls the republished `prototype::withdraw_with_proof`, whose new signature is:
 *
 *   withdraw_with_proof<T>(
 *     identity: &mut IIdentity<T>,
 *     _: &IWalletOwner,                          // owner capability (minted at create)
 *     proof_bytes, public_inputs_bytes, nonce, amount,
 *     opt_sent_coin: Option<Receiving<Coin<T>>>, // None — vault already funded
 *     recipient, key,
 *     clock: &Clock,
 *     ctx,
 *   ): Coin<T>
 *
 * The contract enforces, in order: policy present, not expired, amount_spent +
 * amount <= budget_cap, recipient ∈ allow_recipients, nonce unused, ZK proof
 * valid, intent (nonce|amount|recipient) bound to the proof. On success it
 * emits `AgentExecutionEvent` — the on-chain activity log.
 *
 * We extract the released Coin to the agent's own address; the trade step then
 * deposits it into the DeepBook BalanceManager. `recipient` is the policy-
 * whitelisted BalanceManager id, so the proof + event bind the spend to DeepBook.
 */

const TYPE_RECEIVING_COIN = (coinType: string) =>
  `0x2::transfer::Receiving<0x2::coin::Coin<${coinType}>>`;

function parseWitness(hex: string): bigint {
  const s = (hex.startsWith('0x') ? hex.slice(2) : hex).trim();
  return BigInt('0x' + (s || '0'));
}

function bytesEq(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
  return true;
}

export type WithdrawResult = {
  digest: string;
  status: string;
  error?: string;
};

export class VaultWithdrawer {
  readonly address: string;
  private readonly client: SuiJsonRpcClient;
  private readonly signer: Ed25519Keypair;

  private readonly pkg = process.env.IWALLET_PACKAGE_ID ?? '';
  private readonly identityId = process.env.IIDENTITY_OBJECT_ID ?? '';
  private readonly ownerCapId = process.env.IWALLET_OWNER_ID ?? '';
  private readonly identityHashHex = process.env.IDENTITY_HASH ?? '';
  private readonly witnessHex = process.env.AGENT_WITNESS_W ?? '';
  private readonly coinType = process.env.STAKE_COIN_TYPE ?? '0x2::sui::SUI';
  private readonly key = process.env.STAGED_BALANCE_KEY ?? 'default';

  constructor(signer: Ed25519Keypair, network: Network = 'testnet') {
    this.signer = signer;
    this.address = signer.toSuiAddress();
    this.client = new SuiJsonRpcClient({
      url: getJsonRpcFullnodeUrl(network),
      network,
    });
    if (!this.pkg || !this.identityId || !this.ownerCapId) {
      throw new Error(
        'Need IWALLET_PACKAGE_ID, IIDENTITY_OBJECT_ID, IWALLET_OWNER_ID in env',
      );
    }
    if (!this.witnessHex) throw new Error('Need AGENT_WITNESS_W in env');
  }

  /**
   * The biggest Coin<T> sent to the vault's address but not yet staged.
   * Returns its object ref for use as a `Receiving` arg, or null if none.
   */
  private async largestPendingCoin(): Promise<
    { objectId: string; version: string; digest: string; balance: bigint } | null
  > {
    const res = await this.client.getOwnedObjects({
      owner: this.identityId,
      filter: { StructType: `0x2::coin::Coin<${this.coinType}>` },
      options: { showContent: true },
    });
    let best: { objectId: string; version: string; digest: string; balance: bigint } | null = null;
    for (const o of res.data) {
      const d = o.data;
      if (!d) continue;
      const fields = (d.content as { fields?: { balance?: string } } | undefined)?.fields;
      const bal = BigInt(fields?.balance ?? '0');
      if (!best || bal > best.balance) {
        best = { objectId: d.objectId, version: d.version, digest: d.digest, balance: bal };
      }
    }
    return best;
  }

  /**
   * Withdraw `amount` MIST, authorising it for `recipient` (must be in the
   * policy's allow_recipients). The released coin lands in the agent's wallet.
   */
  async withdraw(amount: bigint, recipient: string): Promise<WithdrawResult> {
    const nonce = freshNonce();
    const w = parseWitness(this.witnessHex);

    const intentHash = computeIntentHash(nonce, amount, recipient);
    const { proofBytes, publicInputs, identityHashBytes } = await generateProof({
      w,
      intentHash,
    });

    // Fail loudly before burning a nonce if the registered hash disagrees with
    // Poseidon(witness) — the silent-proof-failure trap.
    if (this.identityHashHex) {
      const envBytes = fromHex(this.identityHashHex);
      if (!bytesEq(envBytes, identityHashBytes)) {
        throw new Error(
          '[vault] IDENTITY_HASH != Poseidon(AGENT_WITNESS_W) LE — witness/registration mismatch',
        );
      }
    }

    // Funding model is transfer-to-object: SUI sent to the vault address sits
    // as a `Receiving` coin until staged. The contract's receive_coin is
    // private, so we stage it by passing the largest pending coin as
    // opt_sent_coin = Some(Receiving) — the contract joins it into the bag
    // before splitting `amount`. None once nothing is pending (bag already funded).
    const pending = await this.largestPendingCoin();

    const tx = new Transaction();

    const optSent = pending
      ? tx.moveCall({
          target: '0x1::option::some',
          typeArguments: [TYPE_RECEIVING_COIN(this.coinType)],
          arguments: [
            tx.receivingRef({
              objectId: pending.objectId,
              version: pending.version,
              digest: pending.digest,
            }),
          ],
        })
      : tx.moveCall({
          target: '0x1::option::none',
          typeArguments: [TYPE_RECEIVING_COIN(this.coinType)],
        });

    const [coin] = tx.moveCall({
      target: `${this.pkg}::prototype::withdraw_with_proof`,
      typeArguments: [this.coinType],
      arguments: [
        tx.object(this.identityId),
        tx.object(this.ownerCapId),
        tx.pure.vector('u8', Array.from(proofBytes)),
        tx.pure.vector('u8', Array.from(publicInputs)),
        tx.pure.vector('u8', Array.from(nonce)),
        tx.pure.u64(amount),
        optSent,
        tx.pure.address(recipient),
        tx.pure.string(this.key),
        tx.object('0x6'), // Clock
      ],
    });

    // Standalone tx: the released coin must be consumed. Park it in the agent's
    // wallet; the DeepBook deposit step moves it on next.
    tx.transferObjects([coin], this.address);

    const res = await this.client.signAndExecuteTransaction({
      transaction: tx,
      signer: this.signer,
      options: { showEffects: true },
    });
    return {
      digest: res.digest,
      status: res.effects?.status?.status ?? 'unknown',
      error: res.effects?.status?.error,
    };
  }
}

type Network = 'testnet' | 'mainnet' | 'devnet';
