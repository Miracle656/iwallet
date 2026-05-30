/*
prices are provided in standard decimal format
such as 10.5 SUI or 0.00001 nBTC

*/

import { SuiGrpcClient } from "@mysten/sui/grpc";
import { type AccountInfo, deepbook } from "@mysten/deepbook-v3";
import { Transaction } from "@mysten/sui/transactions";
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import dotenv from "dotenv";
dotenv.config();

export class DeepBookService {
  private _keypair = Ed25519Keypair.fromSecretKey(process.env.PK!);
  tx: Transaction;

  constructor() {
    this.tx = new Transaction();
  }

  grpcClient = new SuiGrpcClient({
    network: "testnet",
    baseUrl: "https://fullnode.testnet.sui.io:443",
  }).$extend(
    deepbook({
      address: this._keypair.getPublicKey().toSuiAddress().toString(),
      balanceManagers: {},
    }),
  );

  // create balance manager
  async createBalanceManager(address: string): Promise<Transaction> {
    this.tx.add(
      this.grpcClient.deepbook.balanceManager.createBalanceManagerWithOwner(
        address,
      ),
    );

    return this.tx;
  }

  // deposit fund to balanace manager
  async depositIntoManager(
    managerKey: string,
    coinKey: string,
    amount: number,
  ): Promise<Transaction> {
    this.tx.add(
      this.grpcClient.deepbook.balanceManager.depositIntoManager(
        managerKey,
        coinKey,
        amount,
      ),
    );
    return this.tx;
  }

  // withdraw a coin from deepbook
  async withdrawFund(
    managerKey: string,
    coinKey: string,
    amount: number,
  ): Promise<Transaction> {
    this.tx.add(
      this.grpcClient.deepbook.balanceManager.withdrawFromManager(
        managerKey,
        coinKey,
        amount,
        this._keypair.getPublicKey().toString(),
      ),
    );
    return this.tx;
  }

  // withdrw all the deep from deepbook
  async withdrawAllDeep(
    managerKey: string,
    coinKey: string,
  ): Promise<Transaction> {
    this.tx.add(
      this.grpcClient.deepbook.balanceManager.withdrawAllFromManager(
        managerKey,
        coinKey,
        this._keypair.getPublicKey().toString(),
      ),
    );
    return this.tx;
  }

  // creating capability from delegate trading on deepbook
  async mintAndUseTradeCap(
    managerKey: string,
    traderAddress: string,
  ): Promise<Transaction> {
    const tradeCap = this.tx.add(
      this.grpcClient.deepbook.balanceManager.mintTradeCap(managerKey),
    );

    this.tx.transferObjects([tradeCap], traderAddress);

    return this.tx;
  }

  // minting a trading capability
  async mintDepositCap(
    managerKey: string,
    coinKey: string,
    amount: number,
    recipient: string,
  ): Promise<Transaction> {
    const depositCap = this.tx.add(
      this.grpcClient.deepbook.balanceManager.mintDepositCap(managerKey),
    );
    this.tx.transferObjects([depositCap], recipient);
    return this.tx;
  }

  /*
    Use account to retrieve the account information for a BalanceManager in a pool,
    which has the following form:
    parameters -
      @poolKey: String that identifies the pool to query.
      @balanceManagerKey: key of the balance manager defined in the SDK.
  */
  async account(poolKey: string, managerKey: string): Promise<AccountInfo> {
    return this.grpcClient.deepbook.account(poolKey, managerKey);
  }

  /*
    Use accountOpenOrders to retrieve open orders for the balance manager and pool with the IDs you provide.
    The call returns a Promise that contains an array of open order IDs.
    parameters -
      poolKey: String that identifies the pool to query.
      managerKey: String that identifies the balance manager to query.
  */

  async accountOpenOrders(
    poolKey: string,
    managerKey: string,
  ): Promise<string[]> {
    return this.grpcClient.deepbook.accountOpenOrders(poolKey, managerKey);
  }

  /*
  Use checkManagerBalance to check the balance manager for a specific coin.
  The call returns a Promise in the form:
    {
      coinType: string,
      balance: number
    }

    Parameters

    managerKey: String that identifies the balance manager to query.
    coinKey: String that identifies the coin to query the balance of.
  */
}
