import { keccak_256 } from '@noble/hashes/sha3';
import { bcs } from '@mysten/sui/bcs';
import { groth16, type Groth16Proof } from 'snarkjs';
import { buildPoseidon } from 'circomlibjs';
import { resolve } from 'node:path';

/**
 * Off-chain proof generation against `circuits/iwallet.circom`.
 *
 * Encoding per George's 2026-05-18 spec:
 *  - All bytes hitting the Move contract are 32-byte BIG-ENDIAN.
 *  - Circuit input is decimal field-element strings (snarkjs doesn't want bytes).
 *  - identity_hash = Poseidon([w]) computed off-chain.
 *  - intent_hash = keccak256(nonce || bcs(amount) || bcs(recipient)) with the
 *    top 3 bits of byte 0 masked to 0 — matches the contract's fix at
 *    `prototype.move`: `*first_byte = *first_byte & 0x1F;` (commit 8625025).
 */

const BN254_R =
  21888242871839275222246405745257275088548364400416034343698204186575808495617n;

function bytesToBigIntBE(b: Uint8Array): bigint {
  let x = 0n;
  for (const byte of b) x = (x << 8n) | BigInt(byte);
  return x;
}

function bigIntToBytes32BE(x: bigint): Uint8Array {
  const out = new Uint8Array(32);
  let v = x;
  for (let i = 31; i >= 0; i--) {
    out[i] = Number(v & 0xffn);
    v >>= 8n;
  }
  return out;
}

/**
 * On-chain intent_hash, byte-for-byte identical to the contract recompute:
 *   keccak256(nonce || bcs(amount: u64) || bcs(recipient: address))
 *   then mask byte[0] &= 0x1F (caps the BE-decoded scalar below BN254 r).
 */
export function computeIntentHash(
  nonce: Uint8Array,
  amount: bigint,
  recipient: string,
): Uint8Array {
  const amountBytes = bcs.u64().serialize(amount).toBytes();
  const recipientBytes = bcs.Address.serialize(recipient).toBytes();
  const buf = new Uint8Array(nonce.length + amountBytes.length + recipientBytes.length);
  buf.set(nonce, 0);
  buf.set(amountBytes, nonce.length);
  buf.set(recipientBytes, nonce.length + amountBytes.length);
  const h = keccak_256(buf);
  h[0] = h[0] & 0x1f;
  return h;
}

/** Public-inputs blob the contract expects: identity_hash (32 BE) || intent_hash (32 BE masked). */
export function assemblePublicInputs(
  identityHashBytes: Uint8Array,
  intentHashBytes: Uint8Array,
): Uint8Array {
  const out = new Uint8Array(identityHashBytes.length + intentHashBytes.length);
  out.set(identityHashBytes, 0);
  out.set(intentHashBytes, identityHashBytes.length);
  return out;
}

/** 32-byte fresh nonce. */
export function freshNonce(): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(32));
}

let poseidonInstance: Awaited<ReturnType<typeof buildPoseidon>> | null = null;
async function getPoseidon() {
  if (!poseidonInstance) poseidonInstance = await buildPoseidon();
  return poseidonInstance;
}

/** Poseidon(w) as a BN254 field element + its 32-byte BE encoding. */
export async function computeIdentityHash(
  w: bigint,
): Promise<{ field: bigint; bytes: Uint8Array }> {
  const p = await getPoseidon();
  const raw = p([w]);
  const field = p.F.toObject(raw) as bigint;
  return { field, bytes: bigIntToBytes32BE(field) };
}

function g1ToBytesBE(p: string[]): Uint8Array {
  const out = new Uint8Array(64);
  out.set(bigIntToBytes32BE(BigInt(p[0])), 0);
  out.set(bigIntToBytes32BE(BigInt(p[1])), 32);
  return out;
}

function g2ToBytesBE(p: string[][]): Uint8Array {
  // snarkjs G2: [[x.c0, x.c1], [y.c0, y.c1], [z...]]. Fp2 ordering c0 then c1.
  const out = new Uint8Array(128);
  out.set(bigIntToBytes32BE(BigInt(p[0][0])), 0);
  out.set(bigIntToBytes32BE(BigInt(p[0][1])), 32);
  out.set(bigIntToBytes32BE(BigInt(p[1][0])), 64);
  out.set(bigIntToBytes32BE(BigInt(p[1][1])), 96);
  return out;
}

/** snarkjs proof JSON -> Sui `groth16::proof_points_from_bytes` (a||b||c, 256B, BE). */
function serializeProof(proof: Groth16Proof): Uint8Array {
  const a = g1ToBytesBE(proof.pi_a);
  const b = g2ToBytesBE(proof.pi_b);
  const c = g1ToBytesBE(proof.pi_c);
  const out = new Uint8Array(256);
  out.set(a, 0);
  out.set(b, 64);
  out.set(c, 192);
  return out;
}

const WASM_PATH =
  process.env.CIRCUIT_WASM ?? resolve('../circuits/iwallet_js/iwallet.wasm');
const ZKEY_PATH =
  process.env.CIRCUIT_ZKEY ?? resolve('../circuits/iwallet_final.zkey');

export type ProofPayload = {
  proofBytes: Uint8Array;
  publicInputs: Uint8Array;
  /** Poseidon(w) BE bytes — caller can sanity-check against the stored identity_hash. */
  identityHashBytes: Uint8Array;
};

/**
 * Generate the Groth16 proof + the bytes the Move call needs.
 *
 * Inputs:
 *   - `w`: agent witness, a BN254 field element (bigint).
 *   - `intentHash`: 32 bytes from `computeIntentHash` (already masked).
 */
export async function generateProof(args: {
  w: bigint;
  intentHash: Uint8Array;
}): Promise<ProofPayload> {
  const { field: identityField, bytes: identityHashBytes } =
    await computeIdentityHash(args.w);
  const intentField = bytesToBigIntBE(args.intentHash);

  if (intentField >= BN254_R) {
    // Should be unreachable given the mask, but guard explicitly.
    throw new Error(`[proof] intent_hash >= r despite 0x1F mask: ${intentField}`);
  }

  const { proof, publicSignals } = await groth16.fullProve(
    {
      w: args.w.toString(10),
      identity_hash: identityField.toString(10),
      intent_hash: intentField.toString(10),
    },
    WASM_PATH,
    ZKEY_PATH,
  );

  if (
    publicSignals[0] !== identityField.toString(10) ||
    publicSignals[1] !== intentField.toString(10)
  ) {
    throw new Error(
      `[proof] public signal mismatch — circuit=${JSON.stringify(publicSignals)} ` +
        `expected=[${identityField},${intentField}]`,
    );
  }

  return {
    proofBytes: serializeProof(proof),
    publicInputs: assemblePublicInputs(identityHashBytes, args.intentHash),
    identityHashBytes,
  };
}
