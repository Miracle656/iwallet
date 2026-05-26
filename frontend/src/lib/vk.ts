/**
 * Browser port of agent/src/vk.ts — converts a snarkjs `verification_key.json`
 * into the Sui `vk_bytes` (arkworks canonical COMPRESSED serialization for
 * `Groth16<Bn254>`). For nPublic=2 → 328 bytes. No `fs`; takes the JSON object
 * directly (loaded via fetch from /public/circuits/verification_key.json).
 */

const Q = BigInt(
  "21888242871839275222246405745257275088696311157297823662689037894645226208583",
);
const Q_HALF = (Q - BigInt(1)) / BigInt(2);
const BYTE = BigInt(255);
const EIGHT = BigInt(8);

function fpIsNeg(y: bigint): boolean {
  return y > Q_HALF;
}

function fp2IsNeg(c0: bigint, c1: bigint): boolean {
  if (c1 === BigInt(0)) return fpIsNeg(c0);
  return fpIsNeg(c1);
}

function fieldToBytes32LE(x: bigint): Uint8Array {
  const out = new Uint8Array(32);
  let v = ((x % Q) + Q) % Q;
  for (let i = 0; i < 32; i++) {
    out[i] = Number(v & BYTE);
    v >>= EIGHT;
  }
  return out;
}

function g1Compressed(p: string[]): Uint8Array {
  const out = fieldToBytes32LE(BigInt(p[0]));
  if (fpIsNeg(BigInt(p[1]))) out[31] |= 0x80;
  return out;
}

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
    out[i] = Number(v & BYTE);
    v >>= EIGHT;
  }
  return out;
}

export type SnarkjsVk = {
  protocol: string;
  curve: string;
  nPublic: number;
  vk_alpha_1: string[];
  vk_beta_2: string[][];
  vk_gamma_2: string[][];
  vk_delta_2: string[][];
  IC: string[][];
};

export function verificationKeyToBytes(vk: SnarkjsVk): Uint8Array {
  if (vk.protocol !== "groth16" || vk.curve !== "bn128") {
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

let cached: Uint8Array | null = null;
/** Fetch the static vk.json and cache the converted bytes in memory. */
export async function fetchVerificationKeyBytes(
  url = "/circuits/verification_key.json",
): Promise<Uint8Array> {
  if (cached) return cached;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status}`);
  const vk = (await res.json()) as SnarkjsVk;
  cached = verificationKeyToBytes(vk);
  return cached;
}
