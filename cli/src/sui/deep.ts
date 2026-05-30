import { SuiGrpcClient } from "@mysten/sui/grpc";
import { deepbook } from "@mysten/deepbook-v3";
import { type Transaction } from "@mysten/sui/transactions";
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import dotenv from "dotenv";
dotenv.config();

export class DeepBookService {
  private _keypair = Ed25519Keypair.fromSecretKey(process.env.PK!);
  tx: Transaction;

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
}
