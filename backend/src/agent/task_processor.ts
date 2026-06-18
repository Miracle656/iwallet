import data from "../tools/deepbook/schema.json" with { type: "json" };
import OpenAI from "openai";
import { executeDefiFunction } from "./execution_registry.ts";
import { any } from "zod";

let tool_list = data;
const formatted_tools = tool_list.map((tool: any) => ({
  type: "function",
  function: {
    name: tool.name,
    description: tool.description,
    parameters: tool.parameters,
  },
}));
let task_list = ["task1", "task2", "task3"];

console.log(task_list);

const kimi = new OpenAI({
  apiKey: process.env.NVIDIA_API_KEY,
  baseURL: "https://integrate.api.nvidia.com/v1",
});

export async function processTasks(
  originalPrompt: string,
  params: Record<string, unknown>,
) {
  const executionResults = [];
  for (let i = 0; i < task_list.length; i++) {
    const currentTask = task_list[i];
    console.log(
      `🔄 [Kimi] Processing task ${i + 1}/${task_list.length}: ${currentTask}`,
    );

    const response = await kimi.chat.completions.create({
      model: "moonshotai/kimi-k2.6",
      messages: [
        {
          role: "system",
          content: `You handle standard DeFi actions: Swaps, Staking, Transfers.
Analyze the user prompt and trigger the correct tool. If you have enough info, call the tool.`,
        },
        {
          role: "user",
          content: `Original goal: "${originalPrompt}"\n\nCurrent task to map: "${currentTask}"`,
        },
      ],
      tools: tool_list,
      tool_choice: "auto",
    });

    const message = response.choices[0].message;

    if (message.tool_calls && message.tool_calls.length > 0) {
      const toolCall = message.tool_calls[0];

      console.log(`✅ [Kimi] Selected Tool: ${toolCall.function.name}`);
      console.log(`📥 Arguments:`, toolCall.function.arguments);

      // Store the mapped tool call for this specific task
      executionResults.push({
        task: currentTask,
        status: "MAPPED_TO_TOOL",
        functionName: toolCall.function.name,
        arguments: JSON.parse(toolCall.function.arguments),
      });

      const result = await executeDefiFunction(
        toolCall.function.name,
        JSON.parse(toolCall.function.arguments),
      );
    } else {
      console.log(
        `💬 [Kimi] No tool needed for this task. Text response:`,
        message.content,
      );
      executionResults.push({
        task: currentTask,
        status: "TEXT_RESPONSE",
        content: message.content,
      });
    }
  }
  return executionResults;
}
