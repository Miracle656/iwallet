import { Hono } from "hono";
import { AgentService } from "./service.ts";

const agent = new Hono();
const agentService = new AgentService();

agent.post("/", async (c) => {
  const body = await c.req.json();
  const { name } = body;
  await agentService.createAgent(name);
});
