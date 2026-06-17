/**
 * In-memory store for zkLogin sessions.
 *
 * Each session holds the ephemeral keypair + ZK proof needed for the agent to
 * sign Sui transactions autonomously on behalf of the zkLogin address.
 *
 * Sessions are AES-256-GCM encrypted at rest (in memory) using ZK_ENCRYPTION_KEY.
 * The key never leaves the server; only the agentId is returned to the client.
 */

import crypto from "node:crypto";
import { randomUUID } from "node:crypto";

export type ZkSession = {
  jwt: string;
  ephemeralPrivKey: string;
  maxEpoch: number;
  randomness: string;
  salt: string;
  address: string;
  zkProof: unknown;
  storedAt: number;
};

const store = new Map<string, { iv: string; tag: string; data: string }>();

function getEncKey(): Buffer {
  const secret = process.env.ZK_ENCRYPTION_KEY ?? process.env.API_SECRET ?? "dev-only-insecure-key";
  return crypto.createHash("sha256").update(secret).digest();
}

function encrypt(plain: string): { iv: string; tag: string; data: string } {
  const key = getEncKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return {
    iv: iv.toString("hex"),
    tag: tag.toString("hex"),
    data: encrypted.toString("hex"),
  };
}

function decrypt(enc: { iv: string; tag: string; data: string }): string {
  const key = getEncKey();
  const iv = Buffer.from(enc.iv, "hex");
  const tag = Buffer.from(enc.tag, "hex");
  const data = Buffer.from(enc.data, "hex");
  const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(data), decipher.final()]).toString("utf8");
}

export function storeZkSession(session: ZkSession): string {
  const agentId = randomUUID();
  const plain = JSON.stringify({ ...session, storedAt: Date.now() });
  store.set(agentId, encrypt(plain));
  return agentId;
}

export function getZkSession(agentId: string): ZkSession | null {
  const enc = store.get(agentId);
  if (!enc) return null;
  try {
    return JSON.parse(decrypt(enc)) as ZkSession;
  } catch {
    return null;
  }
}

export function deleteZkSession(agentId: string): void {
  store.delete(agentId);
}
