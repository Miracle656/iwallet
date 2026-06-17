// backend/src/workers/qwen_policy.ts
import OpenAI from "openai";
import type { WorkerResponse } from "../../types/agent.ts";

let _nvidiaQwen: OpenAI | null = null;
const nvidiaQwen = new Proxy({} as OpenAI, {
  get: (_t, prop) => {
    if (!_nvidiaQwen) _nvidiaQwen = new OpenAI({ apiKey: process.env.NVIDIA_API_KEY ?? "not-configured", baseURL: "https://integrate.api.nvidia.com/v1" });
    return (_nvidiaQwen as any)[prop];
  },
});

export async function runQwenPolicyGuardian(
  iWalletId: string,
  prompt: string,
  _params: Record<string, unknown>,
): Promise<WorkerResponse> {
  const response = await nvidiaQwen.chat.completions.create({
    model: "qwen/qwen-2.5-72b-instruct",
    messages: [
      {
        role: "system",
        content:
          "You evaluate account balance limits and validate velocity constraints.",
      },
      { role: "user", content: prompt },
    ],
  });

  return {
    type: "TEXT_RESPONSE",
    content: response.choices[0].message.content,
  };
}
