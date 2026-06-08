import { SuiJsonRpcClient, getJsonRpcFullnodeUrl } from '@mysten/sui/jsonRpc';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { Transaction } from '@mysten/sui/transactions';
import { DeepBookClient } from '@mysten/deepbook-v3';

/**
 * DeepBook v3 execution venue for the agent (Sub-track 2 — "real DeepBook orders").
 *
 * Thin wrapper around the JSON-RPC `DeepBookClient` proven end-to-end by the
 * spike (deepbookv3/scripts/transactions/iwalletDeepbookSpike.ts). The agent
 * already pins @mysten/sui — DeepBookClient takes that same client, so there's
 * no second SDK stack to reconcile.
 *
 * The BalanceManager is the on-chain account the agent trades from. The agent
 * funds it with coins it extracted from the iWallet vault via
 * `withdraw_with_proof` (policy-gated), so DeepBook only ever sees money the
 * AgentPolicy authorised.
 */

export type Network = 'testnet' | 'mainnet' | 'devnet';

export type PlacedOrder = {
  digest: string;
  status: string;
  error?: string;
};

const BM_KEY = 'IWALLET_BM';

export class DeepBookTrader {
  readonly address: string;
  readonly network: Network;
  private readonly client: SuiJsonRpcClient;
  private readonly signer: Ed25519Keypair;
  private readonly poolKey: string;
  private readonly balanceManagerId?: string;

  constructor(opts: {
    signer: Ed25519Keypair;
    network?: Network;
    poolKey?: string;
    /** Existing shared BalanceManager. Omit only for the one-off create step. */
    balanceManagerId?: string;
  }) {
    this.signer = opts.signer;
    this.address = opts.signer.toSuiAddress();
    this.network = opts.network ?? 'testnet';
    this.poolKey = opts.poolKey ?? process.env.DEEPBOOK_POOL_KEY ?? 'SUI_DBUSDC';
    this.balanceManagerId =
      opts.balanceManagerId ?? process.env.BALANCE_MANAGER_ID ?? undefined;
    this.client = new SuiJsonRpcClient({
      url: getJsonRpcFullnodeUrl(this.network),
      network: this.network,
    });
  }

  /** Build the SDK client, registering the BalanceManager when we have one. */
  private db(): DeepBookClient {
    const balanceManagers = this.balanceManagerId
      ? { [BM_KEY]: { address: this.balanceManagerId } }
      : undefined;
    return new DeepBookClient({
      address: this.address,
      network: this.network,
      client: this.client,
      balanceManagers,
    });
  }

  /** Current mid price for the configured pool (read-only, no funds). */
  async midPrice(): Promise<number> {
    return this.db().midPrice(this.poolKey);
  }

  /**
   * One-time: create + share a BalanceManager and return its object id. Run this
   * before provisioning so the iWallet policy can whitelist it as the allowed
   * recipient ("DeepBook only" scope).
   */
  async createBalanceManager(): Promise<string> {
    const tx = new Transaction();
    tx.add(this.db().balanceManager.createAndShareBalanceManager());
    const res = await this.client.signAndExecuteTransaction({
      transaction: tx,
      signer: this.signer,
      options: { showObjectChanges: true },
    });
    const bm = (res.objectChanges ?? []).find(
      (c: any) =>
        c.type === 'created' && String(c.objectType).includes('BalanceManager'),
    ) as { objectId?: string } | undefined;
    if (!bm?.objectId) {
      throw new Error(`BalanceManager not created (tx ${res.digest})`);
    }
    await this.client.waitForTransaction({ digest: res.digest });
    return bm.objectId;
  }

  /**
   * Deposit `amount` of `coinKey` into the BalanceManager and place a resting
   * limit order, atomically. The deposit pulls from the agent's owned coins —
   * which is exactly the coin just released by `withdraw_with_proof`.
   *
   *  - `coinKey`: SDK coin key, e.g. 'SUI' or 'DBUSDC'.
   *  - `price` / `quantity`: human units (the SDK scales to the pool's lots).
   *  - `isBid`: true = buy base with quote, false = sell base.
   */
  async depositAndPlaceLimitOrder(args: {
    coinKey: string;
    depositAmount: number;
    price: number;
    quantity: number;
    isBid: boolean;
    payWithDeep?: boolean;
  }): Promise<PlacedOrder> {
    if (!this.balanceManagerId) {
      throw new Error('No BALANCE_MANAGER_ID — run setup:deepbook first');
    }
    const db = this.db();
    const tx = new Transaction();
    tx.add(db.balanceManager.depositIntoManager(BM_KEY, args.coinKey, args.depositAmount));
    tx.add(
      db.deepBook.placeLimitOrder({
        poolKey: this.poolKey,
        balanceManagerKey: BM_KEY,
        clientOrderId: String(Date.now()),
        price: args.price,
        quantity: args.quantity,
        isBid: args.isBid,
        payWithDeep: args.payWithDeep ?? false,
      }),
    );
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

  /** Open orders for the BalanceManager on the configured pool (read-only). */
  async openOrders(): Promise<unknown> {
    return this.db().accountOpenOrders(this.poolKey, BM_KEY);
  }

  /** Cancel every open order — used in the revocation demo to wind down. */
  async cancelAll(): Promise<PlacedOrder> {
    if (!this.balanceManagerId) {
      throw new Error('No BALANCE_MANAGER_ID — run setup:deepbook first');
    }
    const db = this.db();
    const tx = new Transaction();
    tx.add(db.deepBook.cancelAllOrders(this.poolKey, BM_KEY));
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

  /** Manager balance for a coin key (read-only). */
  async managerBalance(coinKey: string): Promise<unknown> {
    return this.db().checkManagerBalance(BM_KEY, coinKey);
  }
}
