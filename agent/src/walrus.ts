import type { Pick } from './picks.js';

/**
 * Verifiable audit trail: every bet attempt (intent + proof hash + tx digest)
 * is written as a Walrus blob. The blob ID is surfaced in the real-time feed
 * UI as a "verifiable" link.
 *
 * Uses the Walrus HTTP API (publisher PUT to store, aggregator GET to read) so
 * the agent stays dependency-light — no WASM client, no funded WAL keypair in
 * the daemon. Falls back to a stub blob id when WALRUS_PUBLISHER_URL is unset.
 */

export type AuditEntry = {
  pick: Pick;
  txDigest: string;
};

const PUBLISHER = process.env.WALRUS_PUBLISHER_URL ?? '';
const AGGREGATOR = process.env.WALRUS_AGGREGATOR_URL ?? '';
const EPOCHS = Number(process.env.WALRUS_EPOCHS ?? '5');

/** Publisher store response (the two shapes we care about). */
type StoreResponse = {
  newlyCreated?: { blobObject: { blobId: string } };
  alreadyCertified?: { blobId: string };
};

export async function logAuditTrail(
  entry: AuditEntry,
): Promise<{ blobId: string; url?: string }> {
  if (!PUBLISHER) {
    console.warn('[walrus] WALRUS_PUBLISHER_URL not set — stub blob');
    return { blobId: `stub-blob-${entry.txDigest}` };
  }

  const body = new TextEncoder().encode(
    JSON.stringify({ ...entry, ts: Date.now() }),
  );

  const url = new URL(`${PUBLISHER.replace(/\/$/, '')}/v1/blobs`);
  url.searchParams.set('epochs', String(EPOCHS));

  const res = await fetch(url, { method: 'PUT', body });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`[walrus] publisher ${res.status}: ${text.slice(0, 200)}`);
  }

  const json = (await res.json()) as StoreResponse;
  const blobId =
    json.newlyCreated?.blobObject.blobId ?? json.alreadyCertified?.blobId;
  if (!blobId) {
    throw new Error(`[walrus] unexpected store response: ${JSON.stringify(json)}`);
  }

  const readBase = (AGGREGATOR || PUBLISHER).replace(/\/$/, '');
  return { blobId, url: `${readBase}/v1/blobs/${blobId}` };
}
