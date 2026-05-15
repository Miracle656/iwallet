import type { Pick } from './picks.js';

/**
 * Verifiable audit trail: every bet attempt (intent + proof hash + tx digest)
 * is written as a Walrus blob. The blob ID is surfaced in the real-time feed
 * UI as a "verifiable" link.
 *
 * Phase 3: use the official Walrus client (https://docs.walrus.site/).
 */

export type AuditEntry = {
  pick: Pick;
  txDigest: string;
};

export async function logAuditTrail(entry: AuditEntry): Promise<{ blobId: string }> {
  // TODO Phase 3: real write. Sketch:
  //
  //   const blob = new TextEncoder().encode(JSON.stringify({
  //     ...entry,
  //     ts: Date.now(),
  //   }));
  //   const { blobId } = await walrus.store(blob, { epochs: N });
  //   return { blobId };

  return { blobId: `stub-blob-${entry.txDigest}` };
}
