import { string } from "zod";
import type {
  DeepbookExecutionResponse,
  DeepBookTaskType,
  DeepbookTaskResult,
  DeepbookTask,
} from "./agent.js";
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const VALID_TASKS: DeepBookTaskType[] = [
  "CREATE_BALANCE_MANAGER",
  "DEPOSIT_INTO_MANAGER",
  "WITHDRAW_FUND",
  "WITHDRAW_ALL_DEEP",
  "MINT_AND_USE_TRADE_CAP",
  "MINT_DEPOSIT_CAP",
  "ACCOUNT",
  "ACCOUNT_OPEN_ORDERS",
  "CHECK_MANAGER_BALANCE",
  "GET_ORDER",
  "GET_QUANTITY_OUT",
  "GET_LEVEL2_RANGE",
  "GET_LEVEL2_TICKS_FROM_MID",
  "LOCKED_BALANCE",
  "POOL_TRADE_PARAMS",
  "VAULT_BALANCES",
  "GET_POOL_ID_BY_ASSETS",
  "MID_PRICE",
  "WHITELISTED",
  "POOL_BOOK_PARAMS",
  "GET_ORDERS",
  "GET_POOL_DEEP_PRICE",
  "ADD_DEEP_PRICE_POINT",
  "UPDATE_POOL_ALLOWED_VERSIONS",
  "CREATE_PERMISSIONLESS_POOL",
  "GET_BALANCE_MANAGER_IDS",
  "MINT_REFERRAL",
  "UPDATE_REFERRAL_MULTIPLIER",
  "CLAIM_REFERRAL_REWARDS",
  "GET_REFERRAL_BALANCES",
  "PLACE_LIMIT_ORDER",
  "PLACE_MARKET_ORDER",
  "CANCEL_ORDER",
  "CANCEL_ORDERS",
  "CANCEL_ALL_ORDERS",
  "MODIFY_ORDER",
  "WITHDRAW_SETTLED_AMOUNTS",
  "WITHDRAW_SETTLED_AMOUNTS_PERMISSIONLESS",
  "BORROW_BASE_ASSET",
  "RETURN_BASE_ASSET",
  "BORROW_QUOTE_ASSET",
  "RETURN_QUOTE_ASSET",
  "SWAP_EXACT_BASE_FOR_QUOTE",
  "SWAP_EXACT_QUOTE_FOR_BASE",
  "SWAP_EXACT_QUANTITY",
  "SWAP_EXACT_QUANTITY_WITH_MANAGER",
  "STAKE",
  "UNSTAKE",
  "SUBMIT_PROPOSAL",
  "VOTE",
  "CLAIM_REBATES",
  "GET_AVAILABLE_COINS",
  "GET_COIN_DETAILS",
  "GET_AVAILABLE_POOLS",
  "GET_POOL_DETAILS",
];

const SYSTEM_PROMPT = `You are the primary task aggregator for Sui PTB on Sui for the DeepBook protocol.

CRITICAL: A user prompt may contain MULTIPLE transactions. You MUST identify ALL of them.

You have access to these DeepBook tasks:
${VALID_TASKS.map((t) => `- ${t}`).join("\n")}

Break down each transaction into a separate task. For each task, extract:
- task: The exact DeepBookTaskType string
- description: A brief human-readable description of what this task does
- extracted_params: Key-value pairs of parameters you can infer from the prompt (e.g., { "poolKey": "SUI_USDC", "amount": "10" })

Rules:
- Use "sequential" execution_order if tasks depend on each other (e.g., need to create a balance manager before depositing).
- Use "parallel" if tasks are independent.
- Set requires_confirmation to true if the prompt involves: withdrawing funds, transferring ownership, staking/unstaking, governance votes, or creating pools.
- Only use tasks from the list above. Do not hallucinate tasks.
- If a prompt mentions a coin symbol (e.g., "SUI", "USDC"), include it in extracted_params.

Respond ONLY with valid JSON matching this TypeScript interface:
{
  required_task: DeepBookTaskType[];
  tasks: { task: DeepBookTaskType; description: string; extracted_params?: Record<string, string> }[];
  execution_order: "sequential" | "parallel";
  requires_confirmation: boolean;
}

Examples:
1. "Check my SUI balance and place a limit order on SUI_USDC at price 1.5" →
   { "required_task": ["CHECK_MANAGER_BALANCE","PLACE_LIMIT_ORDER"], "tasks": [{"task":"CHECK_MANAGER_BALANCE","description":"Check SUI balance","extracted_params":{"coinKey":"SUI"}},{"task":"PLACE_LIMIT_ORDER","description":"Place limit order on SUI_USDC","extracted_params":{"poolKey":"SUI_USDC","price":"1.5"}}], "execution_order":"sequential", "requires_confirmation":true }

2. "Get mid price of DEEP_SUI and swap 10 SUI for DEEP" →
   { "required_task": ["MID_PRICE","SWAP_EXACT_BASE_FOR_QUOTE"], "tasks": [{"task":"MID_PRICE","description":"Get mid price of DEEP_SUI","extracted_params":{"poolKey":"DEEP_SUI"}},{"task":"SWAP_EXACT_BASE_FOR_QUOTE","description":"Swap 10 SUI for DEEP","extracted_params":{"poolKey":"DEEP_SUI","amount":"10"}}], "execution_order":"parallel", "requires_confirmation":true }

3. "What pools are available on mainnet?" →
   { "required_task": ["GET_AVAILABLE_POOLS"], "tasks": [{"task":"GET_AVAILABLE_POOLS","description":"List available pools on mainnet","extracted_params":{"network":"mainnet"}}], "execution_order":"parallel", "requires_confirmation":false }`;

export async function semanticRouter(
  userPrompt: string,
): Promise<DeepbookExecutionResponse> {
  const response = await anthropic.messages.create({
    model: "claude-opus-4-8",
    max_tokens: 1024,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: userPrompt }],
  });

  // extract text content from claude response
  const textContent = response.content
    .filter((c: any): c is { type: "text"; text: string } => c.type === "text")
    .map((c: any) => c.text)
    .join("");

  let taskResult: DeepbookTaskResult;
  try {
    const jsonMatch = textContent.match(/\{[\s\S]*\}/);
    const jsonStr = jsonMatch ? jsonMatch[0] : textContent;
    taskResult = JSON.parse(jsonStr) as DeepbookTaskResult;
  } catch (e) {
    // Fallback: treat the whole response as a single generic task
    taskResult = {
      required_task: [],
      tasks: [],
      execution_order: "sequential",
      requires_confirmation: true,
    };
  }

  // Validate tasks against known types
  const validatedTasks: DeepbookTask[] = taskResult.tasks
    .filter((t): t is DeepbookTask => VALID_TASKS.includes(t.task))
    .map((t) => ({
      task: t.task,
      description: t.description,
      extracted_params: t.extracted_params,
    }));

  const validatedRequired: DeepBookTaskType[] = taskResult.required_task.filter(
    (t): t is DeepBookTaskType => VALID_TASKS.includes(t),
  );

  // Build execution plan from validated tasks
  const executionPlan: DeepBookTaskType[] =
    validatedRequired.length > 0
      ? validatedRequired
      : validatedTasks.map((t) => t.task);

  return {
    message: `Planned ${validatedTasks.length} DeepBook task(s): ${executionPlan.join(", ")}`,
    execution_plan: executionPlan,
    results: [],
    required_confirmation: taskResult.requires_confirmation ?? true,
  };
}
