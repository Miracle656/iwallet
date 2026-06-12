// backend/src/utils/router_schema.ts
import type { AgentType } from "../types/agent.ts";

export const RouterSchema = {
  name: "route_user_intent",
  description: "Analyze user prompt and identify ALL required DeFi actions",
  parameters: {
    type: "object",
    properties: {
      required_agents: {
        type: "array",
        items: {
          type: "string",
          enum: ["STANDARD_TRANSFER", "DEEPBOOK_TRADER", "POLICY_GUARDIAN"],
        },
        description: "List ALL specialists needed to fulfill the request",
      },
      tasks: {
        type: "array",
        items: {
          type: "object",
          properties: {
            agent: {
              type: "string",
              enum: ["STANDARD_TRANSFER", "DEEPBOOK_TRADER", "POLICY_GUARDIAN"],
            },
            description: {
              type: "string",
              description: "What this specific agent needs to do",
            },
            extracted_params: {
              type: "object",
              description:
                "Key-value pairs extracted from prompt for this task",
            },
          },
          required: ["agent", "description"],
        },
      },
      execution_order: {
        type: "string",
        enum: ["sequential", "parallel"],
        description: "Whether tasks depend on each other or can run together",
      },
      requires_confirmation: {
        type: "boolean",
        description: "True if multiple transactions need user approval",
      },
    },
    required: ["required_agents", "tasks", "execution_order"],
  },
} as const;
