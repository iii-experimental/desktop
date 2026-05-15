import type { ConnectionState } from "../lib/iii-client";

interface Props {
  connection: ConnectionState;
  sessionTitle: string;
}

function statusClass(c: ConnectionState): string {
  if (c === "open") return "ok";
  if (c === "connecting") return "warn";
  if (c === "error") return "err";
  return "idle";
}

export function Titlebar({ connection, sessionTitle }: Props) {
  return (
    <header className="titlebar">
      <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
        <span className="status-dot" data-class={statusClass(connection)} />
        <span className="mono uppercase-label">{sessionTitle}</span>
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <span className="pill outline mono">{connection ?? "idle"}</span>
      </div>
    </header>
  );
}
