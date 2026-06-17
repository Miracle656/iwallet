import { Transaction } from "@mysten/sui/transactions";
import { SuinsTransaction } from "@mysten/suins";
import { jsonClient } from "./lib/sui_client.ts";

import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";

import dotenv from "dotenv";
dotenv.config();

const _keypair = process.env.PK ? Ed25519Keypair.fromSecretKey(process.env.PK) : null;

export async function createLeafSubname(
  name: string,
  parentNftId: string,
  targetAddress: string, // th agent address
  transaction: Transaction,
): Promise<Transaction> {
  const suinsTransaction = new SuinsTransaction(jsonClient.suins, transaction);
  const normalizedName = name.endsWith(".iwallet.sui")
    ? name
    : name + ".iwallet.sui";
  suinsTransaction.createLeafSubName({
    parentNft: parentNftId,
    name: normalizedName,
    targetAddress,
  });

  return transaction;
}

export async function getNameRecord(name: string) {
  try {
    const nameRecord = await jsonClient.suins.getNameRecord(name);
    return nameRecord;
  } catch (error) {
    throw new Error("Failed to get name record: " + error);
  }
}
