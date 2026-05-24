/**
 * Client-side witness generation for I-Wallet identity genesis.
 *
 * The secret witness `w` is generated in the browser and never leaves it
 * (the user keeps it as a recovery key). identity_hash = Poseidon([w]),
 * encoded as 32-byte little-endian — this MUST match the agent's
 * `computeIdentityHash` (agent/src/proof.ts), which is what the circuit and
 * the on-chain verifier expect.
 *
 * ⚠️ Cross-check before trusting proofs: generate one `w` here and confirm the
 * identity_hash equals agent `computeIdentityHash(w)` for the same `w`. The
 * agent uses circomlibjs Poseidon; poseidon-lite is circomlib-compatible for
 * a single input, but verify the round constants match for this circuit.
 */

import { poseidon1 } from "poseidon-lite";

// BigInt() calls (not `n` literals) so this compiles under the project's
// ES2017 target without depending on a tsconfig bump.
export const BN254_R = BigInt(
  "21888242871839275222246405745257275088548364400416034343698204186575808495617",
);

const ZERO = BigInt(0);
const ONE = BigInt(1);
const EIGHT = BigInt(8);
const BYTE_MASK = BigInt(255);

/** Random scalar in the BN254 field, used as the secret witness `w`. */
export function generateWitness(): bigint {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  let x = ZERO;
  for (let i = 0; i < 32; i++) x = (x << EIGHT) | BigInt(bytes[i]);
  x = x % BN254_R;
  return x === ZERO ? ONE : x;
}

function bigIntToBytes32LE(x: bigint): Uint8Array {
  const out = new Uint8Array(32);
  let v = x;
  for (let i = 0; i < 32; i++) {
    out[i] = Number(v & BYTE_MASK);
    v >>= EIGHT;
  }
  return out;
}

export function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * identity_hash = Poseidon([w]) as a field element, encoded 32-byte LE.
 * Mirrors agent/src/proof.ts computeIdentityHash.
 */
export function computeIdentityHash(w: bigint): {
  field: bigint;
  bytesLE: Uint8Array;
  hex: string;
} {
  const field = poseidon1([w]);
  const bytesLE = bigIntToBytes32LE(field);
  return { field, bytesLE, hex: "0x" + bytesToHex(bytesLE) };
}

/** Hex form of the witness, for the recovery file the user keeps. */
export function witnessToHex(w: bigint): string {
  return "0x" + w.toString(16).padStart(64, "0");
}
