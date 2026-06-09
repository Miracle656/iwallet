import { Transaction } from "@mysten/sui/transactions";
import { SuinsTransaction } from "@mysten/suins";
import { jsonClient } from "./lib/sui_client.ts";

import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";

import dotenv from "dotenv";
dotenv.config();

const _keypair = Ed25519Keypair.fromSecretKey(process.env.PK!);

export async function createLeafSubname(
  name: string,
  parentNftId: string,
  targetAddress: string, // th agent address
) {
  const transaction = new Transaction();
  const suinsTransaction = new SuinsTransaction(jsonClient.suins, transaction);

  suinsTransaction.createLeafSubName({
    parentNft: parentNftId,
    name,
    targetAddress,
  });

  jsonClient.signAndExecuteTransaction({
    transaction,
    signer: _keypair,
  });
}
