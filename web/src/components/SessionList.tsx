interface Session {
  id: string;
  title?: string;
  updated_at?: number;
  preview?: string;
}

interface Props {
  sessions: Session[];
  active: string | null;
  onPick: (id: string) => void;
  onNew: () => void;
}

function relative(ts?: number): string {
  if (!ts) return "";
  const diff = Date.now() - ts;
  if (diff < 60_000) return "just now";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h`;
  return `${Math.floor(diff / 86_400_000)}d`;
}

export function SessionList({ sessions, active, onPick, onNew }: Props) {
  return (
    <section
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 4,
        flex: 1,
        overflow: "hidden",
        minHeight: 0,
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "0 8px",
        }}
      >
        <span className="uppercase-label">sessions</span>
        <button
          onClick={onNew}
          title="New session (Cmd+N)"
          style={{
            border: 0,
            background: "transparent",
            color: "var(--secondary)",
            padding: 0,
            fontSize: 18,
            lineHeight: 1,
            cursor: "pointer",
          }}
        >
          +
        </button>
      </div>
      <div
        style={{
          overflowY: "auto",
          flex: 1,
          display: "flex",
          flexDirection: "column",
          gap: 2,
        }}
      >
        {sessions.length === 0 && (
          <div style={{ padding: 8, color: "var(--muted)", fontSize: 12 }}>
            no sessions yet
          </div>
        )}
        {sessions.map((s) => (
          <button
            key={s.id}
            onClick={() => onPick(s.id)}
            data-active={s.id === active}
            style={{
              textAlign: "left",
              padding: "6px 8px",
              border: 0,
              borderRadius: 4,
              background: s.id === active ? "var(--hover)" : "transparent",
              color:
                s.id === active ? "var(--foreground)" : "var(--secondary)",
              display: "flex",
              flexDirection: "column",
              gap: 2,
              overflow: "hidden",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: 6,
              }}
            >
              <span
                className="mono"
                style={{
                  fontSize: 12,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  flex: 1,
                }}
              >
                {s.title ?? s.id}
              </span>
              <span
                className="mono"
                style={{ fontSize: 11, color: "var(--muted)" }}
              >
                {relative(s.updated_at)}
              </span>
            </div>
            {s.preview && (
              <span
                style={{
                  fontSize: 11,
                  color: "var(--muted)",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {s.preview}
              </span>
            )}
          </button>
        ))}
      </div>
    </section>
  );
}

export type { Session };
