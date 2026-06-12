// backend/src/agent/router.ts
import OpenAI from "openai";
import { RouterSchema } from "../utils/router_schema.ts";
import type { RoutingResult } from "../types/agent.ts";

const openai = new OpenAI({
  apiKey: process.env.GROQ_API_KEY,
  baseURL: "https://api.groq.com/openai/v1",
  timeout: 30000, // 30s timeout
  maxRetries: 3, // Built-in retry
});

export async function semanticRouter(
  userPrompt: string,
): Promise<RoutingResult> {
  console.log(`🚦 Routing Intent: "${userPrompt}"`);

  const response = await openai.chat.completions.create({
    model: "openai/gpt-oss-120b",
    messages: [
      {
        role: "system",
        content: `You are the primary intent router for an autonomous DeFi wallet.
CRITICAL: A user prompt may contain MULTIPLE actions. You MUST identify ALL of them.
Examples:
- "send 10 SUI to goldman and swap USDC for BTC" → requires BOTH STANDARD_TRANSFER and DEEPBOOK_TRADER
- "transfer 5 SUI to alice" → only STANDARD_TRANSFER
- "set my daily limit to 1000 and swap SUI for USDC" → POLICY_GUARDIAN + DEEPBOOK_TRADER

Break down each action into a separate task object.`,
      },
      { role: "user", content: userPrompt },
    ],
    functions: [RouterSchema],
    function_call: { name: "route_user_intent" },
    temperature: 0.0,
  });

  const args = response.choices[0].message.function_call?.arguments;
  if (!args) {
    throw new Error("Router failed to return structured data");
  }

  const routingData = JSON.parse(args) as RoutingResult;
  return routingData;
}
