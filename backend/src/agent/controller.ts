import { Hono } from "hono";
import { AgentService } from "./service.ts";

export const agent = new Hono();
const agentService = new AgentService();

agent.post("/create", async (c) => {
  const body = await c.req.json();
  const { name } = body;
  const result = await agentService.createAgent(name);
  return c.json({ message: "Agent created successfully", result });
});
