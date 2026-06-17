// backend/src/utils/router_schema.ts

export const SimplePlannerSchema = {
  name: "plan_defi_operations",
  description:
    "Breaks down a user prompt into sequential natural language tasks.",
  parameters: {
    type: "object",
    properties: {
      tasks: {
        type: "array",
        description:
          "A chronological list of tasks to execute the user's intent.",
        items: {
          type: "object",
          properties: {
            task_description: {
              type: "string",
              description:
                "A clear, concise description of the action to be performed (e.g., 'Swap USDC for SUI').",
            },
            extracted_data: {
              type: "object",
              description:
                "Key-value pairs of any specific amounts, coin symbols, or addresses explicitly mentioned by the user. Leave empty if none are provided.",
              additionalProperties: true,
            },
          },
          required: ["task_description", "extracted_data"],
        },
      },
    },
    required: ["tasks"],
  },
};
