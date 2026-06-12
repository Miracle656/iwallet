/**
 * Enoki sponsored-transaction client (talks to our backend, which holds the
 * private Enoki key). Lets an owner with zero SUI create an iWallet — Enoki
 * pays gas, scoped to the allowed move-call targets.
 */

const BASE = (process.env.NEXT_PUBLIC_BACKEND_URL ?? "").replace(/\/$/, "");

export function enokiConfigured(): boolean {
  return BASE.length > 0;
}

/** Ask the backend to sponsor a transaction-kind. Returns the full tx bytes to sign + a digest. */
export async function sponsorTransaction(args: {
  transactionKindBytes: string; // base64
  sender: string;
  allowedMoveCallTargets: string[];
  allowedAddresses?: string[];
}): Promise<{ bytes: string; digest: string }> {
  const res = await fetch(`${BASE}/enoki/sponsor`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(args),
  });
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(err.error ?? `sponsor failed (${res.status})`);
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
    const err = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(err.error ?? `execute failed (${res.status})`);
  }
  return res.json();
}
