import { getJsonRpcFullnodeUrl, SuiJsonRpcClient } from "@mysten/sui/jsonRpc";
import { SuiGrpcClient } from "@mysten/sui/grpc";
import { suins, SuinsTransaction } from "@mysten/suins";
import { deepbook } from "@mysten/deepbook-v3";
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";

import dotenv from "dotenv";
dotenv.config();

const _keypair = Ed25519Keypair.fromSecretKey(process.env.PK!);

export const jsonClient = new SuiJsonRpcClient({
  url: getJsonRpcFullnodeUrl("testnet"),
  network: "testnet",
}).$extend(suins());

export const grpcClient = new SuiGrpcClient({
  network: "testnet",
  baseUrl: "https://fullnode.testnet.sui.io:443",
}).$extend(
  deepbook({
    address: _keypair.getPublicKey().toSuiAddress().toString(),
    balanceManagers: {},
  }),
);
