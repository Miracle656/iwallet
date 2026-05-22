import { SuiGrpcClient } from "@mysten/sui/grpc";
import { Transaction } from "@mysten/sui/transactions";
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import { Signer } from "@mysten/sui/cryptography";

// Initialize Client (Point to Testnet)

// Load your backend "Sponsor" wallet from the environment

export async function sponsorAndExecute(
  tx: Transaction,
  signer: Signer,
  client: SuiGrpcClient,
) {
  return await signer.signAndExecuteTransaction({
    transaction: tx,
    client: client,
  });
}
