import { Transaction } from "@mysten/sui/transactions";
import { SuiGrpcClient } from "@mysten/sui/grpc";
import "dotenv/config";

// We need a client just to properly build the transaction bytes
const client = new SuiGrpcClient({
  network: "testnet",
  baseUrl: "https://fullnode.testnet.sui.io:443",
});

async function runEndToEndTest() {
  console.log("🛠️ Building dummy transaction...");

  // 1. Construct a dummy transaction
  const tx = new Transaction();

  // For the SDK to build this successfully, it needs to know who is paying gas.
  // In a real scenario, Jack's frontend sets the sender to the Sponsor's address.
  // Replace this with your actual sponsor address for testing.
  const SPONSOR_ADDRESS =
    "0xa35de887586ac1a9e644bc8f1b24a0d54c6eea66b8feef8bfd94297adde8d479";
  tx.setSender(SPONSOR_ADDRESS);

  // Add a simple dummy move to make the transaction structurally valid
  const [coin] = tx.splitCoins(tx.gas, [tx.pure.u64(1000)]);
  tx.transferObjects([coin], SPONSOR_ADDRESS);

  // Serialize the transaction to JSON so it can be sent over HTTP safely
  const txBytes = await tx.toJSON();

  // 2. Mock the Kimi Agent Receipt
  console.log("🧠 Mocking Kimi Agent receipt...");
  const mockReceipt = {
    agent_id: "0xMockIdentityObjectID",
    amount: 1000,
    target: "pool_lakers_vs_warriors",
    action_type: "PLACE_BET",
    rationale:
      "Kimi 2.6 detected a 15% edge on the Lakers spread due to injury reports.",
    metadata: {
      sport: "NBA",
      home: "LAL",
      away: "GSW",
      odds: 1.95,
    },
  };

  // 3. Fire it at the Gas Station
  console.log("🚀 Firing request to Gas Station API...");
  try {
    const response = await fetch("http://localhost:3000/agent/execute", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // This MUST match what's in your .env
        "X-IWALLET-API-KEY": process.env.API_SECRET || "",
      },
      body: JSON.stringify({
        txBytes: txBytes,
        receipt: mockReceipt,
      }),
    });

    const data = await response.json();

    if (response.ok) {
      console.log("\n✅ SUCCESS! Gas Station responded:");
      console.log(JSON.stringify(data, null, 2));
    } else {
      console.error("\n❌ FAILED. Gas Station error:");
      console.error(data);
    }
  } catch (error) {
    console.error("\n⚠️ Server unreachable. Is `npm run dev` running?");
  }
}

runEndToEndTest();
