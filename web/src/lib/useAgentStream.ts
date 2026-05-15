/*
 * Subscribe to `agent::events` for the active session via the iii browser
 * worker. Frames arrive at `ui::session::event::<browser_id>`; we filter
 * by session_id and dispatch into a reducer.
 *
 * This is intentionally a thin port of workers/harness/web's hook. When
 * the harness UI extracts a shared package, swap this for the import.
 */

import { useEffect, useReducer } from "react";
import { getIiiClient } from "./iii-client";
import type { AgentEvent, Message } from "./types";

export interface StreamState {
  messages: Message[];
  pending: Message | null;
}

const INITIAL: StreamState = { messages: [], pending: null };

type Action =
  | { kind: "event"; event: AgentEvent }
  | { kind: "reset" };

function reduce(state: StreamState, action: Action): StreamState {
  if (action.kind === "reset") return INITIAL;
  const ev = action.event;
  switch (ev.type) {
    case "turn_start":
      return {
        ...state,
        pending: {
          id: String(ev.id ?? Date.now()),
          role: "assistant",
          content: "",
          timestamp: Date.now(),
        },
      };
    case "message_delta": {
      const delta = String((ev as { delta?: unknown }).delta ?? "");
      const pending = state.pending ?? {
        id: `m-${Date.now()}`,
        role: "assistant",
        content: "",
        timestamp: Date.now(),
      };
      return { ...state, pending: { ...pending, content: pending.content + delta } };
    }
    case "message_end": {
      if (!state.pending) return state;
      const usage = (ev as { usage?: Message["usage"] }).usage;
      const final: Message = { ...state.pending, usage };
      return { messages: [...state.messages, final], pending: null };
    }
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
        off = client.on<Envelope>("ui::session::event", (payload) => {
          const ev = extract(payload, sessionId);
          if (ev) dispatch({ kind: "event", event: ev });
        });
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
          c.call("ui::unsubscribe", {
            browser_id: browserId,
            session_id: sessionId,
          }).catch(() => {}),
        );
      }
    };
  }, [sessionId]);

  return state;
}
