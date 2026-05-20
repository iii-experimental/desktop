import { useEffect, useReducer } from "react";
import { getIiiClient } from "./iii-client";
import type { FunctionCall, Message, MessagePart } from "./types";

export interface StreamState {
  messages: Message[];
  pending: Message | null;
  active: boolean;
  turnState: Record<string, unknown> | null;
  pausedForApproval: boolean;
}

const INITIAL: StreamState = {
  messages: [],
  pending: null,
  active: false,
  turnState: null,
  pausedForApproval: false,
};

interface AgentEvent {
  type: string;
  message?: AgentMessage;
  delta?: string;
  usage?: Message["usage"];
  function_call_id?: string;
  function_id?: string;
  args?: Record<string, unknown>;
  result?: unknown;
  is_error?: boolean;
  [k: string]: unknown;
}

interface AgentMessage {
  role?: string;
  content?: string | Array<{ type?: string; text?: string }>;
  timestamp?: number;
  stop_reason?: string;
  provider?: string;
  model?: string;
  usage?: Message["usage"];
}

function blocksToText(content: AgentMessage["content"] | undefined): string {
  if (!content) return "";
  if (typeof content === "string") return content;
  return content
    .filter((b) => b.type === "text" || !b.type)
    .map((b) => b.text ?? "")
    .join("");
}

function isAssistant(m?: AgentMessage): boolean {
  return m?.role === "assistant";
}

function freshPending(ts = Date.now()): Message {
  return {
    id: `m-${ts}-${Math.random().toString(36).slice(2, 6)}`,
    role: "assistant",
    content: "",
    timestamp: ts,
    function_calls: [],
    parts: [],
  };
}

function appendTextPart(parts: MessagePart[], text: string): MessagePart[] {
  if (!text) return parts;
  const last = parts[parts.length - 1];
  if (last && last.kind === "text") {
    if (last.text === text) return parts;
    return [...parts.slice(0, -1), { kind: "text", text }];
  }
  return [...parts, { kind: "text", text }];
}

function upsertCallPart(
  parts: MessagePart[],
  call: FunctionCall,
): MessagePart[] {
  const idx = parts.findIndex(
    (p) => p.kind === "tool" && p.call.id === call.id,
  );
  if (idx === -1) return [...parts, { kind: "tool", call }];
  const next = [...parts];
  next[idx] = { kind: "tool", call };
  return next;
}

type Action = { kind: "event"; event: AgentEvent } | { kind: "reset" };

function reduce(state: StreamState, action: Action): StreamState {
  if (action.kind === "reset") return INITIAL;
  const ev = action.event;

  switch (ev.type) {
    case "agent_start":
      return {
        ...state,
        active: true,
        pending: state.pending ?? freshPending(),
      };

    case "turn_start":
      return {
        ...state,
        active: true,
        pending: state.pending ?? freshPending(),
      };

    case "message_start":
    case "message_update":
    case "message_end": {
      if (!isAssistant(ev.message)) return state;
      const m = ev.message;
      const text = blocksToText(m?.content);
      const ts = m?.timestamp ?? Date.now();
      const usage = ev.usage ?? m?.usage;
      const pending = state.pending ?? freshPending(ts);
      const parts = appendTextPart(pending.parts ?? [], text);
      return {
        ...state,
        pending: {
          ...pending,
          content: text || pending.content,
          parts,
          usage: usage ?? pending.usage,
          stop_reason: m?.stop_reason ?? pending.stop_reason,
          provider: m?.provider ?? pending.provider,
          model: m?.model ?? pending.model,
        },
      };
    }

    case "function_execution_start": {
      const id = String(ev.function_call_id ?? `fc-${Date.now()}`);
      const call: FunctionCall = {
        id,
        function_id: String(ev.function_id ?? "unknown"),
        payload: (ev.args as Record<string, unknown>) ?? {},
        status: "running",
      };
      const pending = state.pending ?? freshPending();
      return {
        ...state,
        pending: {
          ...pending,
          function_calls: [...(pending.function_calls ?? []), call],
          parts: upsertCallPart(pending.parts ?? [], call),
        },
      };
    }

    case "function_execution_update": {
      const id = String(ev.function_call_id ?? "");
      const pending = state.pending;
      if (!pending) return state;
      const existing = (pending.function_calls ?? []).find((c) => c.id === id);
      if (!existing) return state;
      const updated: FunctionCall = {
        ...existing,
        status: "running",
        result: (ev as { partial_result?: unknown }).partial_result,
      };
      return {
        ...state,
        pending: {
          ...pending,
          function_calls: (pending.function_calls ?? []).map((c) =>
            c.id === id ? updated : c,
          ),
          parts: upsertCallPart(pending.parts ?? [], updated),
        },
      };
    }

    case "function_execution_end": {
      const id = String(ev.function_call_id ?? "");
      const pending = state.pending;
      if (!pending) return state;
      const existing = (pending.function_calls ?? []).find((c) => c.id === id);
      if (!existing) return state;
      const updated: FunctionCall = {
        ...existing,
        status: ev.is_error ? "error" : "done",
        result: ev.result,
        error: ev.is_error
          ? typeof ev.result === "string"
            ? ev.result
            : JSON.stringify(ev.result)
          : undefined,
      };
      return {
        ...state,
        pending: {
          ...pending,
          function_calls: (pending.function_calls ?? []).map((c) =>
            c.id === id ? updated : c,
          ),
          parts: upsertCallPart(pending.parts ?? [], updated),
        },
      };
    }

    case "turn_state_changed": {
      const next =
        (ev as { new_value?: Record<string, unknown> }).new_value ?? null;
      const paused =
        next !== null &&
        (next.kind === "awaiting_approval" ||
          next.kind === "paused" ||
          next.awaiting_approval === true ||
          next.paused === true);
      return {
        ...state,
        turnState: next,
        pausedForApproval: Boolean(paused),
      };
    }

    case "agent_end": {
      if (!state.pending)
        return {
          ...state,
          active: false,
          pausedForApproval: false,
        };
      return {
        ...state,
        messages: [...state.messages, state.pending],
        pending: null,
        active: false,
        pausedForApproval: false,
      };
    }

    case "turn_end":
      // Keep pending alive; agent may emit more turns within the same agent
      // (text -> tool -> text). Only commit on agent_end.
      return state;

    default:
      return state;
  }
}

interface Envelope {
  session_id?: string;
  event?: AgentEvent;
  [k: string]: unknown;
}

function extract(payload: Envelope, sessionId: string): AgentEvent | null {
  if (payload.session_id !== sessionId) return null;
  if (payload.event && typeof payload.event === "object") {
    return payload.event;
  }
  return null;
}

export function useAgentStream(sessionId: string | null): StreamState {
  const [state, dispatch] = useReducer(reduce, INITIAL);

  useEffect(() => {
    dispatch({ kind: "reset" });
    if (!sessionId) return;

    let cancelled = false;
    let off: (() => void) | undefined;
    let browserId: string | null = null;

    void (async () => {
      try {
        const client = await getIiiClient();
        if (cancelled) return;
        browserId = client.browserId;
        const registered = client.on<Envelope>(
          "ui::session::event",
          (payload) => {
            if (cancelled) return;
            const ev = extract(payload, sessionId);
            if (!ev) return;
            dispatch({ kind: "event", event: ev });
            if (typeof window !== "undefined") {
              console.debug("[stream]", ev.type, ev);
            }
          },
        );
        if (cancelled) {
          registered();
          return;
        }
        off = registered;
        await client.call("ui::subscribe", {
          browser_id: browserId,
          session_id: sessionId,
        });
      } catch (err) {
        console.warn("[useAgentStream] subscribe failed", err);
      }
    })();

    return () => {
      cancelled = true;
      off?.();
      if (browserId) {
        void getIiiClient().then((c) =>
          c
            .call("ui::unsubscribe", {
              browser_id: browserId,
              session_id: sessionId,
            })
            .catch(() => {}),
        );
      }
    };
  }, [sessionId]);

  return state;
}
