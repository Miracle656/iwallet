import 'dotenv/config'; // Shortcut for import and config() call
import { Transaction } from '@mysten/sui/transactions';
// OR
import * as dotenv from 'dotenv';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { SuiGrpcClient } from '@mysten/sui/grpc';
import { log } from 'console';
dotenv.config();
const PK = process.env.pk;
const client = new SuiGrpcClient({
    network: "testnet",
    baseUrl: 'https://fullnode.testnet.sui.io:443',
});
const tx = new Transaction();
const [addr] = tx.moveCall({
    package: "0xcec778af408d690baaf8c2b3ddd6cc5cdd09647e420f271a35868105b070bcb2",
    module: "prototype",
    function: "get_iidentity_v2",
    typeArguments: ["0xa1ec7fc00a6f40db9693ad1415d0c193ad3906494428cf252621037bd7117e29::usdc::USDC"],
    arguments: [tx.object("0x797bc83b6acecfddd7a4dba71077a76db4c611b3c6237dfd7f954d58d3984f80")]
});
const result = await client.signAndExecuteTransaction({
    transaction: tx,
    signer: Ed25519Keypair.fromSecretKey(PK?.toString()),
    include: { objectTypes: true }
});
const returnBytes = result;
log(returnBytes);
log(addr.NestedResult[0].toString());
log(addr.NestedResult[1].toString());
log(addr.$kind.toString());
