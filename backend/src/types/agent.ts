// backend/src/types/agent.ts
export type AgentType =
  | "STANDARD_TRANSFER"
  | "DEEPBOOK_TRADER"
  | "POLICY_GUARDIAN";

export interface Task {
  agent: AgentType;
  description: string;
  extracted_params?: Record<string, unknown>;
}

export interface RoutingResult {
  required_agents: AgentType[];
  tasks: Task[];
  execution_order: "sequential" | "parallel";
  requires_confirmation?: boolean;
}

export interface AgentResult {
  agent: AgentType;
  status: "success" | "error";
  result: unknown;
}

export interface ExecutionResponse {
  message: string;
  execution_plan: AgentType[];
  results: AgentResult[];
  requires_confirmation: boolean;
}

// Tool call response from individual agents
export interface ToolCallResult {
  type: "TOOL_CALL";
  functionName: string;
  arguments: Record<string, unknown>;
}

export interface TextResponse {
  type: "TEXT_RESPONSE";
  content: string | null;
}

export type WorkerResponse = ToolCallResult | TextResponse;
