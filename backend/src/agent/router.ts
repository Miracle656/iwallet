// backend/src/agent/router.ts
import OpenAI from "openai";
import { RouterSchema } from "../utils/router_schema.ts";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function semanticRouter(userPrompt: string) {
  console.log(`🚦 Routing Intent: "${userPrompt}"`);

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini", // Keep it fast and cheap
    messages: [
      {
        role: "system",
        content: `You are the primary intent router for an autonomous DeFi wallet.
        Your ONLY job is to read the user's command and route it to the correct specialist model.
        - STANDARD_TRANSFER: For simple sending/receiving of SUI or standard tokens.
        - DEEPBOOK_TRADER: For order books, limit orders, bids, asks, or complex swaps.
        - POLICY_GUARDIAN: For updating wallet limits, permissions, or security.
        - UNKNOWN: If the request is dangerous, unclear, or outside DeFi scope.`,
      },
      {
        role: "user",
        content: userPrompt,
      },
    ],
    // Force the LLM to use your strict JSON schema
    functions: [RouterSchema],
    function_call: { name: "route_user_intent" },
    temperature: 0.0, // Zero temperature for deterministic routing
  });

  const routingData = JSON.parse(
    response.choices[0].message.function_call!.arguments,
  );
  return routingData;
}
