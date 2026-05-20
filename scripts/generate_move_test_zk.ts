import fs from "fs";
import path from "path";
import { serializeProofToLE } from "../agent/src/proof.ts";
import { serializeVKToLE } from "../agent/src/vk.ts";

// Note: If you run into import errors, you can run this as a plain .js file too.
// We must convert the SnarkJS BigInt strings to 32-byte Little-Endian hex strings.
function toLittleEndianHex(numStr: string): string {
  let hex = BigInt(numStr).toString(16).padStart(64, "0");
  let leHex = "";
  // Reverse the bytes for Sui's Arkworks backend
  for (let i = 62; i >= 0; i -= 2) {
    leHex += hex.substring(i, i + 2);
  }
  return leHex;
}

function generateMoveTestData() {
  console.log("=== SUI MOVE TEST DATA GENERATOR ===\n");

  // 1. PROCESS PUBLIC INPUTS
  const publicPath = path.join(import.meta.dirname, "../circuits/public.json");
  const publicInputs = JSON.parse(fs.readFileSync(publicPath, "utf8"));

  const identityHashLE = toLittleEndianHex(publicInputs[0]);
  const intentHashLE = toLittleEndianHex(publicInputs[1]);
  const finalPublicBytes = identityHashLE + intentHashLE;

  console.log(`// 3. Your Public Inputs ( public_inputs_bytes )`);
  console.log(`let public_inputs_bytes = x"${finalPublicBytes}";\n`);

  // 2. PROCESS PROOF & VK
  console.log(`// 1 & 2. Your VK and Proof Bytes`);
  console.log(
    `// Hijack the Solution Engineer's parser to get the complex curve bytes!`,
  );
  // Uncomment this section once you export their functions:

  const proofJson = JSON.parse(
    fs.readFileSync("../circuits/proof.json", "utf8"),
  );
  const vkJson = JSON.parse(
    fs.readFileSync("../circuits/verification_key.json", "utf8"),
  );

  const proofHex = serializeProofToLE(proofJson);
  const vkHex = serializeVKToLE(vkJson);

  console.log('let vk_bytes = x"' + vkHex + '";');
  console.log('let proof_bytes = x"' + proofHex + '";');
}

generateMoveTestData();
