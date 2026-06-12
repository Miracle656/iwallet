// backend/src/agent/orchestrator.ts
import { semanticRouter } from "./router.ts";
import { runKimiWalletOps } from "./workers/kimi_wallet_ops.ts";
import { runClaudeDeepbook } from "./workers/claude_deepbook.ts";
import { runQwenPolicyGuardian } from "./workers/qwen_policy.ts";
import type {
  AgentType,
  AgentResult,
  ExecutionResponse,
  RoutingResult,
  WorkerResponse,
} from "../types/agent.ts";

// ─── Agent Map ───────────────────────────────────────────────────────────────
const AGENT_MAP: Record<
  AgentType,
  (
    iWalletId: string,
    prompt: string,
    params: Record<string, unknown>,
  ) => Promise<WorkerResponse>
> = {
  STANDARD_TRANSFER: runKimiWalletOps,
  DEEPBOOK_TRADER: runClaudeDeepbook,
  POLICY_GUARDIAN: runQwenPolicyGuardian,
};

// ─── Type Guard ──────────────────────────────────────────────────────────────
function isValidAgent(agent: string): agent is AgentType {
  return Object.keys(AGENT_MAP).includes(agent);
}

// ─── Validate & Narrow Routing Data ───────────────────────────────────────────
function validateRouting(data: RoutingResult): asserts data is RoutingResult & {
  tasks: Array<{ agent: AgentType }>;
} {
  for (const task of data.tasks) {
    if (!isValidAgent(task.agent)) {
      throw new Error(`Unknown agent type: ${task.agent}`);
    }
  }
}

// ─── Execute Single Task ─────────────────────────────────────────────────────
async function executeTask(
  iWalletId: string,
  task: {
    agent: AgentType;
    description: string;
    extracted_params?: Record<string, unknown>;
  },
): Promise<AgentResult> {
  const agentFn = AGENT_MAP[task.agent];

  console.log(`⚡ Executing ${task.agent}: ${task.description}`);

  try {
    const result = await agentFn(
      iWalletId,
      task.description,
      task.extracted_params ?? {},
    );

    return {
      agent: task.agent,
      status: "success",
      result,
    };
  } catch (error) {
    return {
      agent: task.agent,
      status: "error",
      result: error instanceof Error ? error.message : String(error),
    };
  }
}

// ─── Main Orchestrator ─────────────────────────────────────────────────────────
export async function executeUserRequest(
  iWalletId: string,
  userPrompt: string,
): Promise<ExecutionResponse> {
  // Step 1: Route
  const routing = await semanticRouter(userPrompt);
  console.log(`🔀 Multi-Intent Detected:`, routing.required_agents);
  console.log(`📋 Execution Plan:`, routing.tasks);

  // Step 2: Validate agent names
  validateRouting(routing);

  // Step 3: Execute
  const results: AgentResult[] = [];

  if (routing.execution_order === "sequential") {
    for (const task of routing.tasks) {
      results.push(await executeTask(iWalletId, task));
    }
  } else {
    const promises = routing.tasks.map((task) => executeTask(iWalletId, task));
    results.push(...(await Promise.all(promises)));
  }

  // Step 4: Return
  return {
    message: "Execution successful",
    execution_plan: routing.tasks.map((t) => t.agent),
    results,
    requires_confirmation: routing.requires_confirmation ?? results.length > 1,
  };
}
