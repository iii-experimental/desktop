import { useCallback, useEffect, useMemo, useState } from "react";
import { Composer } from "./components/Composer";
import { CostPanel } from "./components/CostPanel";
import { FilesystemPanel } from "./components/FilesystemPanel";
import { Sidebar } from "./components/Sidebar";
import { StatusPanel } from "./components/StatusPanel";
import { Titlebar } from "./components/Titlebar";
import { Transcript } from "./components/Transcript";
import { getIiiClient, type ConnectionState } from "./lib/iii-client";
import { onMenuAction } from "./lib/tauri";
import type { Message, Tab } from "./lib/types";
import { useAgentStream } from "./lib/useAgentStream";

function makeSessionId(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `s${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
}

export default function App() {
  const [tab, setTab] = useState<Tab>("chat");
  const [sessionId, setSessionId] = useState<string>(() => makeSessionId());
  const [connection, setConnection] = useState<ConnectionState>("idle");
  const [userMessages, setUserMessages] = useState<Message[]>([]);
  const [provider] = useState<string>("anthropic");
  const [model] = useState<string>("claude-opus-4-7");

  useEffect(() => {
    let off: (() => void) | undefined;
    void (async () => {
      const client = await getIiiClient();
      off = client.subscribeState(setConnection);
    })();
    return () => off?.();
  }, []);

  useEffect(() => {
    let off: (() => void) | undefined;
    void (async () => {
      off = await onMenuAction((action) => {
        if (action === "session.new") {
          setSessionId(makeSessionId());
          setUserMessages([]);
        } else if (action.startsWith("view.")) {
          setTab(action.replace("view.", "") as Tab);
        }
      });
    })();
    return () => off?.();
  }, []);

  const stream = useAgentStream(sessionId);

  const allMessages = useMemo<Message[]>(
    () => [...userMessages, ...stream.messages],
    [userMessages, stream.messages],
  );

  const send = useCallback(
    async (text: string) => {
      const userMsg: Message = {
        id: `u-${Date.now()}`,
        role: "user",
        content: text,
        timestamp: Date.now(),
      };
      setUserMessages((m) => [...m, userMsg]);

      const client = await getIiiClient();
      await client.call("harness::call", {
        function_id: "run::start",
        payload: {
          session_id: sessionId,
          provider,
          model,
          messages: [
            ...allMessages
              .filter((m) => m.role === "user" || m.role === "assistant")
              .map((m) => ({
                role: m.role,
                content: m.content,
                timestamp: m.timestamp,
              })),
            { role: "user", content: text, timestamp: userMsg.timestamp },
          ],
        },
      });
    },
    [allMessages, model, provider, sessionId],
  );

  return (
    <div className="shell">
      <Sidebar tab={tab} setTab={setTab} />
      <main className="main">
        <Titlebar connection={connection} sessionTitle={sessionId} />
        <div className="workspace">
          {tab === "chat" && (
            <Transcript messages={allMessages} pending={stream.pending} />
          )}
          {tab === "cost" && <CostPanel messages={allMessages} />}
          {tab === "files" && <FilesystemPanel />}
          {tab === "status" && <StatusPanel />}
          {tab === "chat" && <Composer onSend={send} />}
        </div>
      </main>
    </div>
  );
}

