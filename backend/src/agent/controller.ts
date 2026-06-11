import { Hono } from "hono";
import { AgentService } from "./service.ts";

export const agent = new Hono();
const agentService = new AgentService();

agent.post("/create", async (c) => {
  const body = await c.req.json();
  const { name, userAddress } = body;
  const result: any = await agentService.buildCreateAgentTx(name, userAddress);
  if (result?.message?.includes("Name record already exists")) {
    return c.json({ message: result?.message }, 400);
  }
  return c.json({ message: "Agent created successfully", result });
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
