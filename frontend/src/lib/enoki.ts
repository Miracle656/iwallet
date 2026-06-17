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
    const body = await res.json().catch(() => ({ error: `status ${res.status}` })) as { error?: string; detail?: unknown };
    console.error("[enoki/execute] status:", res.status);
    console.error("[enoki/execute] error:", body.error);
    console.error("[enoki/execute] detail:", JSON.stringify(body.detail, null, 2));
    throw new Error(`Enoki execute failed (${res.status}): ${body.error}`);
  }
  return res.json();
}
