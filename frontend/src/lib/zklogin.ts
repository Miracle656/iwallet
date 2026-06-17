"use client";

import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import {
  generateNonce,
  generateRandomness,
  getExtendedEphemeralPublicKey,
  jwtToAddress,
} from "@mysten/sui/zklogin";
import { suiClient } from "@/lib/sui-client";

const BACKEND = (process.env.NEXT_PUBLIC_BACKEND_URL ?? "").replace(/\/$/, "");
const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? "";
const PROVER_URL =
  process.env.NEXT_PUBLIC_ZK_PROVER_URL ??
  "https://prover-dev.mystenlabs.com/v1";
const SALT_URL =
  process.env.NEXT_PUBLIC_ZK_SALT_URL ??
  "https://salt.api.mystenlabs.com/get_salt";

const SESSION_KEY = "iwallet_zklogin_session";

type StoredSession = {
  ephemeralPrivKey: string;
  maxEpoch: number;
  randomness: string;
};

export function zkLoginConfigured(): boolean {
  return GOOGLE_CLIENT_ID.length > 0 && BACKEND.length > 0;
}

/** Step 1 — called when user clicks "Sign in with Google".
 *  Stores the ephemeral session in sessionStorage then redirects to Google. */
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
    redirect_uri: `${window.location.origin}/auth/callback`,
    response_type: "id_token",
    scope: "openid email",
    nonce,
  });
  window.location.href = `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
}

/** Step 2a — fetch the per-user salt that determines the Sui address. */
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

/** Step 2b — call the ZK proving service and get a proof. */
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
 * Step 2 — called from /auth/callback after Google redirects back.
 *
 * Picks up the JWT from the URL hash, derives the Sui address, gets a ZK
 * proof, then POSTs everything to the backend so it can encrypt + store the
 * ephemeral keypair with Seal for autonomous agent signing.
 *
 * Backend contract (George to implement):
 *   POST /v1/auth/zklogin/store
 *   Body: { jwt, ephemeralPrivKey, maxEpoch, randomness, salt, address, zkProof }
 *   → 200 { agentId: string }
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
  const extendedEphemeralPublicKey = getExtendedEphemeralPublicKey(
    ephemeral.getPublicKey(),
  );

  const salt = await fetchSalt(jwt);
  const zkProof = await fetchZkProof({
    jwt,
    extendedEphemeralPublicKey,
    maxEpoch: session.maxEpoch,
    randomness: session.randomness,
    salt,
  });

  const address = jwtToAddress(jwt, salt, false);

  await fetch(`${BACKEND}/v1/auth/zklogin/store`, {
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

  return { address, jwt, salt };
}
