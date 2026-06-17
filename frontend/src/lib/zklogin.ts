"use client";

import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import {
  decodeJwt,
  genAddressSeed,
  generateNonce,
  generateRandomness,
  getExtendedEphemeralPublicKey,
  getZkLoginSignature,
  jwtToAddress,
} from "@mysten/sui/zklogin";
import { suiClient } from "@/lib/sui-client";

const BACKEND = (process.env.NEXT_PUBLIC_BACKEND_URL ?? "").replace(/\/$/, "");
const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? "";
const PROVER_URL =
  process.env.NEXT_PUBLIC_ZK_PROVER_URL ?? `${BACKEND}/v1/zklogin/proof`;
const SALT_URL =
  process.env.NEXT_PUBLIC_ZK_SALT_URL ?? `${BACKEND}/v1/zklogin/salt`;

const SESSION_KEY = "iwallet_zklogin_session";       // pre-callback (ephemeral key)
const SIGNER_KEY  = "iwallet_zklogin_signer";        // post-callback (signing material)

type StoredSession = {
  ephemeralPrivKey: string;
  maxEpoch: number;
  randomness: string;
};

type ZkSignerMaterial = {
  address: string;
  ephemeralPrivKey: string;
  maxEpoch: number;
  addressSeed: string;
  zkProof: unknown;
};

export function zkLoginConfigured(): boolean {
  return GOOGLE_CLIENT_ID.length > 0 && BACKEND.length > 0;
}

/** Returns the zkLogin Sui address stored after a completed sign-in, or null. */
export function getZkLoginAddress(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("zklogin_address");
}

/** Clears all zkLogin state (sign-out). */
export function clearZkLoginSession(): void {
  localStorage.removeItem("zklogin_address");
  localStorage.removeItem("zklogin_agent_id");
  sessionStorage.removeItem(SIGNER_KEY);
}

/** Returns stored signing material for the current session, or null if not signed in / session expired. */
export function getZkSignerMaterial(): ZkSignerMaterial | null {
  if (typeof window === "undefined") return null;
  const raw = sessionStorage.getItem(SIGNER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as ZkSignerMaterial;
  } catch {
    return null;
  }
}

/**
 * Signs Sui transaction bytes with the zkLogin signature scheme.
 * Requires the user to have completed the OAuth flow in this browser tab.
 */
export async function signWithZkLogin(txBytes: Uint8Array): Promise<string> {
  const material = getZkSignerMaterial();
  if (!material) throw new Error("No zkLogin session — please sign in again");
  const ephemeral = Ed25519Keypair.fromSecretKey(material.ephemeralPrivKey);
  const { signature: ephemeralSig } = await ephemeral.signTransaction(txBytes);
  return getZkLoginSignature({
    inputs: {
      ...(material.zkProof as object),
      addressSeed: material.addressSeed,
    } as Parameters<typeof getZkLoginSignature>[0]["inputs"],
    maxEpoch: material.maxEpoch,
    userSignature: ephemeralSig,
  });
}

/** Step 1 — called when user clicks "Sign in with Google". */
export async function initiateGoogleLogin(): Promise<void> {
  const { epoch } = await suiClient.getLatestSuiSystemState();
  const maxEpoch = Number(epoch) + 10;

  const ephemeral = new Ed25519Keypair();
  const randomness = generateRandomness();
  const nonce = generateNonce(ephemeral.getPublicKey(), maxEpoch, randomness);

  const session: StoredSession = {
    ephemeralPrivKey: ephemeral.getSecretKey(),
    maxEpoch,
    randomness,
  };
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));

  const params = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID,
    redirect_uri: `${window.location.origin}/api/auth/callback/google`,
    response_type: "id_token",
    scope: "openid email",
    nonce,
  });
  window.location.href = `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
}

async function fetchSalt(jwt: string): Promise<string> {
  const res = await fetch(SALT_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token: jwt }),
  });
  if (!res.ok) throw new Error(`Salt service error (${res.status})`);
  const data = (await res.json()) as { salt: string };
  return data.salt;
}

async function fetchZkProof(args: {
  jwt: string;
  extendedEphemeralPublicKey: string;
  maxEpoch: number;
  randomness: string;
  salt: string;
}): Promise<unknown> {
  const res = await fetch(PROVER_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jwt: args.jwt,
      extendedEphemeralPublicKey: args.extendedEphemeralPublicKey,
      maxEpoch: args.maxEpoch,
      jwtRandomness: args.randomness,
      salt: args.salt,
      keyClaimName: "sub",
    }),
  });
  if (!res.ok) {
    const msg = await res.text().catch(() => res.statusText);
    throw new Error(`ZK prover error (${res.status}): ${msg}`);
  }
  return res.json();
}

export type ZkLoginResult = {
  address: string;
  jwt: string;
  salt: string;
};

/**
 * Step 2 — called from /api/auth/callback/google after Google redirects back.
 *
 * Derives the Sui address, gets a ZK proof, stores signing material in
 * sessionStorage for use during this browser session, then POSTs everything
 * to the backend so it can sign autonomously as the agent.
 */
export async function processZkLoginCallback(): Promise<ZkLoginResult> {
  const hash = new URLSearchParams(window.location.hash.slice(1));
  const jwt = hash.get("id_token");
  if (!jwt) throw new Error("No id_token in callback URL");

  const raw = sessionStorage.getItem(SESSION_KEY);
  if (!raw) throw new Error("No zkLogin session found — did the page reload mid-flow?");
  const session: StoredSession = JSON.parse(raw);
  sessionStorage.removeItem(SESSION_KEY);

  const ephemeral = Ed25519Keypair.fromSecretKey(session.ephemeralPrivKey);
  const extendedEphemeralPublicKey = getExtendedEphemeralPublicKey(ephemeral.getPublicKey());

  const salt = await fetchSalt(jwt);
  const zkProof = await fetchZkProof({
    jwt,
    extendedEphemeralPublicKey,
    maxEpoch: session.maxEpoch,
    randomness: session.randomness,
    salt,
  });

  const address = jwtToAddress(jwt, salt, false);

  // Compute addressSeed for signing (needed by getZkLoginSignature)
  const decoded = decodeJwt(jwt);
  const addressSeed = genAddressSeed(
    BigInt(salt),
    "sub",
    decoded.sub,
    decoded.aud,
  ).toString();

  // Keep signing material in sessionStorage for this tab's lifetime
  const signerMaterial: ZkSignerMaterial = {
    address,
    ephemeralPrivKey: session.ephemeralPrivKey,
    maxEpoch: session.maxEpoch,
    addressSeed,
    zkProof,
  };
  sessionStorage.setItem(SIGNER_KEY, JSON.stringify(signerMaterial));

  // Send to backend for agent autonomous signing
  const storeRes = await fetch(`${BACKEND}/v1/auth/zklogin/store`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jwt,
      ephemeralPrivKey: session.ephemeralPrivKey,
      maxEpoch: session.maxEpoch,
      randomness: session.randomness,
      salt,
      address,
      zkProof,
    }),
  });
  if (storeRes.ok) {
    const { agentId } = (await storeRes.json()) as { agentId: string };
    if (agentId) localStorage.setItem("zklogin_agent_id", agentId);
  }

  return { address, jwt, salt };
}
