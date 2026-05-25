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
      // On-chain AgentPolicy (5af56cc): budget cap, recipient whitelist, expiry.
      policy: parsePolicy(fields.active_policy),
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

/** Project an on-chain Option<AgentPolicy> into the UI's policy shape. */
function parsePolicy(raw: unknown): IWallet["policy"] {
  const none: IWallet["policy"] = {
    maxPerTransaction: "No policy set",
    sessionLimit: "—",
    expiry: "—",
    allowedTargets: [],
  };
  if (!raw) return none;
  const p = ((raw as { fields?: Record<string, unknown> }).fields ??
    raw) as Record<string, unknown>;
  if (!p || p.budget_cap == null) return none;
  const cap = Number(p.budget_cap) / 1e9;
  const spent = Number(p.amount_spent ?? 0) / 1e9;
  const expMs = p.expiration_ms ? Number(p.expiration_ms) : 0;
  const recipients = Array.isArray(p.allow_recipients)
    ? (p.allow_recipients as string[])
    : [];
  return {
    maxPerTransaction: `${cap} SUI budget`,
    sessionLimit: `${spent} SUI spent`,
    expiry: expMs ? new Date(expMs).toISOString().slice(0, 16).replace("T", " ") : "—",
    allowedTargets: recipients,
  };
}

// ── Write-path transaction builders ──
// Return a Transaction for the owner (passkey) to sign — or for the gas
// station to sponsor. Execution is pending George's contract republish
// (new IWALLET_PACKAGE_ID) + a shipped vk_bytes asset for create.

/** set_policy(budget_cap, allow_recipients, expiration_ms) — owner only. */
export function buildSetPolicyTx(
  identityId: string,
  budgetCap: bigint,
  allowRecipients: string[],
  expirationMs: bigint,
): Transaction {
  const tx = new Transaction();
  tx.moveCall({
    target: `${IWALLET_PACKAGE_ID}::prototype::set_policy`,
    typeArguments: [STAKE_COIN_TYPE],
    arguments: [
      tx.object(identityId),
      tx.pure.u64(budgetCap),
      tx.pure.vector("address", allowRecipients),
      tx.pure.u64(expirationMs),
    ],
  });
  return tx;
}

/** revoke_policy — owner only. The Sub-track 2 revocation primitive. */
export function buildRevokePolicyTx(identityId: string): Transaction {
  const tx = new Transaction();
  tx.moveCall({
    target: `${IWALLET_PACKAGE_ID}::prototype::revoke_policy`,
    typeArguments: [STAKE_COIN_TYPE],
    arguments: [tx.object(identityId)],
  });
  return tx;
}

/**
 * create_iidentity(name, identity_hash, vk_bytes, none) — shares the vault,
 * owner = tx sender (the passkey). Policy is set afterward via set_policy
 * (no TS-constructible AgentPolicy). `vkBytes` must be the converted Groth16
 * verifying key (agent/src/vk.ts output), shipped as a static asset.
 */
export function buildCreateIdentityTx(
  name: string,
  identityHashLE: Uint8Array,
  vkBytes: Uint8Array,
): Transaction {
  const tx = new Transaction();
  // Option<AgentPolicy> is a struct option — not a pure type. Build None on-chain.
  const nonePolicy = tx.moveCall({
    target: "0x1::option::none",
    typeArguments: [`${IWALLET_PACKAGE_ID}::prototype::AgentPolicy`],
  });
  tx.moveCall({
    target: `${IWALLET_PACKAGE_ID}::prototype::create_iidentity`,
    typeArguments: [STAKE_COIN_TYPE],
    arguments: [
      tx.pure.string(name),
      tx.pure.vector("u8", Array.from(identityHashLE)),
      tx.pure.vector("u8", Array.from(vkBytes)),
      nonePolicy,
    ],
  });
  return tx;
}

// ── Profile page reads ──
// All numbers are plain (no bigint) so the result is serializable across the
// Next server/client boundary.

export type CoinHolding = {
  coinType: string;
  symbol: string;
  amount: string; // human-readable
  objectCount: number;
};

export type PolicyView = {
  budgetCapSui: number;
  amountSpentSui: number;
  expirationMs: number;
  allowRecipients: string[];
};

export type IdentityProfile = {
  objectId: string;
  name: string;
  identityHash: string;
  owner: string | null;
  stagedBalanceSui: number;
  coins: CoinHolding[];
  policy: PolicyView | null;
};

export type ActivityItem = {
  digest: string;
  timestampMs: number | null;
  success: boolean;
};

function symbolFromType(coinType: string): string {
  return coinType.split("::").pop() ?? coinType;
}

/** Rich read for the iWallet profile page: identity + on-chain policy + coins held at the object address. */
export async function getProfile(objectId: string): Promise<IdentityProfile | null> {
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
    const owner = typeof fields.owner === "string" ? (fields.owner as string) : null;

    const stagedBalanceMist = await getStagedBalance(objectId);

    // Coins sent to the shared object's address (George's funding model:
    // transfer straight to the object id).
    let coins: CoinHolding[] = [];
    try {
      const balances = await client.getAllBalances({ owner: objectId });
      coins = balances.map((b) => {
        const sym = symbolFromType(b.coinType);
        const isSui = b.coinType === "0x2::sui::SUI";
        const raw = BigInt(b.totalBalance);
        const amount = isSui ? (Number(raw) / 1e9).toString() : raw.toString();
        return { coinType: b.coinType, symbol: sym, amount, objectCount: b.coinObjectCount };
      });
    } catch {
      coins = [];
    }

    // On-chain AgentPolicy
    const raw = (fields.active_policy as { fields?: Record<string, unknown> } | null);
    const p = (raw?.fields ?? raw) as Record<string, unknown> | null;
    const policy: PolicyView | null =
      p && p.budget_cap != null
        ? {
            budgetCapSui: Number(p.budget_cap) / 1e9,
            amountSpentSui: Number(p.amount_spent ?? 0) / 1e9,
            expirationMs: p.expiration_ms ? Number(p.expiration_ms) : 0,
            allowRecipients: Array.isArray(p.allow_recipients)
              ? (p.allow_recipients as string[])
              : [],
          }
        : null;

    return {
      objectId,
      name,
      identityHash,
      owner,
      stagedBalanceSui: Number(stagedBalanceMist) / 1e9,
      coins,
      policy,
    };
  } catch {
    return null;
  }
}

/** Recent transactions that touched the iWallet object. */
export async function getActivity(objectId: string, limit = 12): Promise<ActivityItem[]> {
  try {
    const res = await client.queryTransactionBlocks({
      filter: { ChangedObject: objectId },
      options: { showEffects: true },
      limit,
      order: "descending",
    });
    return res.data.map((tx) => ({
      digest: tx.digest,
      timestampMs: tx.timestampMs ? Number(tx.timestampMs) : null,
      success: tx.effects?.status?.status === "success",
    }));
  } catch {
    return [];
  }
}
