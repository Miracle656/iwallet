import { keccak_256 } from '@noble/hashes/sha3';
import { bcs } from '@mysten/sui/bcs';

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

/** Public-inputs byte layout the verifier reads: identity_hash || intent_hash. */
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

/**
 * Generate the Groth16 proof for this intent.
 *
 * BLOCKED on George shipping the circuit artifacts:
 *   - the proving key (.zkey)
 *   - the prover invocation (snarkjs WASM, arkworks Rust binary, or similar)
 *
 * Once available, this should:
 *   1. Run the circuit with private witness `w` and public inputs
 *      [identityHash, intentHash].
 *   2. Return the serialized proof bytes (BN254 Groth16, as `sui::groth16`
 *      expects) plus the public-inputs blob.
 *
 * Until then, the agent runs in stub mode (`iwallet.ts` short-circuits when
 * SUI_PRIVATE_KEY or AGENT_WITNESS_W is missing).
 */
export async function generateProof(_args: {
  witness: Uint8Array;
  identityHash: Uint8Array;
  intentHash: Uint8Array;
}): Promise<ProofPayload> {
  throw new Error(
    'generateProof not implemented — blocked on circuit artifacts from @oxgeorgegoldman',
  );
}
