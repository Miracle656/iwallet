/**
 * Signs and executes a Sui Transaction using a stored zkLogin session.
 * The session (ephemeral key + ZK proof) was stored by /v1/auth/zklogin/store
 * after the user completed Google sign-in.
 */
import crypto from "node:crypto";
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import { decodeJwt, genAddressSeed, getZkLoginSignature } from "@mysten/sui/zklogin";
import { toBase64 } from "@mysten/sui/utils";
import type { Transaction } from "@mysten/sui/transactions";
import { getZkSession } from "./zklogin-store.ts";
import { jsonClient } from "./sui_client.ts";

export async function executeWithZkLogin(
  agentId: string,
  tx: Transaction,
): Promise<{ digest: string; effects?: unknown }> {
  const session = getZkSession(agentId);
  if (!session) throw new Error("No active session — user must sign in again");

  // Epoch check
  const { epoch } = await jsonClient.getLatestSuiSystemState();
  if (Number(epoch) > session.maxEpoch) {
    throw new Error(`zkLogin session expired (epoch ${epoch} > maxEpoch ${session.maxEpoch}) — sign in again`);
  }

  tx.setSenderIfNotSet(session.address);
  const txBytes = await tx.build({ client: jsonClient as any });

  const ephemeral = Ed25519Keypair.fromSecretKey(
    Uint8Array.from(Buffer.from(session.ephemeralPrivKey, "base64")),
  );
  const { signature: ephemeralSig } = await ephemeral.signTransaction(txBytes);

  // addressSeed not stored — recompute from jwt + salt
  const decoded = decodeJwt(session.jwt);
  const aud = Array.isArray(decoded.aud)
    ? (decoded.aud as string[])[0]
    : (decoded.aud as string);
  const addressSeed = genAddressSeed(
    BigInt(session.salt),
    "sub",
    decoded.sub as string,
    aud,
  ).toString();

  const zkSig = getZkLoginSignature({
    inputs: {
      ...(session.zkProof as object),
      addressSeed,
    } as Parameters<typeof getZkLoginSignature>[0]["inputs"],
    maxEpoch: session.maxEpoch,
    userSignature: ephemeralSig,
  });

  return await jsonClient.executeTransactionBlock({
    transactionBlock: toBase64(txBytes),
    signature: zkSig,
    options: { showEffects: true, showObjectChanges: true },
  }) as { digest: string; effects?: unknown };
}
