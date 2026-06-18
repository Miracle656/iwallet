// src/lib/agent-zklogin.ts
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { SuiGrpcClient } from '@mysten/sui/grpc';
import { Transaction } from '@mysten/sui/transactions';
import {
  generateNonce,
  generateRandomness,
  getExtendedEphemeralPublicKey,
  getZkLoginSignature,
  genAddressSeed,
  jwtToAddress,
} from '@mysten/sui/zklogin';
// NO longer: import from '@mysten/zklogin' — that package is deprecated

const suiClient = new SuiGrpcClient({
  baseUrl: 'https://fullnode.testnet.sui.io:443',
  network: 'testnet',
});

interface ZkProof {
  proofPoints: {
    a: string[];
    b: string[][];
    c: string[];
  };
  issBase64Details: {
    value: string;
    indexMod4: number;
  };
  headerBase64: string;
}

interface EphemeralState {
  keypair: Ed25519Keypair;
  zkProof: ZkProof;
  maxEpoch: number;
  randomness: string;
  // Decoded JWT claims needed for addressSeed at sign time
  sub: string;
  aud: string;
}

export class AgentZkLogin {
  private ephemeral: EphemeralState | null = null;

  constructor(
    private readonly userSalt: string,   // store in env, never expose
    private readonly jwtProvider: () => Promise<{ jwt: string; sub: string; aud: string }>
    // jwtProvider = your StaticJwtStore / RefreshTokenJwtStore / CustomOidcJwtStore
  ) {}

  async authenticate(): Promise<string> {
    const { jwt, sub, aud } = await this.jwtProvider();

    const keypair = new Ed25519Keypair();
    const randomness = generateRandomness();

    // ✅ Use SuiGrpcClient — SuiClient no longer has getLatestSuiSystemState
    const { epoch } = await suiClient.core.getLatestSuiSystemState();
    const maxEpoch = Number(epoch) + 10;

    const nonce = generateNonce(keypair.getPublicKey(), maxEpoch, randomness);

    // ✅ New: getExtendedEphemeralPublicKey is a required separate step
    const extendedEphemeralPublicKey = getExtendedEphemeralPublicKey(
      keypair.getPublicKey()
    );

    const zkProof = await this.fetchZkProof({
      jwt,
      extendedEphemeralPublicKey,
      maxEpoch,
      randomness,
    });

    this.ephemeral = { keypair, zkProof, maxEpoch, randomness, sub, aud };

    // ✅ jwtToAddress now takes legacyAddress=false explicitly
    return jwtToAddress(jwt, this.userSalt, false);
  }

  async getZkLoginSignature(tx: Transaction, senderAddress: string): Promise<{ bytes: string; signature: string }> {
    const { epoch } = await suiClient.core.getLatestSuiSystemState();

    // Auto re-auth if epoch expired
    if (!this.ephemeral || Number(epoch) >= this.ephemeral.maxEpoch) {
      await this.authenticate();
    }

    const { keypair, zkProof, maxEpoch, sub, aud } = this.ephemeral!;

    tx.setSender(senderAddress);

    // ✅ tx.sign() with client + signer
    const { bytes, signature: userSignature } = await tx.sign({
    //   client: suiClient , // SuiGrpcClient is compatible here
      signer: keypair,
    });

    // ✅ genAddressSeed must be called explicitly — no longer embedded in proof
    const addressSeed = genAddressSeed(
      BigInt(this.userSalt),
      'sub',
      sub,
      aud,
    ).toString();

    // ✅ getZkLoginSignature assembles the full serialized signature
    const zkLoginSignature = getZkLoginSignature({
      inputs: {
        ...zkProof,
        addressSeed,
      },
      maxEpoch,
      userSignature,
    });

    return { bytes, signature: zkLoginSignature };
  }

  async signAndExecute(tx: Transaction, senderAddress: string): Promise<string> {
    const { bytes, signature } = await this.getZkLoginSignature(tx, senderAddress);

    // ✅ executeTransaction (not executeTransactionBlock) on SuiGrpcClient
    const result = await suiClient.core.executeTransaction({
      transaction: bytes,
      signatures: [signature],
    });

    return result.digest;
  }

  private async fetchZkProof({
    jwt,
    extendedEphemeralPublicKey,
    maxEpoch,
    randomness,
  }: {
    jwt: string;
    extendedEphemeralPublicKey: string;
    maxEpoch: number;
    randomness: string;
  }): Promise<ZkProof> {
    // testnet prover — for mainnet you need Enoki access
    const PROVER_URL = 'https://prover-dev.mystenlabs.com/v1';

    const res = await fetch(PROVER_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jwt,
        extendedEphemeralPublicKey, // ✅ from getExtendedEphemeralPublicKey()
        maxEpoch: String(maxEpoch),
        jwtRandomness: randomness,
        salt: this.userSalt,
        keyClaimName: 'sub',
      }),
    });

    if (!res.ok) {
      throw new Error(`ZK prover error ${res.status}: ${await res.text()}`);
    }

    return res.json();
  }
}