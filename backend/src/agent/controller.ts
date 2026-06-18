import { Hono } from "hono";
import { AgentService } from "./service.ts";
import { semanticRouter } from "./router.ts";
import { runKimiWalletOps } from "./workers/kimi_wallet_ops.ts";
import { runClaudeDeepbook } from "./workers/claude_deepbook.ts";
import { runQwenPolicyGuardian } from "./workers/qwen_policy.ts";
import { executeUserRequest } from "./orchestrator.ts";

export const agent = new Hono();
const agentService = new AgentService();

agent.post("/create", async (c) => {
  const body = await c.req.json();
  const { name, sender } = body;
  const result: any = await agentService.buildCreateAgentTx(name, sender);
  return c.json({ message: "Agent created successfully", result });
});

agent.post("/create-agent-name", async (c) => {
  const body = await c.req.json();
  const { name, identityAddress, sender } = body;
  const result: any = await agentService.createAgentName(
    name,
    identityAddress,
    sender,
  );
  if (result?.message?.includes("Name record already exists")) {
    return c.json({ message: result?.message }, 400);
  }
  return c.json({ message: "Agent name created successfully", result });
});

agent.get("/get_name_record/:name", async (c) => {
  const name = c.req.param("name");
  const result = await agentService.getNameRecord(name);
  if (!result) {
    return c.json(
      {
        message: "Name record not found",
      },
      404,
    );
  }
  return c.json({ message: "Name record retrieved successfully", result });
});

agent.post("/execute", async (c) => {
  try {
    const { prompt, iWalletId, agentId } = await c.req.json();
    if (!prompt) return c.json({ error: "prompt required" }, 400);
    const result = await executeUserRequest(iWalletId, prompt, agentId ?? undefined);
    return c.json({ message: "Execution successful", result });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[agent/execute]", msg);
    return c.json({ error: msg }, 500);
  }
});
