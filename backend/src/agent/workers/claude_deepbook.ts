import Anthropic from "@anthropic-ai/sdk";
import type { WorkerResponse } from "../../types/agent.ts";
import { executeDefiFunction } from "../execution_registry.ts";

let _anthropic: Anthropic | null = null;
function getAnthropic(): Anthropic {
  if (!_anthropic)
    _anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY ?? "not-configured",
    });
  return _anthropic;
}

const DEEPBOOK_TOOLS: Anthropic.Tool[] = [
  {
    name: "place_limit_order",
    description: "Place a limit order on a DeepBook pool",
    input_schema: {
      type: "object" as const,
      properties: {
        poolKey: { type: "string", description: "Pool key e.g. SUI_USDC, DEEP_SUI" },
        balanceManagerKey: { type: "string", description: "BalanceManager key (defaults to 'MANAGER_1')" },
        clientOrderId: { type: "string", description: "Unique client order ID" },
        price: { type: "number", description: "Limit price" },
        quantity: { type: "number", description: "Order quantity in base token" },
        isBid: { type: "boolean", description: "true = buy, false = sell" },
        expiration: { type: "number", description: "Expiry timestamp ms (0 = no expiry)" },
        orderType: { type: "string", description: "Order type: NO_RESTRICTION | IMMEDIATE_OR_CANCEL | FILL_OR_KILL | POST_ONLY" },
        selfMatchingOption: { type: "string", description: "Self-matching: ALLOW | CANCEL_TAKER | CANCEL_MAKER" },
        payWithDeep: { type: "boolean", description: "Pay fees with DEEP token" },
      },
      required: ["poolKey", "price", "quantity", "isBid"],
    },
  },
  {
    name: "place_market_order",
    description: "Place a market order on a DeepBook pool",
    input_schema: {
      type: "object" as const,
      properties: {
        poolKey: { type: "string" },
        balanceManagerKey: { type: "string" },
        clientOrderId: { type: "string" },
        quantity: { type: "number" },
        isBid: { type: "boolean", description: "true = buy, false = sell" },
        selfMatchingOption: { type: "string" },
        payWithDeep: { type: "boolean" },
      },
      required: ["poolKey", "quantity", "isBid"],
    },
  },
  {
    name: "swap_exact_base_for_quote",
    description: "Swap exact amount of base token for quote token",
    input_schema: {
      type: "object" as const,
      properties: {
        poolKey: { type: "string" },
        amount: { type: "number", description: "Amount of base to swap" },
        deepAmount: { type: "number", description: "DEEP fee amount (0 to auto)" },
        minOut: { type: "number", description: "Minimum quote tokens to receive" },
        deepCoin: { type: "string" },
        baseCoin: { type: "string" },
        quoteCoin: { type: "string" },
      },
      required: ["poolKey", "amount", "minOut"],
    },
  },
  {
    name: "swap_exact_quote_for_base",
    description: "Swap exact amount of quote token for base token",
    input_schema: {
      type: "object" as const,
      properties: {
        poolKey: { type: "string" },
        amount: { type: "number" },
        deepAmount: { type: "number" },
        minOut: { type: "number" },
        deepCoin: { type: "string" },
        baseCoin: { type: "string" },
        quoteCoin: { type: "string" },
      },
      required: ["poolKey", "amount", "minOut"],
    },
  },
  {
    name: "check_manager_balance",
    description: "Check balance in a DeepBook BalanceManager",
    input_schema: {
      type: "object" as const,
      properties: {
        managerKey: { type: "string", description: "BalanceManager key" },
        coinKey: { type: "string", description: "Coin symbol e.g. SUI, USDC, DEEP" },
      },
      required: ["managerKey", "coinKey"],
    },
  },
  {
    name: "mid_price",
    description: "Get the mid price of a DeepBook pool",
    input_schema: {
      type: "object" as const,
      properties: {
        poolKey: { type: "string", description: "Pool key e.g. SUI_USDC" },
      },
      required: ["poolKey"],
    },
  },
  {
    name: "cancel_order",
    description: "Cancel an open order",
    input_schema: {
      type: "object" as const,
      properties: {
        poolKey: { type: "string" },
        balanceManagerKey: { type: "string" },
        orderId: { type: "string" },
      },
      required: ["poolKey", "orderId"],
    },
  },
  {
    name: "withdraw_settled_amounts",
    description: "Withdraw settled (filled) order proceeds from DeepBook",
    input_schema: {
      type: "object" as const,
      properties: {
        poolKey: { type: "string" },
        balanceManagerKey: { type: "string" },
      },
      required: ["poolKey"],
    },
  },
];

export async function runClaudeDeepbook(
  iWalletId: string,
  prompt: string,
  params: Record<string, unknown>,
  agentId?: string,
): Promise<WorkerResponse> {
  const response = await getAnthropic().messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 1024,
    system: `You are an elite DeepBook V3 liquidity engineer for an AI wallet (iWallet: ${iWalletId}).
Use the provided tools to fulfill the user's request.
Default balanceManagerKey is "MANAGER_1" if not specified.
Default poolKey for SUI/USDC trades is "SUI_USDC".
Always pick the most appropriate tool. If you need to read data first (e.g. check balance), use the read tool.`,
    messages: [{ role: "user", content: prompt }],
    tools: DEEPBOOK_TOOLS,
    tool_choice: { type: "auto" },
  });

  const toolUse = response.content.find((c) => c.type === "tool_use");
  if (toolUse && toolUse.type === "tool_use") {
    const functionName = snakeToCamel(toolUse.name);
    const args = toolUse.input as Record<string, unknown>;
    console.log(`🛠️  [Claude DeepBook] Tool: ${toolUse.name} →`, args);

    if (agentId) {
      try {
        const result = await executeDefiFunction(functionName, args, agentId);
        return {
          type: "TOOL_CALL",
          functionName,
          arguments: args,
          result,
        } as WorkerResponse & { result: unknown };
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        console.error(`[Claude DeepBook] execution failed:`, msg);
        return { type: "TEXT_RESPONSE", content: `Failed to execute ${toolUse.name}: ${msg}` };
      }
    }

    return { type: "TOOL_CALL", functionName, arguments: args };
  }

  const text = response.content
    .filter((c) => c.type === "text")
    .map((c) => (c as { type: "text"; text: string }).text)
    .join("");

  return { type: "TEXT_RESPONSE", content: text };
}

function snakeToCamel(s: string): string {
  return s.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
}
