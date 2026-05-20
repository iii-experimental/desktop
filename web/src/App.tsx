import { useCallback, useEffect, useMemo, useState } from "react";
import { ApprovalRow } from "./components/ApprovalRow";
import { CommandPalette } from "./components/CommandPalette";
import { Composer } from "./components/Composer";
import { ActivityPanel } from "./components/ActivityPanel";
import { CostPanel } from "./components/CostPanel";
import { FilesystemPanel } from "./components/FilesystemPanel";
import { ThemeToggle } from "./components/ThemeToggle";
import { useTheme } from "./lib/theme";
import { ModelPicker, type ModelOption } from "./components/ModelPicker";
import { SessionList, type Session } from "./components/SessionList";
import { StatusPanel } from "./components/StatusPanel";
import { Titlebar } from "./components/Titlebar";
import { Transcript } from "./components/Transcript";
import { getIiiClient, type ConnectionState } from "./lib/iii-client";
import { onMenuAction } from "./lib/tauri";
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
  {
    provider: "anthropic",
    model: "claude-opus-4-7",
    label: "Claude Opus 4.7",
  },
  {
    provider: "anthropic",
    model: "claude-sonnet-4-6",
    label: "Claude Sonnet 4.6",
  },
  {
    provider: "anthropic",
    model: "claude-haiku-4-5",
    label: "Claude Haiku 4.5",
  },
  { provider: "openai", model: "gpt-5", label: "GPT-5" },
];

export default function App() {
  const [tab, setTab] = useState<Tab>("chat");
  const [sessionId, setSessionId] = useState<string>(() => makeSessionId());
  const [sessions, setSessions] = useState<Session[]>([]);
  const [connection, setConnection] = useState<ConnectionState>("idle");
  const [userMessages, setUserMessages] = useState<Message[]>([]);
  const [model, setModel] = useState<ModelOption>(DEFAULT_MODELS[0]);
  const [models, setModels] = useState<ModelOption[]>(DEFAULT_MODELS);
  const [busy, setBusy] = useState(false);
  const [approvals, setApprovals] = useState<FunctionCall[]>([]);
  const [theme, setTheme] = useTheme();

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
        // models worker may not be running; keep defaults
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

  useEffect(() => {
    setSessions((prev) => {
      const next = [...prev];
      const idx = next.findIndex((s) => s.id === sessionId);
      const last = allMessages[allMessages.length - 1];
      const preview = last?.content?.slice(0, 80) ?? "";
      const row: Session = {
        id: sessionId,
        title: sessionId,
        updated_at: last?.timestamp ?? Date.now(),
        preview,
      };
      if (idx >= 0) next[idx] = row;
      else next.unshift(row);
      return next.sort((a, b) => (b.updated_at ?? 0) - (a.updated_at ?? 0));
    });
  }, [sessionId, allMessages]);

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
        // Race-safe: subscribe right before fire so the pump has the entry
        // before turn-orchestrator publishes its first event.
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
          content: `**Error**: ${formatError(err)}`,
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
        label: "New session",
        hint: "⌘N",
        group: "session" as const,
        run: newSession,
      },
      {
        id: "clear",
        label: "Clear transcript",
        hint: "",
        group: "session" as const,
        run: () => setUserMessages([]),
      },
      ...(["chat", "activity", "files", "cost", "status"] as const).map((t, i) => ({
        id: `view-${t}`,
        label: `View ${t}`,
        hint: `⌘${i + 1}`,
        group: "view" as const,
        run: () => setTab(t),
      })),
      ...models.map((m) => ({
        id: `m-${m.provider}-${m.model}`,
        label: `Use ${m.label ?? m.model}`,
        hint: m.provider,
        group: "model" as const,
        run: () => setModel(m),
      })),
    ],
    [models, newSession],
  );

  return (
    <div className="shell">
      <Sidebar
        tab={tab}
        setTab={setTab}
        sessions={sessions}
        activeSession={sessionId}
        onPickSession={setSessionId}
        onNewSession={newSession}
      />
      <main className="main">
        <Titlebar connection={connection} sessionTitle={sessionId}>
          <ModelPicker options={models} value={model} onChange={setModel} />
          <ThemeToggle theme={theme} onChange={setTheme} />
        </Titlebar>
        <div className="workspace">
          {tab === "chat" && (
            <>
              <div style={{ overflowY: "auto" }}>
                <Transcript
                  messages={allMessages}
                  pending={stream.pending}
                  thinking={turnActive}
                  onSuggest={send}
                />
                {approvals.length > 0 && (
                  <div
                    style={{
                      maxWidth: 920,
                      margin: "0 auto",
                      padding: "0 28px 16px",
                    }}
                  >
                    {approvals.map((a) => (
                      <ApprovalRow
                        key={a.id}
                        request={a}
                        onApprove={() => respondApproval(a.id, "approve")}
                        onReject={() => respondApproval(a.id, "reject")}
                      />
                    ))}
                  </div>
                )}
              </div>
              <Composer
                onSend={send}
                onStop={stop}
                busy={turnActive}
                disabled={turnActive}
              />
            </>
          )}
          {tab === "cost" && <CostPanel messages={allMessages} />}
          {tab === "files" && <FilesystemPanel />}
          {tab === "activity" && <ActivityPanel />}
          {tab === "status" && <StatusPanel />}
        </div>
      </main>
      <CommandPalette items={paletteItems} />
    </div>
  );
}

interface SidebarProps {
  tab: Tab;
  setTab: (tab: Tab) => void;
  sessions: Session[];
  activeSession: string | null;
  onPickSession: (id: string) => void;
  onNewSession: () => void;
}

const TABS: { id: Tab; label: string; hint: string }[] = [
  { id: "chat", label: "Chat", hint: "⌘1" },
  { id: "activity", label: "Activity", hint: "⌘2" },
  { id: "files", label: "Files", hint: "⌘3" },
  { id: "cost", label: "Cost", hint: "⌘4" },
  { id: "status", label: "Status", hint: "⌘5" },
];

function Sidebar({
  tab,
  setTab,
  sessions,
  activeSession,
  onPickSession,
  onNewSession,
}: SidebarProps) {
  return (
    <aside className="sidebar">
      <div className="logo">
        <span className="mark">iii</span>
        <span className="sep">/</span>
        <span className="sub">desktop</span>
      </div>
      <nav aria-label="primary">
        {TABS.map((t) => (
          <button
            key={t.id}
            data-active={tab === t.id}
            onClick={() => setTab(t.id)}
          >
            <span>{t.label.toLowerCase()}</span>
            <span style={{ color: "var(--muted)", fontSize: 10 }}>
              {t.hint}
            </span>
          </button>
        ))}
      </nav>
      <SessionList
        sessions={sessions}
        active={activeSession}
        onPick={onPickSession}
        onNew={onNewSession}
      />
      <div className="uppercase-label">v0.1.0</div>
    </aside>
  );
}
