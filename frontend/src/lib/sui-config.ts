/**
 * Sui network + deployed-package config for the I-Wallet frontend.
 *
 * Defaults are the current testnet deployment (package ids are public
 * on-chain data, not secrets). Override any value via NEXT_PUBLIC_* env vars
 * in frontend/.env.local when pointing at a different deployment.
 */

export type SuiNetwork = "testnet" | "mainnet" | "devnet";

export const SUI_NETWORK: SuiNetwork =
  (process.env.NEXT_PUBLIC_SUI_NETWORK as SuiNetwork) || "testnet";

export const IWALLET_PACKAGE_ID =
  process.env.NEXT_PUBLIC_IWALLET_PACKAGE_ID ||
  // Updated 2026-06-10: George's republish (IdentityCreated event +
  // create_iidentity returns the identity address). Matches Published.toml.
  // New creates target this package; reads on wallets from older packages
  // still work — per-object calls derive the package from the object's type.
  "0x0edff0cf8a2e385116476bd38acdb9e2ba59dc6ac5723c5ac1ba0afc1e9a67bb";

/** Older live deployments — wallets created on these still read fine. */
export const LEGACY_IWALLET_PACKAGE_IDS: string[] = [
  "0x73b685d06ccc1c1144bf10c3a13d9cbe22315a519d2f1f4c21f4255b4bda83d9",
];

export const STAKE_COIN_TYPE =
  process.env.NEXT_PUBLIC_STAKE_COIN_TYPE || "0x2::sui::SUI";

export const STAGED_BALANCE_KEY =
  process.env.NEXT_PUBLIC_STAGED_BALANCE_KEY || "default";

/**
 * Identity object ids to show before the on-chain create flow exists.
 * Seeded with the agent's provisioned testnet IIdentity so the list isn't
 * empty. User-created identities are layered on top from localStorage
 * (see lib/local-identities.ts) — the IIdentity is a shared object with no
 * owner field, so the frontend tracks ownership locally for v1.
 */
export const SEED_IDENTITY_IDS: string[] = (
  // Empty after the 2026-06-08 republish: the prior seed (0x88a8…) lives under
  // the dead 0x2d90 package and can't be read by the new one. Re-provision via
  // `agent/src/provision.ts` against the new package, then set
  // NEXT_PUBLIC_SEED_IDENTITY_IDS — or just create one through the UI flow.
  process.env.NEXT_PUBLIC_SEED_IDENTITY_IDS ||
  ""
)
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);
