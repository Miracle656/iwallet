import { keccak_256 } from '@noble/hashes/sha3';
import { bcs } from '@mysten/sui/bcs';
import { groth16, type Groth16Proof } from 'snarkjs';
import { resolve } from 'node:path';

/**
 * Compute the on-chain intent_hash exactly as `iwallet::prototype::withdraw_with_proof`
 * does it: `keccak256(nonce || bcs(amount: u64) || bcs(recipient: address))`.
 *
 * The agent computes this off-chain so the prover can pin it as a public input;
 * the contract recomputes from the call args and asserts equality.
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
  return keccak_256(buf);
}

/**
 * Public-inputs byte layout the verifier reads: identity_hash || intent_hash.
 * Matches the on-chain `expected_public_inputs` assert in withdraw_with_proof
 * (32-byte identity_hash followed by the 32-byte keccak intent_hash).
 */
export function assemblePublicInputs(
  identityHash: Uint8Array,
  intentHash: Uint8Array,
): Uint8Array {
  const out = new Uint8Array(identityHash.length + intentHash.length);
  out.set(identityHash, 0);
  out.set(intentHash, identityHash.length);
  return out;
}

/** 32-byte fresh nonce. */
export function freshNonce(): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(32));
}

export type ProofPayload = {
  proofBytes: Uint8Array;
  publicInputs: Uint8Array;
};

/** BN254 scalar field modulus r. */
const BN254_R =
  21888242871839275222246405745257275088548364400416034343698204186575808495617n;

function bytesToBigIntLE(b: Uint8Array): bigint {
  let x = 0n;
  for (let i = b.length - 1; i >= 0; i--) x = (x << 8n) | BigInt(b[i]);
  return x;
}

function bytesToBigIntBE(b: Uint8Array): bigint {
  let x = 0n;
  for (const byte of b) x = (x << 8n) | BigInt(byte);
  return x;
}

/** Serialize a field element as 32-byte little-endian (arkworks / Sui groth16). */
function fieldToBytesLE(x: bigint): Uint8Array {
  const out = new Uint8Array(32);
  let v = x;
  for (let i = 0; i < 32; i++) {
    out[i] = Number(v & 0xffn);
    v >>= 8n;
  }
  return out;
}

function g1ToBytes(p: string[]): Uint8Array {
  // snarkjs gives projective [x, y, z] with z == "1" (already affine).
  const out = new Uint8Array(64);
  out.set(fieldToBytesLE(BigInt(p[0])), 0);
  out.set(fieldToBytesLE(BigInt(p[1])), 32);
  return out;
}

function g2ToBytes(p: string[][]): Uint8Array {
  // snarkjs: [[x.c0, x.c1], [y.c0, y.c1], [z...]]. arkworks Fq2 = c0 + c1*u,
  // serialized c0 then c1, each 32-byte LE; point order x then y.
  const out = new Uint8Array(128);
  out.set(fieldToBytesLE(BigInt(p[0][0])), 0);
  out.set(fieldToBytesLE(BigInt(p[0][1])), 32);
  out.set(fieldToBytesLE(BigInt(p[1][0])), 64);
  out.set(fieldToBytesLE(BigInt(p[1][1])), 96);
  return out;
}

/** snarkjs proof JSON -> Sui `groth16::proof_points_from_bytes` (a||b||c, 256 bytes). */
function serializeProof(proof: Groth16Proof): Uint8Array {
  const a = g1ToBytes(proof.pi_a);
  const b = g2ToBytes(proof.pi_b);
  const c = g1ToBytes(proof.pi_c);
  const out = new Uint8Array(a.length + b.length + c.length);
  out.set(a, 0);
  out.set(b, a.length);
  out.set(c, a.length + b.length);
  return out;
}

const WASM_PATH =
  process.env.CIRCUIT_WASM ?? resolve('../circuits/iwallet_js/iwallet.wasm');
const ZKEY_PATH =
  process.env.CIRCUIT_ZKEY ?? resolve('../circuits/iwallet_final.zkey');

/**
 * Generate the Groth16 proof for this intent.
 *
 * Circuit (circuits/iwallet.circom): private `w`; public [identity_hash,
 * intent_hash]; constrains identity_hash === Poseidon(w). Curve BN254, groth16.
 *
 * ENCODING ASSUMPTIONS (George shipped no reference converter — confirm these):
 *   - Public input field value = little-endian decode of the 32 bytes the
 *     contract puts in `public_inputs_bytes` (Sui groth16 = 32-byte LE scalars).
 *   - `w` env value (AGENT_WITNESS_W) decoded big-endian (natural hex order).
 *   - Proof points serialized arkworks-style: 32-byte LE, G1 = x||y,
 *     G2 = x.c0||x.c1||y.c0||y.c1, proof = a||b||c.
 *   - KNOWN RISK: keccak256 is 256-bit; ~79% of values exceed BN254 r. We feed
 *     snarkjs `intent mod r`, but the contract passes the RAW keccak bytes to
 *     Sui, which rejects non-canonical (>= r) scalars. When that happens the
 *     on-chain verify aborts regardless of proof validity. This is a protocol
 *     issue for @oxgeorgegoldman, not something to paper over here.
 *
 * Until proven against a real on-chain verify, `iwallet.ts` keeps its stub gate
 * (no SUI_PRIVATE_KEY / AGENT_WITNESS_W -> fake digest).
 */
export async function generateProof(args: {
  witness: Uint8Array;
  identityHash: Uint8Array;
  intentHash: Uint8Array;
}): Promise<ProofPayload> {
  const w = bytesToBigIntBE(args.witness) % BN254_R;
  const identityField = bytesToBigIntLE(args.identityHash) % BN254_R;
  const intentField = bytesToBigIntLE(args.intentHash) % BN254_R;

  const { proof, publicSignals } = await groth16.fullProve(
    {
      w: w.toString(),
      identity_hash: identityField.toString(),
      intent_hash: intentField.toString(),
    },
    WASM_PATH,
    ZKEY_PATH,
  );

  // Sanity: circuit's public signals must be [identity_hash, intent_hash].
  if (
    publicSignals[0] !== identityField.toString() ||
    publicSignals[1] !== intentField.toString()
  ) {
    throw new Error(
      `[proof] public signal mismatch: circuit=${JSON.stringify(publicSignals)} ` +
        `expected=[${identityField},${intentField}]`,
    );
  }

  return {
    proofBytes: serializeProof(proof),
    publicInputs: assemblePublicInputs(args.identityHash, args.intentHash),
  };
}
