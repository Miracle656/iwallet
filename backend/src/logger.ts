// The public Walrus Testnet Publisher Node
const WALRUS_PUBLISHER_URL =
  "https://publisher.walrus-testnet.walrus.space/v1/store";

// Define the interface for the agent's trade receipt
export interface AgentReceipt {
  agent_id: string; // The IIdentity Shared Object ID
  intent_hash: string; // The ZK intent hash
  trade_amount: number; // How much SUI was swapped
  dex_target: string; // DeepBook Pool ID
  sui_tx_digest: string; // The transaction hash on Sui
  timestamp: string; // ISO format
}

/**
 * Uploads a JSON receipt to Walrus Decentralized Storage
 * Returns the permanent Blob ID or null if the upload fails.
 */
export async function logTradeToWalrus(
  receipt: AgentReceipt,
): Promise<string | null> {
  const payload = JSON.stringify(receipt, null, 2);

  console.log(`[Walrus] Uploading receipt for Tx: ${receipt.sui_tx_digest}...`);

  try {
    const response = await fetch(WALRUS_PUBLISHER_URL, {
      method: "PUT",
      body: payload,
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      console.error(
        `[Walrus] Status ${response.status}: ${await response.text()}`,
      );
      return null;
    }

    const result = await response.json();

    // Walrus response structure:
    // Newly created object or existing certified blob
    const blobId =
      result.newlyCreated?.blobObject?.blobId ||
      result.alreadyCertified?.blobId;

    console.log(`[Walrus] Audit trail sealed. Immutable Blob ID: ${blobId}`);
    return blobId;
  } catch (error) {
    console.error("[Walrus] Error connecting to Walrus storage:", error);
    return null;
  }
}
