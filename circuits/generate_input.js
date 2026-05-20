const { buildPoseidon } = require("circomlibjs");
const fs = require("fs");

async function generate() {
  // 1. Initialize the Poseidon hash engine
  const poseidon = await buildPoseidon();

  // 2. Your secret witness
  const w = "123456789";

  // 3. Calculate the exact Hash
  const hashBuffer = poseidon([w]);

  // 4. Convert it to the BigInt string the circuit expects
  const identity_hash = poseidon.F.toString(hashBuffer);

  // 5. Build the JSON
  const input = {
    w: w,
    identity_hash: identity_hash,
    intent_hash: "112233445566778899", // Dummy intent for this test
  };

  // 6. Save it to input.json
  fs.writeFileSync("input.json", JSON.stringify(input, null, 2));

  console.log("✅ Successfully generated input.json!");
  console.log("Real Identity Hash:", identity_hash);
}

generate();
