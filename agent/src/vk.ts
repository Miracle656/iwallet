import { readFileSync } from 'node:fs';

/**
 * Convert a snarkjs `verification_key.json` (BN254 groth16) into the
 * `vk_bytes` blob Sui's `groth16::prepare_verifying_key(&bn254(), &vk_bytes)`
 * expects.
 *
 * Layout = arkworks-canonical, uncompressed, little-endian:
 *   alpha_g1 (G1, 64B)
 *   beta_g2  (G2, 128B)
 *   gamma_g2 (G2, 128B)
 *   delta_g2 (G2, 128B)
 *   IC / gamma_abc_g1: arkworks Vec<G1> = u64 LE length prefix (8B) then
 *                      (nPublic+1) G1 points (64B each)
 *
 * ASSUMPTION (same class as the proof-point LE question George answered):
 * the IC vector carries the 8-byte arkworks length prefix. If the first
 * on-chain `prepare_verifying_key`/verify aborts, drop `IC_LENGTH_PREFIX`.
 */

const IC_LENGTH_PREFIX = true;

function fieldToBytes32LE(x: bigint): Uint8Array {
  const out = new Uint8Array(32);
  let v = x;
  for (let i = 0; i < 32; i++) {
    out[i] = Number(v & 0xffn);
    v >>= 8n;
  }
  return out;
}

function g1(p: string[]): Uint8Array {
  const out = new Uint8Array(64);
  out.set(fieldToBytes32LE(BigInt(p[0])), 0);
  out.set(fieldToBytes32LE(BigInt(p[1])), 32);
  return out;
}

function g2(p: string[][]): Uint8Array {
  const out = new Uint8Array(128);
  out.set(fieldToBytes32LE(BigInt(p[0][0])), 0);
  out.set(fieldToBytes32LE(BigInt(p[0][1])), 32);
  out.set(fieldToBytes32LE(BigInt(p[1][0])), 64);
  out.set(fieldToBytes32LE(BigInt(p[1][1])), 96);
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
    g1(vk.vk_alpha_1),
    g2(vk.vk_beta_2),
    g2(vk.vk_gamma_2),
    g2(vk.vk_delta_2),
  ];
  if (IC_LENGTH_PREFIX) parts.push(u64LE(vk.IC.length));
  for (const ic of vk.IC) parts.push(g1(ic));

  const total = parts.reduce((n, p) => n + p.length, 0);
  const out = new Uint8Array(total);
  let off = 0;
  for (const p of parts) {
    out.set(p, off);
    off += p.length;
  }
  return out;
}

// Allow `npx tsx src/vk.ts [path]` as a quick check.
if (process.argv[1]?.endsWith('vk.ts')) {
  const path = process.argv[2] ?? '../circuits/verification_key.json';
  const bytes = verificationKeyToBytes(path);
  console.log(`vk_bytes: ${bytes.length} bytes`);
  console.log(`hex head: ${Buffer.from(bytes).toString('hex').slice(0, 32)}…`);
}
