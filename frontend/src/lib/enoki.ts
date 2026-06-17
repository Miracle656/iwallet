// src/lib/enoki.ts
import { 
  EnokiFlow, 
  EnokiClient,
  EnokiNetwork,
  createLocalStorage,
  createDefaultEncryption,
  registerEnokiWallets,
  isEnokiNetwork
} from '@mysten/enoki';
import { getJsonRpcFullnodeUrl, SuiJsonRpcClient } from '@mysten/sui/jsonRpc';

const NETWORK = (process.env.NEXT_PUBLIC_SUI_NETWORK as EnokiNetwork) || 'mainnet';
const suiClient  = new SuiJsonRpcClient({
  url: getJsonRpcFullnodeUrl("testnet"),
  network: 'testnet'
})

// Client-side Enoki flow (for OAuth/zkLogin)
// EnokiFlow is a class you instantiate, not a factory function
registerEnokiWallets({
    client: suiClient,
    network: 'testnet',
      apiKey: process.env.NEXT_PUBLIC_ENOKI_API_KEY!,
      providers: {
        google: {
          clientId: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID as string
        }
      }
    })


export function setupEnokiWallets(network: 'testnet' | 'mainnet' | 'devnet') {
  if (!isEnokiNetwork(network)) return () => {};

  return registerEnokiWallets({
    client: suiClient,
    network,
    apiKey: process.env.NEXT_PUBLIC_ENOKI_API_KEY!,
    providers: {
      google: {
        clientId: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID!,
      },
    },
  });
}

// Backend client (for sponsored transactions)
export const enokiClient = typeof window === 'undefined'
  ? new EnokiClient({
      apiKey: process.env.ENOKI_SECRET_KEY!,
    })
  : null;