import { SuiGraphQLClient } from '@mysten/sui/graphql';

const suiClient = new SuiGraphQLClient({
	url: 'https://sui-mainnet.mystenlabs.com/graphql',
	network: 'mainnet',
});

export const walletTools = [
	{
		type: 'function' as const,
		function: {
			name: 'getBalance',
			description: 'Get the SUI token balance for a wallet address',
			parameters: {
				type: 'object',
				properties: {
					address: {
						type: 'string',
						description: 'The Sui wallet address (0x...)',
					},
				},
				required: ['address'],
			},
		},
	},
	{
		type: 'function' as const,
		function: {
			name: 'getDeepBookPools',
			description: 'Get available DeepBook liquidity pools',
			parameters: {
				type: 'object',
				properties: {},
			},
		},
	},
	{
		type: 'function' as const,
		function: {
			name: 'swapOnDeepBook',
			description: 'Swap tokens on DeepBook',
			parameters: {
				type: 'object',
				properties: {
					poolId: {type: 'string', description: 'DeepBook pool object ID'},
					fromCoin: {type: 'string', description: 'Coin type to swap from'},
					toCoin: {type: 'string', description: 'Coin type to swap to'},
					amount: {type: 'number', description: 'Amount in base units (MIST)'},
					slippage: {
						type: 'number',
						description: 'Slippage tolerance in basis points',
					},
				},
				required: ['poolId', 'fromCoin', 'toCoin', 'amount'],
			},
		},
	},
	{
		type: 'function' as const,
		function: {
			name: 'transfer',
			description: 'Transfer SUI or other coins to an address',
			parameters: {
				type: 'object',
				properties: {
					toAddress: {type: 'string', description: 'Recipient Sui address'},
					amount: {type: 'number', description: 'Amount in base units'},
					coinType: {
						type: 'string',
						description: 'Coin type (default: 0x2::sui::SUI)',
					},
				},
				required: ['toAddress', 'amount'],
			},
		},
	},
	{
		type: 'function' as const,
		function: {
			name: 'getTransactionHistory',
			description: 'Get recent transactions for a wallet address',
			parameters: {
				type: 'object',
				properties: {
					address: {type: 'string', description: 'Wallet address to query'},
					limit: {
						type: 'number',
						description: 'Number of transactions (max 50)',
					},
				},
				required: ['address'],
			},
		},
	},
];

export async function executeTool(
	name: string,
	args: Record<string, any>,
): Promise<string> {
	switch (name) {
		case 'getBalance': {
			const balance = await suiClient.getBalance({
				owner: args.address,
			});
			const suiAmount = Number(balance.balance) / 1e9;
			return `Balance: ${balance.balance} MIST (${suiAmount.toFixed(4)} SUI)`;
		}

		case 'getDeepBookPools': {
			return `Available DeepBook Pools:
• SUI/USDC: 0x4409...
• SUI/USDT: 0x51c4...
• USDC/USDT: 0x7d1c...
Use 'swapOnDeepBook' with the pool ID to trade.`;
		}

		case 'swapOnDeepBook': {
			const {poolId, fromCoin, toCoin, amount, slippage} = args;
			return `Swap prepared:
From: ${fromCoin}
To: ${toCoin}
Amount: ${amount} MIST
Pool: ${poolId}
Slippage: ${slippage || 0.5}%

⚠️  Transaction not submitted — no signer configured.
Set IWALLET_PRIVATE_KEY to enable trading.`;
		}

		case 'transfer': {
			const {toAddress, amount, coinType = '0x2::sui::SUI'} = args;
			return `Transfer prepared:
To: ${toAddress}
Amount: ${amount} MIST
Coin: ${coinType}

⚠️  Transaction not submitted — no signer configured.`;
		}

		case 'getTransactionHistory': {
			const txs = await suiClient.
			if (!txs.data.length) return 'No transactions found.';

			return txs.data
				.map((tx, i) => {
					const status = tx.effects?.status.status || 'unknown';
					return `${i + 1}. ${tx.digest.slice(0, 16)}... | ${status}`;
				})
				.join('\n');
		}

		default:
			return `Unknown tool: ${name}`;
	}
}
