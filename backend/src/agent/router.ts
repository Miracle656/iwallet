// backend/src/agent/router.ts
import OpenAI from "openai";
import { SimplePlannerSchema } from "../utils/router_schema.ts";
import type { RoutingResult } from "../types/agent.ts";

let _openai: OpenAI | null = null;
function getOpenAI(): OpenAI {
  if (!_openai) {
    _openai = new OpenAI({
      apiKey: process.env.GROQ_API_KEY ?? "not-configured",
      baseURL: "https://api.groq.com/openai/v1",
      timeout: 30000,
      maxRetries: 3,
    });
  }
  return _openai;
}

export async function semanticRouter(
  userPrompt: string,
): Promise<RoutingResult> {
  console.log(`🚦 Planning Tasks for: "${userPrompt}"`);

  const response = await getOpenAI().chat.completions.create({
    model: "openai/gpt-oss-120b",
    messages: [
      {
        role: "system",
        content: `You are a problem-based task assigner the primary Task Planner for an autonomous DeFi wallet.
      Your job is to break down the user's intent into a sequential list of logical, actionable steps.

      CRITICAL RULES:
      1. Identify every discrete action the user wants to take.
      2. Sequence them chronologically (e.g., you must create an account before depositing).
      3. Extract any explicitly stated amounts, coin symbols (like SUI, USDC), or addresses into the 'extracted_data' object.

      Example:
      User: "Deposit 50 USDC into my balance manager and then place a limit order to buy SUI at 0.5."
      Tasks:
      1. task_description: "Deposit funds into balance manager", extracted_data: { "amount": 50, "coin": "USDC" }
      2. task_description: "Place a limit order to buy", extracted_data: { "target_coin": "SUI", "price": 0.5 }`,
      },
      { role: "user", content: userPrompt },
    ],
    functions: [SimplePlannerSchema],
    function_call: { name: "plan_defi_operations" },
    temperature: 0.0,
  });

  const args = response.choices[0].message.function_call?.arguments;
  if (!args) {
    throw new Error("Router failed to return structured data");
  }

  const routingData = JSON.parse(args) as RoutingResult;
  console.log(
    `📋 Generated ${routingData.tasks.length} tasks for the execution agent.`,
  );
  return routingData;
}
