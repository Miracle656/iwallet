// 1. Import all your exported functions as a single namespace object
import * as defiActions from "../tools/deepbook/schema_function.ts";
import { Transaction } from "@mysten/sui/transactions";
import { executeWithZkLogin } from "../lib/agent-signer.ts";

// 2. Define the strict positional parameter order for each function
const parameterOrderMap: Record<string, string[]> = {
  createBalanceManager: ["address"],
  depositIntoManager: ["managerKey", "coinKey", "amount"],
  withdrawFund: ["managerKey", "coinKey", "amount"],
  withdrawAllDeep: ["managerKey", "coinKey"],
  mintAndUseTradeCap: ["managerKey", "traderAddress"],
  mintDepositCap: ["managerKey", "recipient"],
  account: ["poolKey", "balanceManagerKey"],
  accountOpenOrders: ["poolKey", "managerKey"],
  checkManagerBalance: ["managerKey", "coinKey"],
  getOrder: ["poolKey", "orderId"],
  getQuantityOut: ["poolKey", "baseQuantity", "quoteQuantity"],
  getLevel2Range: ["poolKey", "priceLow", "priceHigh", "isBid"],
  getLevel2TicksFromMid: ["poolKey", "ticks"],
  lockedBalance: ["poolKey", "balanceManagerKey"],
  poolTradeParams: ["poolKey"],
  vaultBalances: ["poolKey"],
  getPoolIdByAssets: ["baseType", "quoteType"],
  midPrice: ["poolKey"],
  whitelisted: ["poolKey"],
  poolBookParams: ["poolKey"],
  getOrders: ["poolKey", "orderIds"],
  getPoolDeepPrice: ["poolKey"],
  addDeepPricePoint: ["targetPoolKey", "referencePoolKey"],
  updatePoolAllowedVersions: ["poolKey"],
  createPermissionlessPool: [
    "baseCoinKey",
    "quoteCoinKey",
    "tickSize",
    "lotSize",
    "minSize",
    "deepCoin",
  ],
  placeLimitOrder: [
    "poolKey",
    "balanceManagerKey",
    "clientOrderId",
    "price",
    "quantity",
    "isBid",
    "expiration",
    "orderType",
    "selfMatchingOption",
    "payWithDeep",
  ],
  placeMarketOrder: [
    "poolKey",
    "balanceManagerKey",
    "clientOrderId",
    "quantity",
    "isBid",
    "selfMatchingOption",
    "payWithDeep",
  ],
  cancelOrder: ["poolKey", "balanceManagerKey", "orderId"],
  cancelOrders: ["poolKey", "balanceManagerKey", "orderIds"],
  cancelAllOrders: ["poolKey", "balanceManagerKey"],
  modifyOrder: ["poolKey", "balanceManagerKey", "orderId", "newQuantity"],
  withdrawSettledAmounts: ["poolKey", "balanceManagerKey"],
  withdrawSettledAmountsPermissionless: ["poolKey", "balanceManagerKey"],
  borrowBaseAsset: ["poolKey", "borrowAmount"],
  returnBaseAsset: ["poolKey", "borrowAmount", "baseCoinInput", "flashLoanId"],
  borrowQuoteAsset: ["poolKey", "borrowAmount"],
  returnQuoteAsset: [
    "poolKey",
    "borrowAmount",
    "quoteCoinInput",
    "flashLoanId",
  ],
  swapExactBaseForQuote: [
    "poolKey",
    "amount",
    "deepAmount",
    "minOut",
    "deepCoin",
    "baseCoin",
    "quoteCoin",
  ],
  swapExactQuoteForBase: [
    "poolKey",
    "amount",
    "deepAmount",
    "minOut",
    "deepCoin",
    "baseCoin",
    "quoteCoin",
  ],
  swapExactQuantity: [
    "poolKey",
    "amount",
    "deepAmount",
    "minOut",
    "isBaseToCoin",
    "baseCoin",
    "quoteCoin",
    "deepCoin",
  ],
  swapExactQuantityWithManager: [
    "poolKey",
    "balanceManagerKey",
    "amount",
    "minOut",
    "isBaseToCoin",
    "tradeCap",
    "depositCap",
    "withdrawCap",
    "baseCoin",
    "quoteCoin",
  ],
  stake: ["poolKey", "balanceManager", "stakeAmount"],
  unstake: ["poolKey", "balanceManager", "stakeAmount"],
  submitProposal: [
    "poolKey",
    "balanceManagerKey",
    "takerFee",
    "makerFee",
    "stakeRequired",
  ],
  vote: ["poolKey", "balanceManagerKey", "proposal_id"],
  claimRebates: ["poolKey", "balanceManagerKey"],
  getAvailableCoins: ["network"],
  getCoinDetails: ["coinSymbol", "network"],
  getAvailablePools: ["network"],
  getPoolDetails: ["poolKey", "network"],
};

export async function executeDefiFunction(
  functionName: string,
  args: Record<string, unknown>,
  agentId?: string,
): Promise<any> {
  // Extract the function dynamically from the namespace using the string name
  const targetFunction = defiActions[functionName as keyof typeof defiActions];

  if (targetFunction && typeof targetFunction !== "function") {
    throw new Error(
      `❌ function execution failed: "${functionName}" does not exist in the registry module`,
    );
  }

  // look up paramenter order for specific function
  const exactParamSequence = parameterOrderMap[functionName];

  if (!exactParamSequence) {
    throw new Error(
      `❌ function execution failed: "${functionName}" does not have a defined parameter order`,
    );
  }

  // Sort the key-value arguement array into a flat array position values
  const positionalArgs = exactParamSequence.map((paramKey) => {
    return args[paramKey];
  });

  // Reset the shared Transaction object before every call (freshTx)
  defiActions.freshTx();

  console.log(
    `🚀 Dynamically invoking: actions.${functionName}(${positionalArgs.map((x) => (typeof x === "object" ? JSON.stringify(x) : x)).join(", ")})`,
  );

  const result = await Reflect.apply(targetFunction, null, positionalArgs);

  // If the function returned a Transaction (write op) and we have a session, sign + submit
  if (result instanceof Transaction && agentId) {
    console.log(`✍️  Signing ${functionName} with zkLogin session ${agentId}`);
    return await executeWithZkLogin(agentId, result);
  }

  return result;
}
