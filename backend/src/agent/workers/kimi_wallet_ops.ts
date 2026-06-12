// backend/src/workers/kimi_wallet_ops.ts
import OpenAI from "openai";
import type { WorkerResponse } from "../../types/agent.ts";

const kimi = new OpenAI({
  apiKey: process.env.NVIDIA_API_KEY,
  baseURL: "https://integrate.api.nvidia.com/v1",
});

export async function runKimiWalletOps(
  iWalletId: string,
  prompt: string,
  params: Record<string, unknown>,
): Promise<WorkerResponse> {
  console.log(`🤖 [Kimi] Worker activated for Wallet: ${iWalletId}`);
  console.log(`⏳ [Kimi] Sending request to NVIDIA NIM...`);

  const response = await kimi.chat.completions.create({
    model: "moonshotai/kimi-k2.6",
    messages: [
      {
        role: "system",
        content: `You handle standard DeFi actions: Swaps, Staking, Transfers.
Analyze the user prompt and trigger the correct tool. If you have enough info, call the tool.`,
      },
      { role: "user", content: prompt },
    ],
    tools: [
      {
        type: "function",
        function: {
          name: "transfer_tokens",
          description: "Transfer tokens to a specific address or user.",
          parameters: {
            type: "object",
            properties: {
              recipient: {
                type: "string",
                description: "The target recipient (e.g. 'goldman')",
              },
              amount: { type: "number", description: "The amount to send" },
              token: {
                type: "string",
                description: "Token symbol (e.g. 'SUI', 'USDC')",
              },
            },
            required: ["recipient", "amount"],
          },
        },
      },
      {
        type: "function",
        function: {
          name: "swap_tokens",
          description: "Swap one token for another.",
          parameters: {
            type: "object",
            properties: {
              from: { type: "string", description: "Token to sell" },
              to: { type: "string", description: "Token to buy" },
              amount: { type: "number", description: "Amount to swap" },
              slippage: { type: "number", description: "Max slippage %" },
            },
            required: ["from", "to"],
          },
        },
      },
    ],
  });

  const message = response.choices[0].message;

  if (message.tool_calls && message.tool_calls.length > 0) {
    const toolCall = message.tool_calls[0];

    if ("function" in toolCall) {
      console.log(`✅ [Kimi] Tool: ${toolCall.function.name}`);
      return {
        type: "TOOL_CALL",
        functionName: toolCall.function.name,
        arguments: JSON.parse(toolCall.function.arguments),
      };
    }
  }

  console.log(`💬 [Kimi] Text response:`, message.content);
  return {
    type: "TEXT_RESPONSE",
    content: message.content,
  };
}
