import { readFileSync } from 'node:fs';

/**
 * snarkjs `verification_key.json` (BN254 groth16) -> Sui `vk_bytes`.
 *
 * Per Sui's groth16.move: `verifying_key: An Arkworks canonical COMPRESSED
 * serialization of a verifying key.` So G1 = 32B, G2 = 64B, with the y-sign
 * flag packed into the top bit of the last byte (arkworks SWFlags::NegativeY
 * = 0x80). Field elements are 32-byte little-endian.
 *
 * Layout = arkworks `VerifyingKey<Bn254>` canonical:
 *   alpha_g1 (32)
 *   beta_g2  (64)
 *   gamma_g2 (64)
 *   delta_g2 (64)
 *   gamma_abc_g1 / IC: arkworks Vec<G1> = u64 LE length (8B) + n × 32B
 *
 * For nPublic=2 -> 32 + 3×64 + 8 + 3×32 = 328 bytes.
 */

/** BN254 base field modulus (alt_bn128 q). */
const Q =
  21888242871839275222246405745257275088696311157297823662689037894645226208583n;
const Q_HALF = (Q - 1n) / 2n;

function fpIsNeg(y: bigint): boolean {
  return y > Q_HALF;
}

/** arkworks Fp2 Ord compares (c1, c0); y_sign = y > -y under that compare. */
function fp2IsNeg(c0: bigint, c1: bigint): boolean {
  if (c1 === 0n) return fpIsNeg(c0);
  return fpIsNeg(c1);
}

function fieldToBytes32LE(x: bigint): Uint8Array {
  const out = new Uint8Array(32);
  let v = ((x % Q) + Q) % Q;
  for (let i = 0; i < 32; i++) {
    out[i] = Number(v & 0xffn);
    v >>= 8n;
  }
  return out;
}

/** Compressed G1: x (32B LE) with y-sign flag in top bit of byte[31]. */
function g1Compressed(p: string[]): Uint8Array {
  const x = BigInt(p[0]);
  const y = BigInt(p[1]);
  const out = fieldToBytes32LE(x);
  if (fpIsNeg(y)) out[31] |= 0x80;
  return out;
}

/** Compressed G2: x.c0||x.c1 (64B LE total) with y-sign flag in top bit of byte[63]. */
function g2Compressed(p: string[][]): Uint8Array {
  const out = new Uint8Array(64);
  out.set(fieldToBytes32LE(BigInt(p[0][0])), 0);
  out.set(fieldToBytes32LE(BigInt(p[0][1])), 32);
  if (fp2IsNeg(BigInt(p[1][0]), BigInt(p[1][1]))) out[63] |= 0x80;
  return out;
}

function u64LE(n: number): Uint8Array {
  const out = new Uint8Array(8);
  let v = BigInt(n);
  for (let i = 0; i < 8; i++) {
    out[i] = Number(v & 0xffn);
    v >>= 8n;
  }
  return out;
}

type SnarkjsVk = {
  protocol: string;
  curve: string;
  nPublic: number;
  vk_alpha_1: string[];
  vk_beta_2: string[][];
  vk_gamma_2: string[][];
  vk_delta_2: string[][];
  IC: string[][];
};

export function verificationKeyToBytes(vkJsonPath: string): Uint8Array {
  const vk = JSON.parse(readFileSync(vkJsonPath, 'utf8')) as SnarkjsVk;
  if (vk.protocol !== 'groth16' || vk.curve !== 'bn128') {
    throw new Error(`[vk] expected groth16/bn128, got ${vk.protocol}/${vk.curve}`);
  }

  const parts: Uint8Array[] = [
    g1Compressed(vk.vk_alpha_1),
    g2Compressed(vk.vk_beta_2),
    g2Compressed(vk.vk_gamma_2),
    g2Compressed(vk.vk_delta_2),
    u64LE(vk.IC.length),
  ];
  for (const ic of vk.IC) parts.push(g1Compressed(ic));

  const total = parts.reduce((n, p) => n + p.length, 0);
  const out = new Uint8Array(total);
  let off = 0;
  for (const p of parts) {
    out.set(p, off);
    off += p.length;
  }
  return out;
}

// Quick check: `npx tsx src/vk.ts [path]`.
if (process.argv[1]?.endsWith('vk.ts')) {
  const path = process.argv[2] ?? '../circuits/verification_key.json';
  const bytes = verificationKeyToBytes(path);
  console.log(`vk_bytes: ${bytes.length} bytes (expect 328 for nPublic=2)`);
  console.log(`hex head: ${Buffer.from(bytes).toString('hex').slice(0, 32)}…`);
}
