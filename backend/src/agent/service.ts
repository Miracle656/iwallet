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
import { toBase64 } from "@mysten/sui/utils";

dotenv.config();

export class AgentService {
  packageId: string = PACKAGE_ID;
  private _keypair = Ed25519Keypair.fromSecretKey(process.env.PK!);

  async buildCreateAgentTx(name: string, sender: string) {
    try {
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

      createTX.setSender(sender);
      const bytes = await createTX.build({ client: jsonClient });
      const createTxBytes = toBase64(bytes);

      return {
        createIIdentityByte: createTxBytes,
      };
    } catch (e) {
      console.error("❌ Failed to build agent tx:", e);
      throw e;
    }
  }

  async createAgentName(name: string, identityAddress: string, sender: string) {
    const nameExist = await this.getNameRecord(name);
    if (nameExist) {
      return { message: "Name record already exists" };
    }
    const reformedName = name.endsWith("iwallet.sui")
      ? name
      : `${name}.iwallet.sui`;

    const suinsTx = new Transaction();
    let resultFromNSCreation = await createLeafSubname(
      reformedName,
      SUIN_PARENT_NFT_ID,
      identityAddress,
      suinsTx,
    );
    resultFromNSCreation.setSender(sender);
    const byte = await resultFromNSCreation.build({ client: jsonClient });
    const suinsTxBytes = toBase64(byte);
    return {
      suinsTxBytes: suinsTxBytes,
    };
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
