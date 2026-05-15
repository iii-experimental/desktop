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
  ): Promise<T>;
  on<P = unknown>(
    functionId: string,
    handler: (payload: P) => void | Promise<void>,
  ): () => void;
  subscribeState(listener: (state: ConnectionState) => void): () => void;
  dispose(): Promise<void>;
}

interface BridgeInfo {
  ws_path: string;
  protocol: "ws" | "wss";
  engine_url: string;
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

  try {
    const info = await fetchBridgeInfo();
    const proto = info.protocol === "wss" ? "wss" : "ws";
    return `${proto}://${window.location.host}${info.ws_path}`;
  } catch {
    // Fallback: connect directly to the browser RBAC port. Works when the
    // engine runs on the same machine (the typical desktop case).
    return "ws://127.0.0.1:49135";
  }
}

async function fetchBridgeInfo(): Promise<BridgeInfo> {
  const res = await fetch("/harness/call", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ function_id: "harness::info", payload: {} }),
  });
  if (!res.ok) throw new Error(`harness::info ${res.status}`);
  const data = (await res.json()) as Partial<BridgeInfo>;
  if (
    typeof data.ws_path !== "string" ||
    (data.protocol !== "ws" && data.protocol !== "wss") ||
    typeof data.engine_url !== "string"
  ) {
    throw new Error("harness::info malformed");
  }
  return {
    ws_path: data.ws_path,
    protocol: data.protocol,
    engine_url: data.engine_url,
  };
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
  ): Promise<T> {
    try {
      const result = await sdk.trigger<unknown, T>({
        function_id: functionId,
        payload,
      });
      setState("open");
      return result;
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
