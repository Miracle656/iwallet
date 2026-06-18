export type DeepBookTaskType =
  | "CREATE_BALANCE_MANAGER"
  | "DEPOSIT_INTO_MANAGER"
  | "WITHDRAW_FUND"
  | "WITHDRAW_ALL_DEEP"
  | "MINT_AND_USE_TRADE_CAP"
  | "MINT_DEPOSIT_CAP"
  | "ACCOUNT"
  | "ACCOUNT_OPEN_ORDERS"
  | "CHECK_MANAGER_BALANCE"
  | "GET_ORDER"
  | "GET_QUANTITY_OUT"
  | "GET_LEVEL2_RANGE"
  | "GET_LEVEL2_TICKS_FROM_MID"
  | "LOCKED_BALANCE"
  | "POOL_TRADE_PARAMS"
  | "VAULT_BALANCES"
  | "GET_POOL_ID_BY_ASSETS"
  | "MID_PRICE"
  | "WHITELISTED"
  | "POOL_BOOK_PARAMS"
  | "GET_ORDERS"
  | "GET_POOL_DEEP_PRICE"
  | "ADD_DEEP_PRICE_POINT"
  | "UPDATE_POOL_ALLOWED_VERSIONS"
  | "CREATE_PERMISSIONLESS_POOL"
  | "GET_BALANCE_MANAGER_IDS"
  | "MINT_REFERRAL"
  | "UPDATE_REFERRAL_MULTIPLIER"
  | "CLAIM_REFERRAL_REWARDS"
  | "GET_REFERRAL_BALANCES"
  | "PLACE_LIMIT_ORDER"
  | "PLACE_MARKET_ORDER"
  | "CANCEL_ORDER"
  | "CANCEL_ORDERS"
  | "CANCEL_ALL_ORDERS"
  | "MODIFY_ORDER"
  | "WITHDRAW_SETTLED_AMOUNTS"
  | "WITHDRAW_SETTLED_AMOUNTS_PERMISSIONLESS"
  | "BORROW_BASE_ASSET"
  | "RETURN_BASE_ASSET"
  | "BORROW_QUOTE_ASSET"
  | "RETURN_QUOTE_ASSET"
  | "SWAP_EXACT_BASE_FOR_QUOTE"
  | "SWAP_EXACT_QUOTE_FOR_BASE"
  | "SWAP_EXACT_QUANTITY"
  | "SWAP_EXACT_QUANTITY_WITH_MANAGER"
  | "STAKE"
  | "UNSTAKE"
  | "SUBMIT_PROPOSAL"
  | "VOTE"
  | "CLAIM_REBATES"
  | "GET_AVAILABLE_COINS"
  | "GET_COIN_DETAILS"
  | "GET_AVAILABLE_POOLS"
  | "GET_POOL_DETAILS";

export interface DeepbookTask {
  task: DeepBookTaskType;
  description: string;
  extracted_params?: Record<string, string>;
}

export interface DeepbookTaskResult {
  required_task: DeepBookTaskType[];
  tasks: DeepbookTask[];
  execution_order: "sequential" | "parallel";
  requires_confirmation?: boolean;
}

export interface DeepbookResult {
  agent: DeepBookTaskType;
  status: "success" | "error";
  result: unknown;
}

export interface DeepbookExecutionResponse {
  message: string;
  execution_plan: DeepBookTaskType[];
  results: DeepbookResult[];
  required_confirmation: boolean;
}

export interface ToolCallResult {
  type: "TOOL_CALL";
  functionName: string;
  arguments: Record<string, unknown>;
}

export interface TextResponse {
  type: "TEXT_RESPONSE";
  content: string | null;
}

export type WorkerResponse = ToolCallResult | TextResponse;
