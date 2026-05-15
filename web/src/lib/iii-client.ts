/*
 * iii-browser-sdk wrapper. Mirrors the bootstrap pattern from
 * workers/harness/web (single WS connection, per-browser handler ids).
 *
 * Tauri tweak: if the bundled harness HTTP isn't reachable (cold start,
 * desktop launched before `iii start`), fall back to the env-provided
 * engine URL and skip the `harness::info` round-trip.
 */

import {
  registerWorker,
  TriggerAction,
  type ISdk,
  type RemoteFunctionHandler,
} from "iii-browser-sdk";

export type ConnectionState = "idle" | "connecting" | "open" | "error";

export interface IiiClient {
  browserId: string;
  state: ConnectionState;
  call<T = unknown>(
    functionId: string,
    payload?: Record<string, unknown>,
    opts?: { timeoutMs?: number },
  ): Promise<T>;
  fire(functionId: string, payload?: Record<string, unknown>): Promise<void>;
  on<P = unknown>(
    functionId: string,
    handler: (payload: P) => void | Promise<void>,
  ): () => void;
  subscribeState(listener: (state: ConnectionState) => void): () => void;
  dispose(): Promise<void>;
}

let _clientPromise: Promise<IiiClient> | null = null;

export function getIiiClient(): Promise<IiiClient> {
  if (!_clientPromise) {
    _clientPromise = bootstrap();
  }
  return _clientPromise;
}

export async function disposeIiiClient(): Promise<void> {
  if (!_clientPromise) return;
  const client = await _clientPromise.catch(() => null);
  _clientPromise = null;
  if (client) await client.dispose();
}

async function bootstrap(): Promise<IiiClient> {
  const wsUrl = await resolveWsUrl();
  const browserId = makeBrowserId();
  const sdk = registerWorker(wsUrl);
  return wrap(sdk, browserId);
}

async function resolveWsUrl(): Promise<string> {
  const envUrl = (import.meta.env.VITE_III_BROWSER_URL as string | undefined)
    ?.trim();
  if (envUrl) return envUrl;

  // Default to the backend port. Newer harness exposes the same WS endpoint
  // for both backend and browser workers; the engine RBAC layer scopes
  // capabilities by registered function prefix.
  return "ws://127.0.0.1:49134";
}

function wrap(sdk: ISdk, browserId: string): IiiClient {
  const unregisters = new Set<() => void>();
  const stateListeners = new Set<(s: ConnectionState) => void>();
  let state: ConnectionState = "connecting";

  function setState(next: ConnectionState) {
    if (next === state) return;
    state = next;
    for (const l of stateListeners) l(state);
  }

  async function call<T>(
    functionId: string,
    payload: Record<string, unknown> = {},
    opts: { timeoutMs?: number } = {},
  ): Promise<T> {
    try {
      const result = await sdk.trigger<unknown, T>({
        function_id: functionId,
        payload,
        ...(opts.timeoutMs ? { timeoutMs: opts.timeoutMs } : {}),
      });
      setState("open");
      return result;
    } catch (err) {
      setState("error");
      throw err;
    }
  }

  async function fire(
    functionId: string,
    payload: Record<string, unknown> = {},
  ): Promise<void> {
    try {
      await sdk.trigger({
        function_id: functionId,
        payload,
        action: TriggerAction.Void(),
      });
      setState("open");
    } catch (err) {
      setState("error");
      throw err;
    }
  }

  return {
    browserId,
    get state() {
      return state;
    },
    call,
    fire,
    on(functionId, handler) {
      const id = `${functionId}::${browserId}`;
      const wrapped: RemoteFunctionHandler = async (data) => {
        await handler(data as never);
        return null;
      };
      const ref = sdk.registerFunction(id, wrapped);
      let active = true;
      const off = () => {
        if (!active) return;
        active = false;
        unregisters.delete(off);
        try {
          ref.unregister();
        } catch {
          // already disposed
        }
      };
      unregisters.add(off);
      return off;
    },
    subscribeState(listener) {
      stateListeners.add(listener);
      listener(state);
      return () => stateListeners.delete(listener);
    },
    async dispose() {
      for (const off of [...unregisters]) off();
      stateListeners.clear();
      await sdk.shutdown();
      setState("idle");
    },
  };
}

function makeBrowserId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return `desktop-${crypto.randomUUID()}`;
  }
  const rand = Math.random().toString(36).slice(2, 10);
  return `desktop-${Date.now().toString(36)}-${rand}`;
}
