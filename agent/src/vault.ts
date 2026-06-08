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

    const tx = new Transaction();

    // opt_sent_coin = None<Receiving<Coin<T>>> — the vault is already funded.
    const noneSent = tx.moveCall({
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
        noneSent,
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
