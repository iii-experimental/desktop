/**
 * Lazy-initialized singleton iii-browser-sdk client. Ported from console/web
 * and extended for the Tauri desktop:
 *   - the WS URL points straight at the engine (no `/ws` reverse proxy);
 *     override with `VITE_III_BROWSER_URL`, else `ws://127.0.0.1:49134`.
 *   - in addition to the console surface (`trigger`/`on`/`registerTrigger`),
 *     it keeps `call`/`fire`/`subscribeState` so the desktop's traces,
 *     activity, and status views keep working unchanged.
 */

import {
  type IIIConnectionState,
  type ISdk,
  type RegisterTriggerInput,
  type RemoteFunctionHandler,
  registerWorker,
} from "iii-browser-sdk";

export type { IIIConnectionState, RegisterTriggerInput };

/** Desktop-facing connection state used by the header ConnectionPill. */
export type ConnectionState = "idle" | "connecting" | "open" | "error";

function toConnectionState(s: IIIConnectionState): ConnectionState {
  switch (s) {
    case "connected":
      return "open";
    case "connecting":
    case "reconnecting":
      return "connecting";
    case "failed":
      return "error";
    default:
      return "idle";
  }
}

export interface IiiClient {
  browserId: string;
  /**
   * Invoke an iii bus function and await its result. In the iii ecosystem
   * every bus invocation is a *trigger*. Thin wrapper over the SDK's
   * `trigger({ function_id, payload })`.
   */
  trigger<T = unknown>(
    functionId: string,
    payload?: Record<string, unknown>,
  ): Promise<T>;
  /** Desktop alias of {@link trigger} retained for traces/activity/status. */
  call<T = unknown>(
    functionId: string,
    payload?: Record<string, unknown>,
    opts?: { timeoutMs?: number },
  ): Promise<T>;
  /** Fire-and-forget trigger. */
  fire(functionId: string, payload?: Record<string, unknown>): Promise<void>;
  on<P = unknown>(
    functionId: string,
    handler: (payload: P) => void | Promise<void>,
  ): () => void;
  registerTrigger(input: RegisterTriggerInput): () => void;
  addConnectionStateListener(
    handler: (state: IIIConnectionState) => void,
  ): () => void;
  /** Desktop adapter: connection state mapped to {@link ConnectionState}. */
  subscribeState(listener: (state: ConnectionState) => void): () => void;
  dispose(): Promise<void>;
}

interface Deps {
  resolveWsUrl: () => string;
  makeBrowserId: () => string;
  registerWorker: (url: string) => ISdk;
}

let _clientPromise: Promise<IiiClient> | null = null;
let _deps: Deps = defaultDeps();

function defaultDeps(): Deps {
  return {
    resolveWsUrl,
    makeBrowserId,
    registerWorker: (url) => registerWorker(url),
  };
}

export function getIiiClient(): Promise<IiiClient> {
  if (!_clientPromise) {
    _clientPromise = bootstrap(_deps);
  }
  return _clientPromise;
}

export async function disposeIiiClient(): Promise<void> {
  if (!_clientPromise) return;
  const client = await _clientPromise.catch(() => null);
  _clientPromise = null;
  if (client) await client.dispose();
}

export function __setIiiClientDepsForTests(overrides: Partial<Deps>): void {
  _deps = { ..._deps, ...overrides };
  _clientPromise = null;
}

export function __resetIiiClientForTests(): void {
  _deps = defaultDeps();
  _clientPromise = null;
}

async function bootstrap(deps: Deps): Promise<IiiClient> {
  const wsUrl = deps.resolveWsUrl();
  const browserId = deps.makeBrowserId();
  const sdk = deps.registerWorker(wsUrl);
  return wrapSdk(sdk, browserId);
}

function wrapSdk(sdk: ISdk, browserId: string): IiiClient {
  const handlerUnregisters = new Set<() => void>();
  const triggerUnregisters = new Set<() => void>();

  function trigger<T>(
    functionId: string,
    payload: Record<string, unknown> = {},
  ): Promise<T> {
    return sdk.trigger<unknown, T>({
      function_id: functionId,
      payload,
    });
  }

  function on<P>(
    functionId: string,
    handler: (payload: P) => void | Promise<void>,
  ): () => void {
    const id = `${functionId}::${browserId}`;
    const wrapped: RemoteFunctionHandler = async (data: unknown) => {
      await handler(data as P);
      return null;
    };
    const ref = sdk.registerFunction(id, wrapped);
    let active = true;
    const unregister = () => {
      if (!active) return;
      active = false;
      handlerUnregisters.delete(unregister);
      try {
        ref.unregister();
      } catch {
        // SDK already disposed; nothing to do.
      }
    };
    handlerUnregisters.add(unregister);
    return unregister;
  }

  function registerTrigger(input: RegisterTriggerInput): () => void {
    const t = sdk.registerTrigger(input);
    let active = true;
    const unregister = () => {
      if (!active) return;
      active = false;
      triggerUnregisters.delete(unregister);
      try {
        t.unregister();
      } catch {
        // SDK already disposed; nothing to do.
      }
    };
    triggerUnregisters.add(unregister);
    return unregister;
  }

  function addConnectionStateListener(
    handler: (state: IIIConnectionState) => void,
  ): () => void {
    return sdk.addConnectionStateListener(handler);
  }

  function subscribeState(
    listener: (state: ConnectionState) => void,
  ): () => void {
    return sdk.addConnectionStateListener((s) =>
      listener(toConnectionState(s)),
    );
  }

  async function dispose(): Promise<void> {
    for (const unregister of [...handlerUnregisters]) unregister();
    for (const unregister of [...triggerUnregisters]) unregister();
    await sdk.shutdown();
  }

  return {
    browserId,
    trigger,
    call: trigger,
    fire: async (functionId, payload) => {
      await trigger(functionId, payload);
    },
    on,
    registerTrigger,
    addConnectionStateListener,
    subscribeState,
    dispose,
  };
}

function resolveWsUrl(): string {
  const override = import.meta.env?.VITE_III_BROWSER_URL as string | undefined;
  if (typeof override === "string" && override.trim().length > 0) {
    return override.trim();
  }
  return "ws://127.0.0.1:49134";
}

function makeBrowserId(): string {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return `desktop-${crypto.randomUUID()}`;
  }
  const rand = Math.random().toString(36).slice(2, 10);
  return `desktop-${Date.now().toString(36)}-${rand}`;
}
