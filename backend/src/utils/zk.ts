import { buildPoseidon } from "circomlibjs";
import * as crypto from "node:crypto";

export async function generateAgentIdentity(): Promise<{
  secret: string;
  identityHash: Uint8Array;
}> {
  const poseidon = await buildPoseidon();

  // 1. Generate a secure random 32-byte secret for the agent (this is `w`)
  // Note: We mask it to ensure it fits within the BN254 scalar field
  const secretBytes = crypto.randomBytes(31);
  const secretBigInt = BigInt("0x" + secretBytes.toString("hex"));

  // 2. Hash the secret using Poseidon
  const hash = poseidon([secretBigInt]);
  const hashBigInt = poseidon.F.toObject(hash); // Convert out of Montgomery form

  // 3. Convert the BigInt hash to a 32-byte Little-Endian Uint8Array for Sui
  const identityHash = new Uint8Array(32);
  let temp = hashBigInt;
  for (let i = 0; i < 32; i++) {
    identityHash[i] = Number(temp & 0xffn);
    temp >>= 8n;
  }

  return {
    secret: secretBigInt.toString(), // The Agent needs this later!
    identityHash: identityHash, // The Move contract needs this now!
  };
}
