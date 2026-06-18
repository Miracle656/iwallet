"use client";

/**
 * Thin wrappers around the backend's sponsored-tx endpoints.
 * The backend holds ENOKI_PRIVATE_API_KEY and SPONSOR_PRIVATE_KEY — never the browser.
 */
const BACKEND = (process.env.NEXT_PUBLIC_BACKEND_URL ?? "").replace(/\/$/, "");

/** Step 1: backend wraps the tx-kind bytes with sponsor as gas owner, returns full txBytes. */
export async function prepareZkTx({
  txKindBytes,
  sender,
}: {
  txKindBytes: string;
  sender: string;
}): Promise<{ txBytes: string }> {
  const res = await fetch(`${BACKEND}/v1/zklogin/prepare-tx`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ txKindBytes, sender }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error((err as { error?: string }).error ?? `prepare-tx failed (${res.status})`);
  }
  return res.json();
}

/** Step 2: user signs txBytes with zkLogin; backend co-signs as gas sponsor and executes. */
export async function executeZkSponsored({
  txBytes,
  userSignature,
}: {
  txBytes: string;
  userSignature: string;
}): Promise<{ digest: string }> {
  const res = await fetch(`${BACKEND}/v1/zklogin/execute-sponsored`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ txBytes, userSignature }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error((err as { error?: string }).error ?? `execute-sponsored failed (${res.status})`);
  }
  return res.json();
}
