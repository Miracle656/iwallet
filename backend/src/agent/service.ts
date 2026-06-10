import dotenv from "dotenv";
import { Transaction } from "@mysten/sui/transactions";
import { bcs } from "@mysten/sui/bcs";
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";

import { PACKAGE_ID, SUIN_PARENT_NFT_ID } from "../utils/platform_constant.ts";
import { jsonClient } from "../lib/sui_client.ts";
import { createLeafSubname } from "../suins.ts";

// 1. Import your ZK helpers
import { verificationKeyToBytes } from "./vk.ts";
import { generateAgentIdentity } from "../utils/zk.ts";
import * as path from "node:path";

dotenv.config();

export class AgentService {
  packageId: string = PACKAGE_ID;
  private _keypair = Ed25519Keypair.fromSecretKey(process.env.PK!);

  async createAgent(name: string) {
    try {
      console.log(`🤖 Initializing new Agent: ${name}...`);
      // 1. Generate Identity Hash (The Vault Lock)
      const { secret, identityHash } = await generateAgentIdentity();
      console.log(`🔑 WARNING: Save this Agent Secret! -> ${secret}`);

      // 2. Load and Parse the Verifying Key directly to Uint8Array
      const vkPath = path.resolve(
        process.cwd(),
        "../circuits/verification_key.json",
      );

      // This single function reads the JSON and formats the Arkworks bytes perfectly
      const vkBytes = verificationKeyToBytes(vkPath);

      // 3. Build the Sui Transaction
      const transaction = new Transaction();
      const agent = { name };
      // get identity hash and vk bytes from onchain identity

      const identityAddress = transaction.moveCall({
        package: this.packageId,
        module: "prototype",
        function: "create_iidentity",
        typeArguments: ["0x2::sui::SUI"],
        arguments: [
          transaction.pure.string(name),
          transaction.pure.vector("u8", identityHash),
          transaction.pure.vector("u8", vkBytes),
          // transaction.pure(bcs.struct("AgentPolicy", {}).serialize({})),
        ],
      });
      // todo create agent suins
      await createLeafSubname(
        name,
        SUIN_PARENT_NFT_ID,
        identityAddress.Result.toString(),
        transaction,
      );
      const result = await jsonClient.signAndExecuteTransaction({
        transaction,
        signer: this._keypair,
        options: {
          showEffects: true,
          showEvents: true,
        },
      });
      const createdObjects =
        result.effects?.created?.map((c) => c.reference.objectId) || [];
      return {
        agentName: name,
        iWalletId: createdObjects[0], // The ID of the shared identity object
        digest: result.digest,
        secret_w: secret, // 🔥 Pass it back to the caller
      };
    } catch (e) {
      console.log(e);
    }
  }
}
