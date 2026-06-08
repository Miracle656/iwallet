/*
prices are provided in standard decimal format
such as 10.5 SUI or 0.00001 nBTC

*/

import { SuiGrpcClient } from "@mysten/sui/grpc";
import { deepbook } from "@mysten/deepbook-v3";
import { Transaction } from "@mysten/sui/transactions";
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import dotenv from "dotenv";
import {
  AccountInfo,
  BaseQuantityOut,
  QuantityOut,
  QuoteQuantityOut,
  Level2Range,
  Level2TicksFromMid,
} from "../types";
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
  async account(
    poolKey: string,
    balanceManagerKey: string,
  ): Promise<AccountInfo> {
    return await this.grpcClient.deepbook.account(poolKey, balanceManagerKey);
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
    return await this.grpcClient.deepbook.accountOpenOrders(
      poolKey,
      managerKey,
    );
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
  async checkManagerBalance(
    managerKey: string,
    coinKey: string,
  ): Promise<{
    coinType: string;
    balance: number;
  }> {
    return await this.grpcClient.deepbook.checkManagerBalance(
      managerKey,
      coinKey,
    );
  }

  /*
  Use getOrder to retrieve an order's information.
  The call returns a Promise in the Order struct, which has the following form:

  {
    balance_manager_id: {
      bytes: '0x6149bfe6808f0d6a9db1c766552b7ae1df477f5885493436214ed4228e842393'
    },
    order_id: '9223372036873222552073709551614',
    client_order_id: '888',
    quantity: '50000000',
    filled_quantity: '0',
    fee_is_deep: true,
    order_deep_price: { asset_is_base: false, deep_per_asset: '0' },
    epoch: '440',
    status: 0,
    expire_timestamp: '1844674407370955161'
  }

  Parameters

  poolKey: String that identifies the pool to query. orderId: ID of the order to query.

  */
  async getOrder(
    poolKey: string,
    orderId: string,
  ): Promise<{
    balance_manager_id: string;
    order_id: string;
    client_order_id: string;
    quantity: string;
    filled_quantity: string;
    fee_is_deep: boolean;
    order_deep_price: { asset_is_base: boolean; deep_per_asset: string };
    epoch: string;
    status: number;
    expire_timestamp: string;
  } | null> {
    return await this.grpcClient.deepbook.getOrder(poolKey, orderId);
  }

  /*
  Use getQuantityOut to retrieve the output quantities for the base or quote quantity you provide.
  You provide values for both quantities, but only one of them can be nonzero. The call returns a Promise with the form:

  {
    baseQuantity: number,
    quoteQuantity: number,
    baseOut: number,
    quoteOut: number,
    deepRequired: number
  }

  Parameters

  poolKey: String that identifies the pool to query.
  baseQuantity: Number that defines the base quantity you want to convert. Set to 0 if using quote quantity.
  quoteQuantity: Number that defines the quote quantity you want to convert. Set to 0 if using base quantity.
  */
  async getQuantityOut(
    poolKey: string,
    baseQuantity: number,
    quoteQuantity: number,
  ): Promise<QuantityOut> {
    return await this.grpcClient.deepbook.getQuantityOut(
      poolKey,
      baseQuantity,
      quoteQuantity,
    );
  }

  /*
  Use getLevel2Range to retrieve level 2 order book within the boundary price range you provide.
  The call returns a Promise in the form:
    {
      prices: Array<number>,
      quantities: Array<number>
    }
    Parameters

    poolKey: String that identifies the pool to query.
    priceLow: Number for lower bound of price range.
    priceHigh: Number for upper bound of price range.
    isBid: Boolean when set to true gets bid orders, else retrieve ask orders.
  */
  async getLevel2Range(
    poolKey: string,
    priceLow: number | bigint,
    priceHigh: number | bigint,
    isBid: boolean,
  ): Promise<Level2Range> {
    return await this.grpcClient.deepbook.getLevel2Range(
      poolKey,
      priceLow,
      priceHigh,
      isBid,
    );
  }

  /*
  Use getLevel2TicksFromMid to retrieve level 2 order book ticks from mid-price for a pool with the ID you provide.
  The call returns a Promise in the form:
  {
    bid_prices: Array<number>,
    bid_quantities: Array<number>,
    ask_prices: Array<number>,
    ask_quantities: Array<number>
  }

    Parameters

    poolKey: String that identifies the pool to query.
    ticks: Number of ticks from mid-price.
  */

  async getLevel2TicksFromMid(
    poolKey: string,
    ticks: number,
  ): Promise<Level2TicksFromMid> {
    return await this.grpcClient.deepbook.getLevel2TicksFromMid(poolKey, ticks);
  }

  // stoped here so the function implementation can be added from this function => lockedBalance todo
  // todo
}
