export type Role = "user" | "assistant" | "system" | "tool";

export interface Message {
  id: string;
  role: Role;
  content: string;
  timestamp: number;
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

export type Tab = "chat" | "cost" | "files" | "status";

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
