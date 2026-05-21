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
  "0xe4381def6d7f83901c6347ff575328281fada46bd329e02fa91a1a7d8a4151c8";

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
  process.env.NEXT_PUBLIC_SEED_IDENTITY_IDS ||
  "0x63896062d97b6cf3bb801dc263978c47e00e4e7496976874967423b0d0cc844c"
)
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);
