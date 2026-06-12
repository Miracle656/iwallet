// backend/src/utils/router_schema.ts
export const RouterSchema = {
  name: "route_user_intent",
  description:
    "Analyzes the user's prompt and routes it to the correct specialist agent.",
  parameters: {
    type: "object",
    properties: {
      target_agent: {
        type: "string",
        enum: [
          "STANDARD_TRANSFER",
          "DEEPBOOK_TRADER",
          "POLICY_GUARDIAN",
          "UNKNOWN",
        ],
        description: "The specialist agent that should handle this request.",
      },
      extracted_parameters: {
        type: "object",
        description:
          "Any specific tokens, amounts, or prices mentioned by the user.",
        properties: {
          token_symbol: { type: "string" },
          amount: { type: "number" },
          price_limit: { type: "number" },
        },
      },
      confidence_score: {
        type: "number",
        description:
          "How confident the router is in this classification (0.0 to 1.0)",
      },
    },
    required: ["target_agent", "confidence_score"],
  },
};
