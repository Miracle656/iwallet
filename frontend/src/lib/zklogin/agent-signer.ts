// src/lib/zklogin/agent-signer.ts
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { getZkLoginSignature } from '@mysten/sui/zklogin';
import { SuiClient, getFullnodeUrl } from '@mysten/sui/client';
import { Transaction } from '@mysten/sui/transactions';

const suiClient = new SuiClient({ url: getFullnodeUrl('testnet') });

interface AgentSession {
  jwt: string;
  ephemeralPrivateKey: Uint8Array;
  ephemeralPublicKey: Uint8Array;
  maxEpoch: number;
  jwtRandomness: string;
  salt: string;
  address: string;
}

export class AgentZkLoginSigner {
  
  async signTransaction(session: AgentSession, txBytes: Uint8Array): Promise<string> {
    // Check epoch expiry
    const currentEpoch = await this.getCurrentEpoch();
    if (currentEpoch > session.maxEpoch) {
      throw new Error('Session expired - user must re-authenticate');
    }

    // Generate ZK proof
    const proof = await this.generateZkProof(session);

    // Sign with ephemeral key (v1.x API: signTransaction, not signTransactionBlock)
    const keypair = Ed25519Keypair.fromSecretKey(session.ephemeralPrivateKey);
    const ephemeralSignature = keypair.signTransaction(txBytes);

    // Assemble zkLogin signature
    return getZkLoginSignature({
      inputs: proof,
      maxEpoch: session.maxEpoch,
      userSignature: ephemeralSignature,
    });
  }

  async executeTransaction(session: AgentSession, transaction: Transaction) {
    // Build transaction (v1.x API: transaction.build with client and sender)
    const txBytes = await transaction.build({
      client: suiClient,
      sender: session.address,
    });

    // Sign
    const signature = await this.signTransaction(session, txBytes);

    // Execute (v1.x API: executeTransactionBlock)
    return suiClient.executeTransactionBlock({
      transactionBlock: txBytes,
      signature,
    });
  }

  private async generateZkProof(session: AgentSession): Promise<any> {
    const response = await fetch(process.env.ZKLOGIN_PROVER_URL!, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jwt: session.jwt,
        extendedEphemeralPublicKey: Buffer.from(session.ephemeralPublicKey).toString('base64'),
        maxEpoch: session.maxEpoch,
        jwtRandomness: session.jwtRandomness,
        salt: session.salt,
        keyClaimName: 'sub',
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`ZK proof generation failed: ${error}`);
    }

    return await response.json();
  }

  private async getCurrentEpoch(): Promise<number> {
    const state = await suiClient.getLatestSuiSystemState();
    return Number(state.epoch);
  }
}

export const agentSigner = new AgentZkLoginSigner();