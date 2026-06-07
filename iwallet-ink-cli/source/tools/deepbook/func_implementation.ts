import {SuiGrpcClient} from '@mysten/sui/grpc';
import {Transaction, TransactionObjectArgument} from '@mysten/sui/transactions';
import {Ed25519Keypair} from '@mysten/sui/keypairs/ed25519';
import {deepbook} from '@mysten/deepbook-v3';

import dotenv from 'dotenv';
import {
	AccountInfo,
	BaseQuantityOut,
	QuantityOut,
	QuoteQuantityOut,
	Level2Range,
	Level2TicksFromMid,
	PoolTradeParams,
	VaultBalances,
	PoolBookParams,
	PoolDeepPrice,
	OrderType,
	SelfMatchingOptions,
	SwapParams,
} from '../../types/index.js';

dotenv.config();

const tx = new Transaction();
const _keypair = Ed25519Keypair.fromSecretKey(process.env.PK!);

const grpcClient = new SuiGrpcClient({
	network: 'testnet',
	baseUrl: 'https://fullnode.testnet.sui.io:443',
}).$extend(
	deepbook({
		address: _keypair.getPublicKey().toSuiAddress().toString(),
		balanceManagers: {},
	}),
);

// create balance manager
export async function createBalanceManager(
	address: string,
): Promise<Transaction> {
	tx.add(
		grpcClient.deepbook.balanceManager.createBalanceManagerWithOwner(address),
	);

	return tx;
}

// deposit fund to balanace manager
export async function depositIntoManager(
	managerKey: string,
	coinKey: string,
	amount: number,
): Promise<Transaction> {
	tx.add(
		grpcClient.deepbook.balanceManager.depositIntoManager(
			managerKey,
			coinKey,
			amount,
		),
	);
	return tx;
}

// withdraw a coin from deepbook
export async function withdrawFund(
	managerKey: string,
	coinKey: string,
	amount: number,
): Promise<Transaction> {
	tx.add(
		grpcClient.deepbook.balanceManager.withdrawFromManager(
			managerKey,
			coinKey,
			amount,
			_keypair.getPublicKey().toString(),
		),
	);
	return tx;
}

// withdrw all the deep from deepbook
export async function withdrawAllDeep(
	managerKey: string,
	coinKey: string,
): Promise<Transaction> {
	tx.add(
		grpcClient.deepbook.balanceManager.withdrawAllFromManager(
			managerKey,
			coinKey,
			_keypair.getPublicKey().toString(),
		),
	);
	return tx;
}

// creating capability from delegate trading on deepbook
export async function mintAndUseTradeCap(
	managerKey: string,
	traderAddress: string,
): Promise<Transaction> {
	const tradeCap = tx.add(
		grpcClient.deepbook.balanceManager.mintTradeCap(managerKey),
	);

	tx.transferObjects([tradeCap], traderAddress);

	return tx;
}

// minting a trading capability
export async function mintDepositCap(
	managerKey: string,
	recipient: string,
): Promise<Transaction> {
	const depositCap = tx.add(
		grpcClient.deepbook.balanceManager.mintDepositCap(managerKey),
	);
	tx.transferObjects([depositCap], recipient);
	return tx;
}

/*
  Use account to retrieve the account information for a BalanceManager in a pool,
  which has the following form:
  parameters -
    @poolKey: String that identifies the pool to query.
    @balanceManagerKey: key of the balance manager defined in the SDK.
*/
export async function account(
	poolKey: string,
	balanceManagerKey: string,
): Promise<AccountInfo> {
	return await grpcClient.deepbook.account(poolKey, balanceManagerKey);
}

/*
  Use accountOpenOrders to retrieve open orders for the balance manager and pool with the IDs you provide.
  The call returns a Promise that contains an array of open order IDs.
  parameters -
    poolKey: String that identifies the pool to query.
    managerKey: String that identifies the balance manager to query.
*/

export async function accountOpenOrders(
	poolKey: string,
	managerKey: string,
): Promise<string[]> {
	return await grpcClient.deepbook.accountOpenOrders(poolKey, managerKey);
}

/*
Use checkManagerBalance to check the balance manager for a specific coin.
The call returns a Promise in the form:
  {
    coinType: string,
    balance: number
  }

  Parameters

  managerKey: String that identifies the balance manager to query.
  coinKey: String that identifies the coin to query the balance of.
*/
export async function checkManagerBalance(
	managerKey: string,
	coinKey: string,
): Promise<{
	coinType: string;
	balance: number;
}> {
	return await grpcClient.deepbook.checkManagerBalance(managerKey, coinKey);
}

/*
Use getOrder to retrieve an order's information.
The call returns a Promise in the Order struct, which has the following form:

{
  balance_manager_id: {
    bytes: '0x6149bfe6808f0d6a9db1c766552b7ae1df477f5885493436214ed4228e842393'
  },
  order_id: '9223372036873222552073709551614',
  client_order_id: '888',
  quantity: '50000000',
  filled_quantity: '0',
  fee_is_deep: true,
  order_deep_price: { asset_is_base: false, deep_per_asset: '0' },
  epoch: '440',
  status: 0,
  expire_timestamp: '1844674407370955161'
}

Parameters

poolKey: String that identifies the pool to query. orderId: ID of the order to query.

*/
export async function getOrder(
	poolKey: string,
	orderId: string,
): Promise<{
	balance_manager_id: string;
	order_id: string;
	client_order_id: string;
	quantity: string;
	filled_quantity: string;
	fee_is_deep: boolean;
	order_deep_price: {asset_is_base: boolean; deep_per_asset: string};
	epoch: string;
	status: number;
	expire_timestamp: string;
} | null> {
	return await grpcClient.deepbook.getOrder(poolKey, orderId);
}

/*
Use getQuantityOut to retrieve the output quantities for the base or quote quantity you provide.
You provide values for both quantities, but only one of them can be nonzero. The call returns a Promise with the form:

{
  baseQuantity: number,
  quoteQuantity: number,
  baseOut: number,
  quoteOut: number,
  deepRequired: number
}

Parameters

poolKey: String that identifies the pool to query.
baseQuantity: Number that defines the base quantity you want to convert. Set to 0 if using quote quantity.
quoteQuantity: Number that defines the quote quantity you want to convert. Set to 0 if using base quantity.
*/
export async function getQuantityOut(
	poolKey: string,
	baseQuantity: number,
	quoteQuantity: number,
): Promise<QuantityOut> {
	return await grpcClient.deepbook.getQuantityOut(
		poolKey,
		baseQuantity,
		quoteQuantity,
	);
}

/*
Use getLevel2Range to retrieve level 2 order book within the boundary price range you provide.
The call returns a Promise in the form:
  {
    prices: Array<number>,
    quantities: Array<number>
  }
  Parameters

  poolKey: String that identifies the pool to query.
  priceLow: Number for lower bound of price range.
  priceHigh: Number for upper bound of price range.
  isBid: Boolean when set to true gets bid orders, else retrieve ask orders.
*/
export async function getLevel2Range(
	poolKey: string,
	priceLow: number | bigint,
	priceHigh: number | bigint,
	isBid: boolean,
): Promise<Level2Range> {
	return await grpcClient.deepbook.getLevel2Range(
		poolKey,
		priceLow,
		priceHigh,
		isBid,
	);
}

/*
Use getLevel2TicksFromMid to retrieve level 2 order book ticks from mid-price for a pool with the ID you provide.
The call returns a Promise in the form:
{
  bid_prices: Array<number>,
  bid_quantities: Array<number>,
  ask_prices: Array<number>,
  ask_quantities: Array<number>
}

  Parameters

  poolKey: String that identifies the pool to query.
  ticks: Number of ticks from mid-price.
*/

export async function getLevel2TicksFromMid(
	poolKey: string,
	ticks: number,
): Promise<Level2TicksFromMid> {
	return await grpcClient.deepbook.getLevel2TicksFromMid(poolKey, ticks);
}

// stoped here so the function implementation can be added from this function => lockedBalance todo
// todo
export async function lockedBalance(
	poolKey: string,
	balanceManagerKey: string,
): Promise<{
	base: number;
	quote: number;
	deep: number;
}> {
	return await grpcClient.deepbook.lockedBalance(poolKey, balanceManagerKey);
}

export async function poolTradeParams(
	poolKey: string,
): Promise<PoolTradeParams> {
	return await grpcClient.deepbook.poolTradeParams(poolKey);
}

export async function vaultBalances(poolKey: string): Promise<VaultBalances> {
	return await grpcClient.deepbook.vaultBalances(poolKey);
}

export async function getPoolIdByAssets(
	baseType: string,
	quoteType: string,
): Promise<string> {
	return await grpcClient.deepbook.getPoolIdByAssets(baseType, quoteType);
}

export async function midPrice(poolKey: string): Promise<number> {
	return await grpcClient.deepbook.midPrice(poolKey);
}

export async function whitelisted(poolKey: string): Promise<boolean> {
	return await grpcClient.deepbook.whitelisted(poolKey);
}

export async function poolBookParams(poolKey: string): Promise<PoolBookParams> {
	return await grpcClient.deepbook.poolBookParams(poolKey);
}

export async function getOrders(
	poolKey: string,
	orderIds: string[],
): Promise<
	| {
			balance_manager_id: string;
			order_id: string;
			client_order_id: string;
			quantity: string;
			filled_quantity: string;
			fee_is_deep: boolean;
			order_deep_price: {
				asset_is_base: boolean;
				deep_per_asset: string;
			};
			epoch: string;
			status: number;
			expire_timestamp: string;
	  }[]
	| null
> {
	return await grpcClient.deepbook.getOrders(poolKey, orderIds);
}

export async function getPoolDeepPrice(
	poolKey: string,
): Promise<PoolDeepPrice> {
	return await grpcClient.deepbook.getPoolDeepPrice(poolKey);
}

export function addDeepPricePoint(
	targetPoolKey: string,
	referencePoolKey: string,
) {
	return grpcClient.deepbook.deepBook.addDeepPricePoint(
		targetPoolKey,
		referencePoolKey,
	);
}

export function updatePoolAllowedVersions(poolKey: string) {
	return grpcClient.deepbook.deepBook.updatePoolAllowedVersions(poolKey);
}

export function createPermissionlessPool(
	baseCoinKey: string,
	quoteCoinKey: string,
	tickSize: number,
	lotSize: number,
	minSize: number,
	deepCoin: TransactionObjectArgument | undefined,
) {
	return grpcClient.deepbook.deepBook.createPermissionlessPool({
		baseCoinKey,
		quoteCoinKey,
		tickSize,
		lotSize,
		minSize,
		deepCoin,
	});
}

export function getBalanceManagerIds(owner: string) {
	return grpcClient.deepbook.deepBook.getBalanceManagerIds(owner);
}

export function mintRefferal(poolKey: string, multiplier: number) {
	return grpcClient.deepbook.deepBook.mintReferral(poolKey, multiplier);
}

export function updateReferralMultiplier(
	poolKey: string,
	referral: string,
	multiplier: number,
) {
	return grpcClient.deepbook.deepBook.updatePoolReferralMultiplier(
		poolKey,
		referral,
		multiplier,
	);
}

export function claimReferralRewards(poolKey: string, referral: string) {
	return grpcClient.deepbook.deepBook.claimPoolReferralRewards(
		poolKey,
		referral,
	);
}

export function getReferralBalances(poolKey: string, referral: string) {
	return grpcClient.deepbook.deepBook.getPoolReferralBalances(
		poolKey,
		referral,
	);
}
/*
	start from here to implement the schema
	all Order function
*/
export function placeLimitOrder(
	poolKey: string,
	balanceManagerKey: string,
	clientOrderId: string,
	price: number | bigint,
	quantity: number | bigint,
	isBid: boolean,
	expiration?: number | bigint,
	orderType?: OrderType,
	selfMatchingOption?: SelfMatchingOptions,
	payWithDeep?: boolean,
) {
	return grpcClient.deepbook.deepBook.placeLimitOrder({
		poolKey,
		balanceManagerKey,
		clientOrderId,
		price,
		quantity,
		isBid,
		expiration,
		orderType,
		selfMatchingOption,
		payWithDeep,
	});
}

export function placeMarketOrder(
	poolKey: string,
	balanceManagerKey: string,
	clientOrderId: string,
	quantity: number | bigint,
	isBid: boolean,
	selfMatchingOption?: SelfMatchingOptions,
	payWithDeep?: boolean,
) {
	return grpcClient.deepbook.deepBook.placeMarketOrder({
		poolKey,
		balanceManagerKey,
		clientOrderId,
		quantity,
		isBid,
		selfMatchingOption,
		payWithDeep,
	});
}

export function cancelOrder(
	poolKey: string,
	balanceManagerKey: string,
	orderId: string,
) {
	return grpcClient.deepbook.deepBook.cancelOrder(
		poolKey,
		balanceManagerKey,
		orderId,
	);
}

export function cancelOrders(
	poolKey: string,
	balanceManagerKey: string,
	orderIds: string[],
) {
	return grpcClient.deepbook.deepBook.cancelOrders(
		poolKey,
		balanceManagerKey,
		orderIds,
	);
}

export function cancelAllOrders(poolKey: string, balanceManagerKey: string) {
	return grpcClient.deepbook.deepBook.cancelAllOrders(
		poolKey,
		balanceManagerKey,
	);
}

export function modifyOrder(
	poolKey: string,
	balanceManagerKey: string,
	orderId: string,
	newQuantity: number,
) {
	return grpcClient.deepbook.deepBook.modifyOrder(
		poolKey,
		balanceManagerKey,
		orderId,
		newQuantity,
	);
}

export function withdrawSettledAmounts(
	poolKey: string,
	balanceManagerKey: string,
) {
	return grpcClient.deepbook.deepBook.withdrawSettledAmounts(
		poolKey,
		balanceManagerKey,
	);
}

export function withdrawSettledAmountsPermissionless(
	poolKey: string,
	balanceManagerKey: string,
) {
	return grpcClient.deepbook.deepBook.withdrawSettledAmountsPermissionless(
		poolKey,
		balanceManagerKey,
	);
}

/*
	flash loans functions
*/
export function borrowBaseAsset(poolKey: string, borrowAmount: number) {
	return grpcClient.deepbook.flashLoans.borrowBaseAsset(poolKey, borrowAmount);
}

export function returnBaseAsset(
	poolKey: string,
	borrowAmount: number,
	baseCoinInput: TransactionObjectArgument,
	flashLoanId: TransactionObjectArgument,
) {
	return grpcClient.deepbook.flashLoans.returnBaseAsset(
		poolKey,
		borrowAmount,
		baseCoinInput,
		flashLoanId,
	);
}

export function borrowQuoteAsset(poolKey: string, borrowAmount: number) {
	return grpcClient.deepbook.flashLoans.borrowQuoteAsset(poolKey, borrowAmount);
}

export function returnQuoteAsset(
	poolKey: string,
	borrowAmount: number,
	quoteCoinInput: TransactionObjectArgument,
	flashLoanId: TransactionObjectArgument,
) {
	return grpcClient.deepbook.flashLoans.returnQuoteAsset(
		poolKey,
		borrowAmount,
		quoteCoinInput,
		flashLoanId,
	);
}

/*
	Swap functions
*/
export function swapExactBaseForQuote(
	poolKey: string,
	amount: number | bigint,
	deepAmount: number | bigint,
	minOut: number | bigint,
	deepCoin?: TransactionObjectArgument,
	baseCoin?: TransactionObjectArgument,
	quoteCoin?: TransactionObjectArgument,
) {
	return grpcClient.deepbook.deepBook.swapExactBaseForQuote({
		poolKey,
		amount,
		deepAmount,
		minOut,
		deepCoin,
		baseCoin,
		quoteCoin,
	});
}

export function swapExactQuoteForBase(
	poolKey: string,
	amount: number | bigint,
	deepAmount: number | bigint,
	minOut: number | bigint,
	deepCoin?: TransactionObjectArgument,
	baseCoin?: TransactionObjectArgument,
	quoteCoin?: TransactionObjectArgument,
) {
	return grpcClient.deepbook.deepBook.swapExactQuoteForBase({
		poolKey,
		amount,
		deepAmount,
		minOut,
		deepCoin,
		baseCoin,
		quoteCoin,
	});
}

export function swapExactQuantity(
	poolKey: string,
	amount: number,
	deepAmount: number,
	minOut: number,
	isBaseToCoin: boolean,
	baseCoin?: TransactionObjectArgument,
	quoteCoin?: TransactionObjectArgument,
	deepCoin?: TransactionObjectArgument,
) {
	return grpcClient.deepbook.deepBook.swapExactQuantity({
		poolKey,
		amount,
		deepAmount,
		minOut,
		isBaseToCoin,
		baseCoin,
		quoteCoin,
		deepCoin,
	});
}

export function swapExactQuantityWithManager(
	poolKey: string,
	balanceManagerKey: string,
	amount: number,
	minOut: number,
	isBaseToCoin: boolean,
	tradeCap: string,
	depositCap: string,
	withdrawCap: string,
	baseCoin?: TransactionObjectArgument,
	quoteCoin?: TransactionObjectArgument,
) {
	return grpcClient.deepbook.deepBook.swapExactQuantityWithManager({
		poolKey,
		balanceManagerKey,
		amount,
		minOut,
		isBaseToCoin,
		tradeCap,
		depositCap,
		withdrawCap,
		baseCoin,
		quoteCoin,
	});
}

/*
Staking and governance functions
*/

export function stake(
	poolKey: string,
	balanceManager: string,
	stakeAmount: number,
) {
	return grpcClient.deepbook.governance.stake(
		poolKey,
		balanceManager,
		stakeAmount,
	);
}

export function unstake(
	poolKey: string,
	balanceManager: string,
	stakeAmount: number,
) {
	return grpcClient.deepbook.governance.stake(
		poolKey,
		balanceManager,
		stakeAmount,
	);
}

export function submitProposal(
	poolKey: string,
	balanceManagerKey: string,
	takerFee: number | bigint,
	makerFee: number | bigint,
	stakeRequired: number | bigint,
) {
	return grpcClient.deepbook.governance.submitProposal({
		poolKey,
		balanceManagerKey,
		takerFee,
		makerFee,
		stakeRequired,
	});
}

export function vote(
	poolKey: string,
	balanceManagerKey: string,
	proposal_id: string,
) {
	return grpcClient.deepbook.governance.vote(
		poolKey,
		balanceManagerKey,
		proposal_id,
	);
}

export function claimRebates(poolKey: string, balanceManagerKey: string) {
	return grpcClient.deepbook.deepBook.claimRebates(poolKey, balanceManagerKey);
}
