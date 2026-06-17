import { getJsonRpcFullnodeUrl, SuiJsonRpcClient } from "@mysten/sui/jsonRpc";
import { SuiGrpcClient } from "@mysten/sui/grpc";
import { suins, SuinsTransaction } from "@mysten/suins";
import { deepbook } from "@mysten/deepbook-v3";
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";

import dotenv from "dotenv";
dotenv.config();

const _pk = process.env.PK;
const _keypair = _pk ? Ed25519Keypair.fromSecretKey(_pk) : null;
const _agentAddress = _keypair
  ? _keypair.getPublicKey().toSuiAddress().toString()
  : "0x0000000000000000000000000000000000000000000000000000000000000000";

export const keypair = _keypair;

export const jsonClient = new SuiJsonRpcClient({
  url: getJsonRpcFullnodeUrl("testnet"),
  network: "testnet",
}).$extend(suins());

export const grpcClient = new SuiGrpcClient({
  network: "testnet",
  baseUrl: "https://fullnode.testnet.sui.io:443",
}).$extend(
  deepbook({
    address: _agentAddress,
    balanceManagers: {},
  }),
);
