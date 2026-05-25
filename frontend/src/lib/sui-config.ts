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
  // Updated 2026-05-25: fresh publish of the AgentPolicy contract.
  "0x2d90b593a05eedce81d9c66c07ea330efa222fead13eca23437609c31af24740";

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
  // Provisioned 2026-05-25 under the new AgentPolicy package (0x2d90…).
  process.env.NEXT_PUBLIC_SEED_IDENTITY_IDS ||
  "0x88a80b4c68c44e2eb8df5e7d66c3f4c552b6180b4a97650cbc6ebec804806150"
)
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);
