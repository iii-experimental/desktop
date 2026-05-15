/*
 * Tauri IPC helpers. Available only inside the Tauri webview; we feature-
 * detect so the same bundle can be served by a plain browser during web-
 * only dev.
 */

export const isTauri = typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;

interface TauriInvoke {
  invoke<T = unknown>(cmd: string, args?: Record<string, unknown>): Promise<T>;
}

interface TauriEvent {
  listen<P = unknown>(
    event: string,
    handler: (payload: P) => void,
  ): Promise<() => void>;
}

async function loadCore(): Promise<TauriInvoke> {
  const mod = await import("@tauri-apps/api/core");
  return { invoke: mod.invoke };
}

async function loadEvent(): Promise<TauriEvent> {
  const mod = await import("@tauri-apps/api/event");
  return {
    listen: async (event, handler) => {
      const off = await mod.listen<unknown>(event, (e) =>
        handler(e.payload as never),
      );
      return off;
    },
  };
}

export async function invoke<T = unknown>(
  cmd: string,
  args: Record<string, unknown> = {},
): Promise<T> {
  if (!isTauri) throw new Error(`tauri.invoke('${cmd}') called outside Tauri`);
  const { invoke } = await loadCore();
  return invoke<T>(cmd, args);
}

export async function listen<P = unknown>(
  event: string,
  handler: (payload: P) => void,
): Promise<() => void> {
  if (!isTauri) return () => {};
  const { listen } = await loadEvent();
  return listen(event, handler);
}

export type MenuAction =
  | "session.new"
  | "session.open"
  | "session.export.md"
  | "session.export.json"
  | "view.chat"
  | "view.cost"
  | "view.files"
  | "view.status";

export async function onMenuAction(
  handler: (action: MenuAction) => void,
): Promise<() => void> {
  return listen<string>("desktop::menu", (id) => handler(id as MenuAction));
}
