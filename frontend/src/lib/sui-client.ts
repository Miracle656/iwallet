/**
 * Sui read adapter for the I-Wallet frontend.
 *
 * Mirrors the shape of lib/demo-data.ts (`IWallet`) so screens can swap from
 * demo data to live chain reads with no UI changes. Read-only for now — the
 * transaction-builder (write) path is added in a later step.
 */

import { SuiJsonRpcClient, getJsonRpcFullnodeUrl } from "@mysten/sui/jsonRpc";
import { Transaction } from "@mysten/sui/transactions";
import { bcs } from "@mysten/sui/bcs";
import type { IWallet } from "./demo-data";
import {
  SUI_NETWORK,
  IWALLET_PACKAGE_ID,
  STAKE_COIN_TYPE,
  STAGED_BALANCE_KEY,
  SEED_IDENTITY_IDS,
} from "./sui-config";

const client = new SuiJsonRpcClient({
  url: getJsonRpcFullnodeUrl(SUI_NETWORK),
  network: SUI_NETWORK,
});

const ZERO_ADDRESS =
  "0x0000000000000000000000000000000000000000000000000000000000000000";

/** Decode a Move `vector<u8>` field (number array or base64 string) to hex. */
function toHex(value: unknown): string {
  if (Array.isArray(value)) {
    return value
      .map((b) => Number(b).toString(16).padStart(2, "0"))
      .join("");
  }
  if (typeof value === "string") {
    try {
      const bin = atob(value);
      let hex = "";
      for (let i = 0; i < bin.length; i++) {
        hex += bin.charCodeAt(i).toString(16).padStart(2, "0");
      }
      return hex;
    } catch {
      return value.replace(/^0x/, "");
    }
  }
  return "";
}

/**
 * Staged balance (in MIST) for a key inside an IIdentity's bag.
 * Calls `prototype::staged_balance` via devInspect — a gas-free read-only
 * simulation. The Move fn aborts when the key is absent, so an unfunded
 * identity resolves to 0n.
 */
export async function getStagedBalance(
  objectId: string,
  key: string = STAGED_BALANCE_KEY,
): Promise<bigint> {
  try {
    const tx = new Transaction();
    tx.moveCall({
      target: `${IWALLET_PACKAGE_ID}::prototype::staged_balance`,
      typeArguments: [STAKE_COIN_TYPE],
      arguments: [tx.object(objectId), tx.pure.string(key)],
    });
    const res = await client.devInspectTransactionBlock({
      transactionBlock: tx,
      sender: ZERO_ADDRESS,
    });
    if (res.effects?.status?.status !== "success") return BigInt(0);
    const returnValue = res.results?.[0]?.returnValues?.[0];
    if (!returnValue) return BigInt(0);
    const [valueBytes] = returnValue;
    return BigInt(bcs.u64().parse(Uint8Array.from(valueBytes)));
  } catch {
    return BigInt(0);
  }
}

/** Read one IIdentity object and project it into the UI's IWallet shape. */
export async function getIdentity(objectId: string): Promise<IWallet | null> {
  try {
    const res = await client.getObject({
      id: objectId,
      options: { showContent: true, showType: true },
    });
    const content = res.data?.content;
    if (!content || content.dataType !== "moveObject") return null;

    const fields = content.fields as Record<string, unknown>;
    const name = (fields.name as string) || "iWallet";
    const identityHash = "0x" + toHex(fields.identity_hash);

    const balanceMist = await getStagedBalance(objectId);
    const sui = Number(balanceMist) / 1e9;

    return {
      id: objectId,
      name,
      objectId,
      status: balanceMist > BigInt(0) ? "active" : "unfunded",
      network: "sui-testnet",
      balance: {
        tokens: [{ symbol: "SUI", amount: sui }],
      },
      identityHash,
      createdAt: "On-chain",
      // Mandate caps are off-chain policy — the contract has no caps.
      policy: {
        maxPerTransaction: "Off-chain mandate",
        sessionLimit: "Off-chain mandate",
        expiry: "—",
        allowedTargets: [],
      },
    };
  } catch {
    return null;
  }
}

/**
 * Resolve the iWallets to display: seed identities plus any ids passed in
 * (e.g. from localStorage). Unreadable / missing objects are dropped.
 */
export async function listIdentities(
  extraIds: string[] = [],
): Promise<IWallet[]> {
  const ids = Array.from(
    new Set([...SEED_IDENTITY_IDS, ...extraIds].filter(Boolean)),
  );
  const results = await Promise.all(ids.map((id) => getIdentity(id)));
  return results.filter((w): w is IWallet => w !== null);
}
