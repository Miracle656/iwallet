import { SuiClient, getFullnodeUrl } from '@mysten/sui/client';
import { Transaction } from '@mysten/sui/transactions';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import type { Pick } from './picks.js';

/**
 * Transaction builder for the agent → I-Wallet → sportsbook flow.
 *
 * The agent does NOT sign as the AgentObject (it has no key). Instead it
 * submits a transaction carrying a Groth16 proof; I-Wallet's verifier checks
 * the proof + mandate, then internally calls `sportsbook::place_bet`.
 *
 * This file is a stub — real signatures land once George finalizes
 * `execute_*` (see TBD-4 in docs/INTEGRATION_SPEC.md).
 */
export class IWalletClient {
  private client: SuiClient;
  private signer?: Ed25519Keypair;

  constructor() {
    const network = (process.env.SUI_NETWORK ?? 'testnet') as
      | 'testnet'
      | 'mainnet'
      | 'devnet';
    this.client = new SuiClient({ url: getFullnodeUrl(network) });

    const pk = process.env.SUI_PRIVATE_KEY;
    if (pk) {
      // The signer is the agent-runner key (covers gas only — funds live in
      // the AgentObject's BalanceManager, not on this key).
      this.signer = Ed25519Keypair.fromSecretKey(pk);
    }
  }

  async placeBet(pick: Pick): Promise<{ digest: string }> {
    if (!this.signer) {
      console.warn('[iwallet] SUI_PRIVATE_KEY not set — stub mode');
      return { digest: `stub-${pick.marketId}-${Date.now()}` };
    }

    // TODO: depends on TBD-4 (execute_* signature). Sketch:
    //
    //   const tx = new Transaction();
    //   const { proofPoints, publicInputs } = await this.buildProofPayload(pick);
    //   tx.moveCall({
    //     target: `${process.env.IWALLET_PACKAGE_ID}::iwallet::execute_bet`,
    //     typeArguments: [process.env.STAKE_COIN_TYPE!],
    //     arguments: [
    //       tx.object(process.env.AGENT_OBJECT_ID!),
    //       tx.object(process.env.REGISTRY_ID!),
    //       tx.object(process.env.BALANCE_MANAGER_ID!),
    //       tx.object(pick.marketId),
    //       tx.pure.vector('u8', proofPoints),
    //       tx.pure.vector('u8', publicInputs),
    //       tx.pure.u64(pick.stake),
    //       tx.pure.u8(outcomeCode(pick.outcome)),
    //       tx.object('0x6'), // Clock
    //     ],
    //   });
    //   const result = await this.client.signAndExecuteTransaction({
    //     transaction: tx,
    //     signer: this.signer,
    //   });
    //   return { digest: result.digest };

    return { digest: `todo-${pick.marketId}-${Date.now()}` };
  }
}

export function outcomeCode(o: Pick['outcome']): number {
  // Matches sportsbook::OUTCOME_* constants.
  if (o === 'home') return 1;
  if (o === 'away') return 2;
  return 3;
}
