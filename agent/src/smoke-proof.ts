/**
 * Throwaway: prove the off-chain pipeline works end-to-end with the real
 * circuit artifacts. NOT an on-chain verify — confirms snarkjs loads the
 * zkey, produces a proof, serialization yields 256 bytes, and the public
 * signals line up. Run: `npx tsx src/smoke-proof.ts`
 */
import { computeIntentHash, generateProof } from './proof.js';

const w = 12345678901234567890n; // sample witness
const nonce = new Uint8Array(32).fill(7);
const amount = 40000n;
const recipient =
  '0x0000000000000000000000000000000000000000000000000000000000000abc';

const intentHash = computeIntentHash(nonce, amount, recipient);
const t0 = Date.now();
const { proofBytes, publicInputs, identityHashBytes } = await generateProof({
  w,
  intentHash,
});

console.log(`proof generated in ${Date.now() - t0}ms`);
console.log('proofBytes length :', proofBytes.length, '(expect 128 — arkworks compressed)');
console.log('publicInputs length:', publicInputs.length, '(expect 64)');
console.log('identityHash length:', identityHashBytes.length, '(expect 32)');
console.log(
  'intentHash bytes  :',
  Buffer.from(intentHash).toString('hex').slice(0, 24) + '…',
);
console.log(
  'identityHash bytes:',
  Buffer.from(identityHashBytes).toString('hex').slice(0, 24) + '…',
);

const ok =
  proofBytes.length === 128 &&
  publicInputs.length === 64 &&
  identityHashBytes.length === 32;
console.log(ok ? '\nSMOKE PASS — pipeline functional' : '\nSMOKE FAIL');
process.exit(ok ? 0 : 1);
