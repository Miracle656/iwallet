import { createLeafSubname } from "../suins.ts";
import dotenv from "dotenv";
import { PACKAGE_ID, SUIN_PARENT_NFT_ID } from "../utils/platform_constant.ts";
import { Transaction } from "@mysten/sui/transactions";
import { bcs } from "@mysten/sui/bcs";
import { jsonClient } from "../lib/sui_client.ts";
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";

dotenv.config();

export class AgentService {
  packageId: string = PACKAGE_ID;
  private _keypair = Ed25519Keypair.fromSecretKey(process.env.PK!);

  async createAgent(name: string) {
    try {
      const transaction = new Transaction();
      const agent = { name };
      // get identity hash and vk bytes from onchain identity
      const identityHash = new TextEncoder().encode("test-identity");
      const vkBytes = new TextEncoder().encode("test-vk-bytes");
      // create agent policy

      const identityAddress = transaction.moveCall({
        package: this.packageId,
        module: "prototype",
        function: "create_iidentity",
        arguments: [
          transaction.pure.string(name),
          transaction.pure.vector("u8", identityHash),
          transaction.pure.vector("u8", vkBytes),
          // transaction.pure(bcs.struct("AgentPolicy", {}).serialize({})),
          transaction.pure(new Uint8Array([0])),
        ],
      }); // todo create agent onchain identity
      await createLeafSubname(
        name,
        SUIN_PARENT_NFT_ID,
        identityAddress.Result.toString(),
        transaction,
      );
      const result = await jsonClient.signAndExecuteTransaction({
        transaction,
        signer: this._keypair,
      });
      return { agent, result };
    } catch (e) {
      console.log(e);
    }
  }
}
