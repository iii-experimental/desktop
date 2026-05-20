import { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityPanel } from "./components/ActivityPanel";
import { ChatDock } from "./components/ChatDock";
import { ChatPanel } from "./components/ChatPanel";
import { CommandPalette } from "./components/CommandPalette";
import { CostPanel } from "./components/CostPanel";
import { DirectoryPanel } from "./components/DirectoryPanel";
import { FilesystemPanel } from "./components/FilesystemPanel";
import { ModelPicker, type ModelOption } from "./components/ModelPicker";
import { StatusPanel } from "./components/StatusPanel";
import { ThemeToggle } from "./components/ThemeToggle";
import { TracesPanel } from "./components/TracesPanel";
import { ViewTabs } from "./components/ViewTabs";
import { Wordmark } from "./components/Wordmark";
import { useChatDock } from "./lib/chat-dock";
import { getIiiClient, type ConnectionState } from "./lib/iii-client";
import { onMenuAction } from "./lib/tauri";
import { useTheme } from "./lib/theme";
import type { FunctionCall, Message, Tab } from "./lib/types";
import { useAgentStream } from "./lib/useAgentStream";

function formatError(err: unknown): string {
  if (typeof err === "string") return err;
  if (err instanceof Error) return err.message;
  if (err && typeof err === "object") {
    const obj = err as Record<string, unknown>;
    const code = typeof obj.code === "string" ? obj.code : undefined;
    const message = typeof obj.message === "string" ? obj.message : undefined;
    if (code && message) return `${code}: ${message}`;
    if (message) return message;
    if (code) return code;
    try {
      return JSON.stringify(err);
    } catch {
      return String(err);
    }
  }
  return String(err);
}

function makeSessionId(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `s${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
}

const DEFAULT_MODELS: ModelOption[] = [
  { provider: "anthropic", model: "claude-opus-4-7", label: "Claude Opus 4.7" },
  { provider: "anthropic", model: "claude-sonnet-4-6", label: "Claude Sonnet 4.6" },
  { provider: "anthropic", model: "claude-haiku-4-5", label: "Claude Haiku 4.5" },
  { provider: "openai", model: "gpt-5", label: "GPT-5" },
];

const VIEW_OPTIONS: { value: Tab; label: string }[] = [
  { value: "chat", label: "chat" },
  { value: "traces", label: "traces" },
  { value: "directory", label: "directory" },
  { value: "activity", label: "activity" },
  { value: "files", label: "files" },
  { value: "cost", label: "cost" },
  { value: "status", label: "status" },
];

export default function App() {
  const [tab, setTab] = useState<Tab>("chat");
  const [sessionId, setSessionId] = useState<string>(() => makeSessionId());
  const [connection, setConnection] = useState<ConnectionState>("idle");
  const [userMessages, setUserMessages] = useState<Message[]>([]);
  const [model, setModel] = useState<ModelOption>(DEFAULT_MODELS[0]);
  const [models, setModels] = useState<ModelOption[]>(DEFAULT_MODELS);
  const [busy, setBusy] = useState(false);
  const [approvals, setApprovals] = useState<FunctionCall[]>([]);
  const [theme, setTheme] = useTheme();
  const dock = useChatDock();

  useEffect(() => {
    let off: (() => void) | undefined;
    void (async () => {
      const client = await getIiiClient();
      off = client.subscribeState(setConnection);
      try {
        const result = await client.call<{
          models?: Array<{
            id: string;
            display_name?: string;
            provider: string;
          }>;
        }>("models::list", {});
        const opts: ModelOption[] = (result.models ?? []).map((m) => ({
          provider: m.provider,
          model: m.id,
          label: m.display_name ?? m.id,
        }));
        if (opts.length > 0) {
          setModels(opts);
          setModel(opts[0]);
        }
      } catch {
        // keep defaults
      }
    })();
    return () => off?.();
  }, []);

  useEffect(() => {
    let off: (() => void) | undefined;
    void (async () => {
      off = await onMenuAction((action) => {
        if (action === "session.new") {
          newSession();
        } else if (action.startsWith("view.")) {
          setTab(action.replace("view.", "") as Tab);
        }
      });
    })();
    return () => off?.();
  }, []);

  const stream = useAgentStream(sessionId);

  const allMessages = useMemo<Message[]>(
    () =>
      [...userMessages, ...stream.messages].sort(
        (a, b) => (a.timestamp ?? 0) - (b.timestamp ?? 0),
      ),
    [userMessages, stream.messages],
  );

  const turnActive = stream.active || busy;

  const newSession = useCallback(() => {
    setSessionId(makeSessionId());
    setUserMessages([]);
    setApprovals([]);
    setBusy(false);
  }, []);

  const send = useCallback(
    async (text: string) => {
      if (text.startsWith("/")) {
        if (text === "/clear") {
          setUserMessages([]);
          return;
        }
        if (text === "/new") {
          newSession();
          return;
        }
      }
      const userMsg: Message = {
        id: `u-${Date.now()}`,
        role: "user",
        content: text,
        timestamp: Date.now(),
      };
      setUserMessages((m) => [...m, userMsg]);
      setBusy(true);

      try {
        const client = await getIiiClient();
        await client.call("ui::subscribe", {
          browser_id: client.browserId,
          session_id: sessionId,
        });
        await client.fire("run::start", {
          session_id: sessionId,
          provider: model.provider,
          model: model.model,
          messages: [
            ...allMessages
              .filter((m) => m.role === "user" || m.role === "assistant")
              .map((m) => {
                const base = {
                  role: m.role,
                  content: [{ type: "text", text: m.content }],
                  timestamp: m.timestamp,
                };
                if (m.role !== "assistant") return base;
                return {
                  ...base,
                  stop_reason: m.stop_reason ?? "end",
                  provider: m.provider ?? model.provider,
                  model: m.model ?? model.model,
                  usage: m.usage ?? {
                    input: 0,
                    output: 0,
                    cache_read: 0,
                    cache_write: 0,
                  },
                };
              }),
            {
              role: "user",
              content: [{ type: "text", text }],
              timestamp: userMsg.timestamp,
            },
          ],
        });
      } catch (err) {
        const errorMsg: Message = {
          id: `e-${Date.now()}`,
          role: "system",
          content: `**error**: ${formatError(err)}`,
          timestamp: Date.now(),
        };
        setUserMessages((m) => [...m, errorMsg]);
      } finally {
        setBusy(false);
      }
    },
    [allMessages, model, sessionId, newSession],
  );

  const respondApproval = useCallback(
    async (id: string, decision: "approve" | "reject") => {
      try {
        const client = await getIiiClient();
        await client.call("approval::resolve", {
          session_id: sessionId,
          function_call_id: id,
          decision: decision === "approve" ? "allow" : "deny",
        });
      } catch (err) {
        console.warn("approval resolve failed", formatError(err));
      }
      setApprovals((a) => a.filter((x) => x.id !== id));
    },
    [sessionId],
  );

  const stop = useCallback(async () => {
    try {
      const client = await getIiiClient();
      await client.call("router::abort", { session_id: sessionId });
    } catch (err) {
      console.warn("abort failed", formatError(err));
    }
    setBusy(false);
  }, [sessionId]);

  const paletteItems = useMemo(
    () => [
      {
        id: "new",
        label: "new session",
        hint: "⌘N",
        group: "session" as const,
        run: newSession,
      },
      {
        id: "clear",
        label: "clear transcript",
        hint: "",
        group: "session" as const,
        run: () => setUserMessages([]),
      },
      ...VIEW_OPTIONS.map((v, i) => ({
        id: `view-${v.value}`,
        label: `view ${v.label}`,
        hint: `⌘${i + 1}`,
        group: "view" as const,
        run: () => setTab(v.value),
      })),
      ...models.map((m) => ({
        id: `m-${m.provider}-${m.model}`,
        label: `use ${m.label ?? m.model}`,
        hint: m.provider,
        group: "model" as const,
        run: () => setModel(m),
      })),
    ],
    [models, newSession],
  );

  const chatProps = {
    messages: allMessages,
    stream,
    turnActive,
    onSend: send,
    onStop: stop,
    approvals,
    onApproval: respondApproval,
  };

  const dockEligible = tab !== "chat";
  const dockVisible = dockEligible && dock.open;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100vh",
        background: "var(--bg)",
      }}
    >
      <header
        style={{
          height: 44,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 16px 0 90px",
          borderBottom: "1px solid var(--rule)",
          background: "var(--bg)",
          WebkitAppRegion: "drag",
          userSelect: "none",
        } as React.CSSProperties}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 14,
          }}
        >
          <Wordmark />
          <span
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              textTransform: "uppercase",
              letterSpacing: "0.18em",
              color: "var(--ink-faint)",
            }}
          >
            {tab}
          </span>
          <ConnectionPill state={connection} />
        </div>
        <div
          style={{ display: "flex", gap: 10, alignItems: "center" }}
        >
          <span
            style={{
              WebkitAppRegion: "no-drag",
            } as React.CSSProperties}
          >
            <ModelPicker
              options={models}
              value={model}
              onChange={setModel}
            />
          </span>
          {dockEligible && (
            <span style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}>
              <button
                type="button"
                onClick={dock.toggle}
                aria-pressed={dock.open}
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 12,
                  padding: "3px 12px",
                  background: dock.open ? "var(--ink)" : "var(--bg)",
                  color: dock.open ? "var(--bg)" : "var(--ink-faint)",
                  border: `1px solid ${dock.open ? "var(--ink)" : "var(--rule)"}`,
                  textTransform: "lowercase",
                }}
              >
                {dock.open ? "× chat" : "+ chat"}
              </button>
            </span>
          )}
          <span style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}>
            <ViewTabs value={tab} onChange={setTab} options={VIEW_OPTIONS} />
          </span>
          <span style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}>
            <ThemeToggle theme={theme} onChange={setTheme} />
          </span>
        </div>
      </header>
      <div style={{ flex: 1, display: "flex", minHeight: 0 }}>
        {dockVisible && (
          <ChatDock
            width={dock.width}
            onWidthChange={dock.setWidth}
            onClose={() => dock.setOpen(false)}
          >
            <ChatPanel {...chatProps} density="dock" />
          </ChatDock>
        )}
        <main
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            background: "var(--bg)",
          }}
        >
          {tab === "chat" && <ChatPanel {...chatProps} density="route" />}
          {tab === "traces" && <TracesPanel />}
          {tab === "directory" && <DirectoryPanel />}
          {tab === "activity" && <ActivityPanel />}
          {tab === "files" && <FilesystemPanel />}
          {tab === "cost" && <CostPanel messages={allMessages} />}
          {tab === "status" && <StatusPanel />}
        </main>
      </div>
      <CommandPalette items={paletteItems} />
    </div>
  );
}

function ConnectionPill({ state }: { state: ConnectionState }) {
  const cls =
    state === "open" ? "ok" : state === "connecting" ? "warn" : state === "error" ? "err" : "idle";
  return <span className={`pill mono ${cls}`}>{state}</span>;
}
