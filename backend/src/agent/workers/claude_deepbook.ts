// backend/src/workers/claude_deepbook.ts
import Anthropic from "@anthropic-ai/sdk";
import type { WorkerResponse } from "../../types/agent.ts";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function runClaudeDeepbook(
  iWalletId: string,
  prompt: string,
  params: Record<string, unknown>,
): Promise<WorkerResponse> {
  const response = await anthropic.messages.create({
    model: "claude-3-5-sonnet-20240620",
    max_tokens: 1024,
    system:
      "You are an elite DeepBook V3 liquidity engineer. Generate explicit transaction parameters.",
    messages: [{ role: "user", content: prompt }],
  });

  const content = response.content[0];

  if (content.type === "text") {
    return {
      type: "TEXT_RESPONSE",
      content: content.text,
    };
  }

  // For tool_use responses from Claude
  if (content.type === "tool_use") {
    return {
      type: "TOOL_CALL",
      functionName: content.name,
      arguments: content.input as Record<string, unknown>,
    };
  }

  return {
    type: "TEXT_RESPONSE",
    content: null,
  };
}
