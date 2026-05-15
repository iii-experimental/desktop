export type Role = "user" | "assistant" | "system" | "tool";

export interface FunctionCall {
  id: string;
  function_id: string;
  payload: Record<string, unknown>;
  status: "pending" | "running" | "done" | "error";
  result?: unknown;
  error?: string;
}

export type MessagePart =
  | { kind: "text"; text: string }
  | { kind: "tool"; call: FunctionCall };

export interface Message {
  id: string;
  role: Role;
  content: string;
  timestamp: number;
  reasoning?: string;
  function_calls?: FunctionCall[];
  parts?: MessagePart[];
  stop_reason?: string;
  provider?: string;
  model?: string;
  usage?: {
    input?: number;
    output?: number;
    cache_read?: number;
    cache_write?: number;
  };
}

export interface SessionRow {
  id: string;
  title: string;
  updated_at: number;
}

export type Tab = "chat" | "cost" | "files" | "activity" | "status";

export interface ApprovalRequest {
  id: string;
  function_id: string;
  payload: Record<string, unknown>;
}

export interface AgentEvent {
  type:
    | "turn_start"
    | "turn_end"
    | "message_delta"
    | "message_end"
    | "function_call"
    | "function_result"
    | "approval_request"
    | "error";
  [k: string]: unknown;
}
