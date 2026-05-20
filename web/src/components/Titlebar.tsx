import type { ReactNode } from "react";
import type { ConnectionState } from "../lib/iii-client";

interface Props {
  connection: ConnectionState;
  sessionTitle: string;
  children?: ReactNode;
}

function statusClass(c: ConnectionState): string {
  if (c === "open") return "ok";
  if (c === "connecting") return "warn";
  if (c === "error") return "err";
  return "idle";
}

export function Titlebar({ connection, sessionTitle, children }: Props) {
  return (
    <header className="titlebar">
      <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
        <span className={`status-dot ${statusClass(connection)}`} />
        <span
          className="mono"
          style={{
            fontSize: 11,
            color: "var(--ink-faint)",
            textTransform: "uppercase",
            letterSpacing: "0.06em",
          }}
        >
          {sessionTitle}
        </span>
      </div>
      <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
        {children}
        <span className={`pill mono ${statusClass(connection)}`}>
          {connection}
        </span>
      </div>
    </header>
  );
}
