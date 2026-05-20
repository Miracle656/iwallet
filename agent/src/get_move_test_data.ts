import { verificationKeyToBytes } from "./vk";
import { generateProof, computeIntentHash, freshNonce } from "./proof";
import { resolve } from "path";

async function main() {
  console.log("=== SUI MOVE TEST DATA GENERATOR ===");

  // 1. Get VK Bytes
  const vkPath = resolve("../circuits/verification_key.json");
  const vkBytes = verificationKeyToBytes(vkPath);
  console.log(`\n// 1. VK Bytes`);
  console.log(`let vk_bytes = x"${Buffer.from(vkBytes).toString("hex")}";`);

  // 2. Setup a mock transaction (This proves the Intent Binding!)
  const w = 123456789n; // Our secret witness
  const nonce = freshNonce();
  const amount = 1_000_000_000n; // 1 SUI
  const recipient =
    "0x000000000000000000000000000000000000000000000000000000000000cafe";

  // 3. Generate the intent hash exactly how the contract does
  const intentHash = computeIntentHash(nonce, amount, recipient);

  // 4. Generate the Proof and Public Inputs
  const payload = await generateProof({ w, intentHash });

  console.log(`\n// 2. Proof Bytes`);
  console.log(
    `let proof_bytes = x"${Buffer.from(payload.proofBytes).toString("hex")}";`,
  );

  console.log(`\n// 3. Public Inputs (Identity Hash + Intent Hash LE)`);
  console.log(
    `let public_inputs_bytes = x"${Buffer.from(payload.publicInputs).toString("hex")}";`,
  );

  console.log(
    `\n// 4. Transaction Arguments for Move (Pass these to withdraw_with_proof!)`,
  );
  console.log(`let nonce = x"${Buffer.from(nonce).toString("hex")}";`);
  console.log(`let amount: u64 = 1000000000;`);
  console.log(`let recipient = @${recipient};`);
  console.log(`let key = string::utf8(b"SUI");`);
}

main().catch(console.error);
