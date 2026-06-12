/**
 * Passkey owner auth for I-Wallet (Sub-track 2: humans create + revoke with a
 * passkey). A passkey is a Sui secp256r1 account (WebAuthn) that signs txs
 * directly — see https://sdk.mystenlabs.com/sui/cryptography/passkey.
 *
 * The passkey credential lives in the platform authenticator (Touch ID /
 * Windows Hello), not in the app. We persist only the derived Sui address.
 * Returning-owner actions (revoke, owner_withdraw) that need the *keypair*
 * again must re-instantiate it — see recoverPasskeyOwner().
 */

import {
  PasskeyKeypair,
  BrowserPasskeyProvider,
  findCommonPublicKey,
} from "@mysten/sui/keypairs/passkey";

const OWNER_ADDRESS_KEY = "iwallet:owner-address";
export const PASSKEY_CHANGE_EVENT = "iwallet:passkey-change";

/** Persist the owner address and notify listeners (same-tab reactivity). */
function setStoredOwner(address: string | null): void {
  if (typeof window === "undefined") return;
  if (address) window.localStorage.setItem(OWNER_ADDRESS_KEY, address);
  else window.localStorage.removeItem(OWNER_ADDRESS_KEY);
  window.dispatchEvent(new Event(PASSKEY_CHANGE_EVENT));
}

function getProvider() {
  return new BrowserPasskeyProvider("I-Wallet", {
    rp: { name: "I-Wallet", id: window.location.hostname },
    authenticatorSelection: { authenticatorAttachment: "platform" },
  });
}

/** Register a new passkey and return the owner keypair + Sui address. */
export async function createPasskeyOwner(): Promise<{
  keypair: PasskeyKeypair;
  address: string;
}> {
  const keypair = await PasskeyKeypair.getPasskeyInstance(getProvider());
  const address = keypair.getPublicKey().toSuiAddress();
  setStoredOwner(address);
  return { keypair, address };
}

/**
 * Recover an existing passkey owner. WebAuthn doesn't expose the public key
 * directly, so we sign two probe messages and take the common candidate key.
 * Needed for owner actions (revoke_policy / owner_withdraw) in a fresh session.
 */
export async function recoverPasskeyOwner(): Promise<{
  keypair: PasskeyKeypair;
  address: string;
}> {
  const provider = getProvider();
  const probeA = new TextEncoder().encode("I-Wallet owner recovery 1");
  const probeB = new TextEncoder().encode("I-Wallet owner recovery 2");
  const candidatesA = await PasskeyKeypair.signAndRecover(provider, probeA);
  const candidatesB = await PasskeyKeypair.signAndRecover(provider, probeB);

  const common = findCommonPublicKey(candidatesA, candidatesB);
  const keypair = new PasskeyKeypair(common.toRawBytes(), provider);
  const address = keypair.getPublicKey().toSuiAddress();
  setStoredOwner(address);
  return { keypair, address };
}

export function getStoredOwnerAddress(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(OWNER_ADDRESS_KEY);
}

export function clearStoredOwner(): void {
  setStoredOwner(null);
}
