import { useCallback, useEffect, useState } from "react";
import { getIiiClient } from "../lib/iii-client";

interface WorkerInfo {
  name?: string;
  status?: string;
  pid?: number;
  function_count?: number;
}

interface Sandbox {
  id?: string;
  status?: string;
  image?: string;
  created_at?: number;
}

interface SessionMeta {
  id: string;
  provider?: string;
  model?: string;
  message_count?: number;
}

export function ActivityPanel() {
  const [workers, setWorkers] = useState<WorkerInfo[]>([]);
  const [sandboxes, setSandboxes] = useState<Sandbox[]>([]);
  const [sessions, setSessions] = useState<SessionMeta[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const client = await getIiiClient();
      const [wl, sb, st] = await Promise.all([
        client
          .call<{ workers?: WorkerInfo[] }>("engine::workers::list", {})
          .catch(() => ({ workers: [] }) as { workers: WorkerInfo[] }),
        client
          .call<{ sandboxes?: Sandbox[] }>("sandbox::list", {})
          .catch(() => ({ sandboxes: [] }) as { sandboxes: Sandbox[] }),
        client
          .call<Array<{ key: string; value: Record<string, unknown> }>>(
            "state::list",
            { scope: "agent" },
          )
          .catch(() => [] as Array<{ key: string; value: Record<string, unknown> }>),
      ]);
      setWorkers(wl.workers ?? []);
      setSandboxes(sb.sandboxes ?? []);
      const sessionEntries: SessionMeta[] = Array.isArray(st)
        ? st.map((row) => ({
            id: row.key ?? "?",
            provider: row.value?.provider as string | undefined,
            model: row.value?.model as string | undefined,
          }))
        : [];
      setSessions(sessionEntries);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
    const interval = setInterval(refresh, 5000);
    return () => clearInterval(interval);
  }, [refresh]);

  return (
    <section
      style={{
        padding: 24,
        overflowY: "auto",
        height: "100%",
        maxWidth: 920,
        margin: "0 auto",
        width: "100%",
      }}
    >
      <header
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 18,
        }}
      >
        <div>
          <div className="uppercase-label">live engine</div>
          <h2 style={{ margin: "4px 0 0", fontSize: 16 }}>Activity</h2>
        </div>
        <button onClick={() => void refresh()} disabled={loading}>
          {loading ? "…" : "Refresh"}
        </button>
      </header>

      {error && (
        <div className="pill err mono" style={{ marginBottom: 16, display: "inline-block", padding: "4px 10px" }}>
          {error}
        </div>
      )}

      <Section title="workers" count={workers.length}>
        {workers.length === 0 ? (
          <Empty>no workers connected</Empty>
        ) : (
          workers.map((w, i) => (
            <Row
              key={`${w.name ?? "anon"}-${i}`}
              left={
                <>
                  <span className="mono" style={{ fontSize: 12 }}>
                    {w.name ?? "unknown"}
                  </span>
                  {w.function_count !== undefined && (
                    <span
                      className="mono"
                      style={{
                        marginLeft: 8,
                        color: "var(--muted)",
                        fontSize: 11,
                      }}
                    >
                      {w.function_count} fns
                    </span>
                  )}
                </>
              }
              right={
                <span
                  className={`pill mono ${w.status === "connected" ? "ok" : "outline"}`}
                >
                  {w.status ?? "?"}
                </span>
              }
            />
          ))
        )}
      </Section>

      <Section title="sandboxes" count={sandboxes.length}>
        {sandboxes.length === 0 ? (
          <Empty>no sandboxes — agent can spawn via sandbox::create</Empty>
        ) : (
          sandboxes.map((s, i) => (
            <Row
              key={s.id ?? `sb-${i}`}
              left={
                <>
                  <span className="mono" style={{ fontSize: 12 }}>
                    {s.id ?? "?"}
                  </span>
                  {s.image && (
                    <span
                      className="mono"
                      style={{
                        marginLeft: 8,
                        color: "var(--muted)",
                        fontSize: 11,
                      }}
                    >
                      {s.image}
                    </span>
                  )}
                </>
              }
              right={
                <span className={`pill mono ${s.status === "running" ? "ok" : "outline"}`}>
                  {s.status ?? "?"}
                </span>
              }
            />
          ))
        )}
      </Section>

      <Section title="sessions" count={sessions.length}>
        {sessions.length === 0 ? (
          <Empty>no sessions in state::agent</Empty>
        ) : (
          sessions.map((s) => (
            <Row
              key={s.id}
              left={<span className="mono" style={{ fontSize: 12 }}>{s.id}</span>}
              right={
                s.model ? (
                  <span className="mono" style={{ fontSize: 11, color: "var(--muted)" }}>
                    {s.provider}/{s.model}
                  </span>
                ) : null
              }
            />
          ))
        )}
      </Section>
    </section>
  );
}

function Section({
  title,
  count,
  children,
}: {
  title: string;
  count: number;
  children: React.ReactNode;
}) {
  return (
    <section style={{ marginBottom: 22 }}>
      <div
        className="uppercase-label"
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          marginBottom: 6,
        }}
      >
        <span>{title}</span>
        <span style={{ color: "var(--muted)" }}>({count})</span>
      </div>
      <div className="card">{children}</div>
    </section>
  );
}

function Row({ left, right }: { left: React.ReactNode; right?: React.ReactNode }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "8px 12px",
        borderBottom: "1px solid var(--border-subtle)",
      }}
    >
      <div>{left}</div>
      {right}
    </div>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ padding: 12, color: "var(--muted)", fontSize: 12 }}>
      {children}
    </div>
  );
}
