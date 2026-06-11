import dotenv from "dotenv";
import { Transaction } from "@mysten/sui/transactions";

import { PACKAGE_ID, SUIN_PARENT_NFT_ID } from "../utils/platform_constant.ts";
import { createLeafSubname, getNameRecord } from "../suins.ts";

// 1. Import your ZK helpers
import { verificationKeyToBytes } from "./vk.ts";
import { generateAgentIdentity } from "../utils/zk.ts";
import * as path from "node:path";
import { jsonClient } from "../lib/sui_client.ts";
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";

dotenv.config();

export class AgentService {
  packageId: string = PACKAGE_ID;
  private _keypair = Ed25519Keypair.fromSecretKey(process.env.PK!);

  async buildCreateAgentTx(name: string, userAddress: string) {
    try {
      const nameExist = await this.getNameRecord(name);
      if (nameExist) {
        return { message: "Name record already exists" };
      }
      console.log(`🤖 Building Agent creation PTB for: ${name}...`);
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

      const reformedName = name.endsWith("iwallet.sui")
        ? name
        : `${name}.iwallet.sui`;
      // get identity hash and vk bytes from onchain identity
      const createTX = new Transaction();
      createTX.moveCall({
        package: this.packageId,
        module: "prototype",
        function: "create_iidentity",
        typeArguments: ["0x2::sui::SUI"],
        arguments: [
          createTX.pure.string(name),
          createTX.pure.vector("u8", identityHash),
          createTX.pure.vector("u8", vkBytes),
          // transaction.pure(bcs.struct("AgentPolicy", {}).serialize({})),
        ],
      });

      const createResult = await jsonClient.signAndExecuteTransaction({
        transaction: createTX,
        signer: this._keypair,
      });

      const createdObj = createResult.objectChanges?.find(
        (c) => c.type === "created" && c.objectType?.includes("IIdentity"),
      );
      if (!createdObj || createdObj.type !== "created") {
        throw new Error("Identity creation failed");
      }

      const identityAddress = createdObj.objectId;

      const suinsTx = new Transaction();

      // const nameExist = await this.getNameRecord(name);

      // todo create agent suins
      let resultFromNSCreation = await createLeafSubname(
        reformedName,
        SUIN_PARENT_NFT_ID,
        identityAddress,
        suinsTx,
      );

      const result = await jsonClient.signAndExecuteTransaction({
        transaction: suinsTx,
        signer: this._keypair,
        options: {
          showEffects: true,
          showEvents: true,
        },
      });
      return { identityAddress, result };
      return {
        agentName: name,
        secret_w: secret, // 🔥 Pass it back to the caller
        // txBytes: txBytes,
      };
    } catch (e) {
      console.error("❌ Failed to build agent tx:", e);
      throw e;
    }
  }

  async getNameRecord(name: string) {
    const reformedName = name.endsWith(".iwallet.sui")
      ? name
      : `${name}.iwallet.sui`;
    try {
      return await getNameRecord(reformedName);
    } catch (error: any) {
      if (error?.message?.includes("does not exist")) {
        return null;
      }
      throw new Error("Failed to get name record: " + error);
    }
  }
}
