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
  if (diff < 60_000) return "now";
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
        gap: 0,
        flex: 1,
        overflow: "hidden",
        minHeight: 0,
        borderTop: "1px solid var(--rule)",
        paddingTop: 8,
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "0 6px",
          marginBottom: 6,
        }}
      >
        <span className="uppercase-label">sessions</span>
        <button
          onClick={onNew}
          title="new session (cmd+n)"
          style={{
            border: 0,
            background: "transparent",
            color: "var(--ink-faint)",
            padding: 0,
            fontSize: 16,
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
          gap: 0,
        }}
      >
        {sessions.length === 0 && (
          <div
            style={{
              padding: "6px 6px",
              color: "var(--ink-ghost)",
              fontSize: 11,
              textTransform: "lowercase",
            }}
          >
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
              borderBottom: "1px solid var(--rule-2)",
              borderLeft: s.id === active ? "2px solid var(--accent)" : "2px solid transparent",
              background: s.id === active ? "var(--bg)" : "transparent",
              color: s.id === active ? "var(--ink)" : "var(--ink-faint)",
              display: "flex",
              flexDirection: "column",
              gap: 2,
              overflow: "hidden",
              textTransform: "lowercase",
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
                  fontSize: 11.5,
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
                style={{ fontSize: 10, color: "var(--ink-ghost)" }}
              >
                {relative(s.updated_at)}
              </span>
            </div>
            {s.preview && (
              <span
                style={{
                  fontSize: 10.5,
                  color: "var(--ink-ghost)",
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
