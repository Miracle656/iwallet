// src/lib/enoki.ts
import {
  EnokiFlow,
  EnokiClient,
  EnokiNetwork,
  createLocalStorage,
  createDefaultEncryption,
  registerEnokiWallets,
  isEnokiNetwork,
} from "@mysten/enoki";
import { getJsonRpcFullnodeUrl, SuiJsonRpcClient } from "@mysten/sui/jsonRpc";

const NETWORK =
  (process.env.NEXT_PUBLIC_SUI_NETWORK as EnokiNetwork) || "mainnet";
const suiClient = new SuiJsonRpcClient({
  url: getJsonRpcFullnodeUrl("testnet"),
  network: "testnet",
});

// Client-side Enoki flow (for OAuth/zkLogin)
// EnokiFlow is a class you instantiate, not a factory function
registerEnokiWallets({
  client: suiClient,
  network: "testnet",
  apiKey: process.env.NEXT_PUBLIC_ENOKI_API_KEY!,
  providers: {
    google: {
      clientId: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID as string,
    },
  },
});

export function setupEnokiWallets(network: "testnet" | "mainnet" | "devnet") {
  if (!isEnokiNetwork(network)) return () => {};

  return registerEnokiWallets({
    client: suiClient,
    network,
    apiKey: process.env.NEXT_PUBLIC_ENOKI_API_KEY!,
    providers: {
      google: {
        clientId: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID!,
      },
    },
  });
}

// ── zkLogin gas station (our own sponsor, not Enoki execute) ──

/** Build the full tx with the backend's sponsor as gas owner. Returns txBytes (base64) for signing. */
export async function prepareZkTx(args: {
  txKindBytes: string;
  sender: string;
}): Promise<{ txBytes: string }> {
  const res = await fetch(`${BASE}/v1/zklogin/prepare-tx`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(args),
  });
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(err.error ?? `prepare-tx failed (${res.status})`);
  }
  return res.json();
}

/** Send the zkLogin user signature; backend co-signs as sponsor and submits both to Sui. */
export async function executeZkSponsored(args: {
  txBytes: string;
  userSignature: string;
}): Promise<{ digest: string; objectChanges?: unknown[]; effects?: unknown }> {
  const res = await fetch(`${BASE}/v1/zklogin/execute-sponsored`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(args),
  });
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(err.error ?? `execute-sponsored failed (${res.status})`);
  }
  return res.json();
}

/** Execute the sponsored tx with the owner's signature. */
export async function executeSponsored(
  digest: string,
  signature: string,
): Promise<{ digest: string }> {
  const res = await fetch(`${BASE}/enoki/execute`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ digest, signature }),
  });
  if (!res.ok) {
    const body = (await res
      .json()
      .catch(() => ({ error: `status ${res.status}` }))) as {
      error?: string;
      detail?: unknown;
    };
    console.error("[enoki/execute] status:", res.status);
    console.error("[enoki/execute] error:", body.error);
    console.error(
      "[enoki/execute] detail:",
      JSON.stringify(body.detail, null, 2),
    );
    throw new Error(`Enoki execute failed (${res.status}): ${body.error}`);
  }
  return res.json();
}
