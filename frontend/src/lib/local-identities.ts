/**
 * Browser-local registry of iWallet (IIdentity) object ids the user created.
 *
 * IIdentity is a shared object with no owner field on-chain, so "my iWallets"
 * cannot be a simple owned-object query. v1 tracks created ids in
 * localStorage; v2 should index an on-chain `IdentityCreated` event instead
 * (see docs/DELEGATION_MODEL.md §3).
 */

const STORAGE_KEY = "iwallet:identities";

export function getLocalIdentityIds(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed)
      ? parsed.filter((x): x is string => typeof x === "string")
      : [];
  } catch {
    return [];
  }
}

export function addLocalIdentityId(objectId: string): void {
  if (typeof window === "undefined") return;
  const ids = getLocalIdentityIds();
  if (!ids.includes(objectId)) {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify([...ids, objectId]),
    );
  }
}
