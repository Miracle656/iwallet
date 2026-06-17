/* eslint-disable @typescript-eslint/no-explicit-any */
import {  } from '@mysten/sui/client';
import { getJsonRpcFullnodeUrl, SuiJsonRpcClient } from '@mysten/sui/jsonRpc';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { Transaction } from '@mysten/sui/transactions';
import { 
    generateNonce, 
    generateRandomness, 
    getZkLoginSignature, 
    jwtToAddress 
} from '@mysten/sui/zklogin';

export interface ZkLoginSession {
    ephemeralPrivateKey: string; // Stored as Bech32 or private key string for easy serialization
    maxEpoch: number;
    randomness: string;
    nonce: string;
}

export class ZkLoginService {
    private client: SuiJsonRpcClient;
    private proverUrl = 'https://prover-dev.mystenlabs.com/v1'; // Target production prover for mainnet

    constructor(network: 'mainnet' | 'testnet' | 'devnet' = 'devnet') {
        this.client = new SuiJsonRpcClient({ url: getJsonRpcFullnodeUrl('testnet'), network: 'testnet' });
    }

    /**
     * Generates session parameters for the OAuth request.
     */
    public async beginSession(): Promise<ZkLoginSession> {
        const ephemeralKeypair = new Ed25519Keypair();
        const randomness = generateRandomness();
        
        const { epoch } = await this.client.getLatestSuiSystemState();
        const maxEpoch = Number(epoch) + 2; 
        
        const nonce = generateNonce(ephemeralKeypair.getPublicKey(), maxEpoch, randomness);

        return {
            ephemeralPrivateKey: ephemeralKeypair.getSecretKey(),
            maxEpoch,
            randomness,
            nonce
        };
    }

    /**
     * Constructs the Google OAuth initiation URL.
     */
    public getGoogleAuthUrl(clientId: string, redirectUri: string, nonce: string): string {
        const params = new URLSearchParams({
            client_id: clientId,
            response_type: 'id_token',
            redirect_uri: redirectUri,
            scope: 'openid email profile',
            nonce: nonce,
        });
        return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
    }

    /**
     * Requests the zero-knowledge proof from the Mysten Prover backend.
     */
    public async getProof(jwt: string, session: ZkLoginSession, salt: string) {
        const ephemeralKeypair = Ed25519Keypair.fromSecretKey(session.ephemeralPrivateKey);
        
        const payload = {
            jwt,
            extendedEphemeralPublicKey: ephemeralKeypair.getPublicKey().toSuiPublicKey(),
            maxEpoch: session.maxEpoch,
            jwtRandomness: session.randomness,
            salt,
            keyClaimName: 'sub'
        };

        const response = await fetch(this.proverUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            throw new Error(`Prover communication failed: ${response.statusText}`);
        }

        const zkProof = await response.json();
        const suiAddress = jwtToAddress(jwt, salt, false);

        return { suiAddress, zkProof };
    }

    /**
     * Builds, signs, and posts a transaction block using the compiled ZK signature.
     */
    public async executeWithZkLogin(
        tx: Transaction,
        session: ZkLoginSession,
        zkProof: any,
        addressSeed: string
    ) {
        const ephemeralKeypair = Ed25519Keypair.fromSecretKey(session.ephemeralPrivateKey);
        
        // Build transaction targeting the modern SuiClient instance
        const txBytes = await tx.build({ client: this.client });
        
        // Sign raw transaction bytes using the ephemeral key
        const signature  = await ephemeralKeypair.sign(txBytes);

        // Map proof variables directly to the signature builder
        const zkLoginSignature = getZkLoginSignature({
            inputs: {
                ...zkProof,
                addressSeed
            },
            maxEpoch: session.maxEpoch,
            signature,
        });

        return await this.client.executeTransactionBlock({
            transactionBlock: txBytes,
            signature: zkLoginSignature,
            options: { showEffects: true, showObjectChanges: true }
        });
    }
}