import { useCallback, useEffect, useState } from "react";
import { getIiiClient } from "../lib/iii-client";

interface HarnessStatus {
  ok?: boolean;
  name?: string;
  version?: string;
  expected_workers?: string[];
}

interface WorkerInfo {
  name?: string;
  status?: string;
}

export function StatusPanel() {
  const [harness, setHarness] = useState<HarnessStatus | null>(null);
  const [workers, setWorkers] = useState<WorkerInfo[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const client = await getIiiClient();
      const [hs, wl] = await Promise.all([
        client.call<HarnessStatus>("harness::status"),
        client
          .call<{ workers?: WorkerInfo[] }>("harness::call", {
            function_id: "engine::workers::list",
            payload: {},
          })
          .catch(() => ({ workers: [] }) as { workers: WorkerInfo[] }),
      ]);
      setHarness(hs);
      setWorkers(wl.workers ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return (
    <section style={{ padding: 32, overflowY: "auto", height: "100%" }}>
      <header
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 24,
        }}
      >
        <div>
          <div className="uppercase-label">harness</div>
          <div
            className="mono"
            style={{ fontSize: 16, marginTop: 4 }}
          >
            {harness?.name ?? "—"}{" "}
            <span style={{ color: "var(--muted)" }}>
              {harness?.version ?? ""}
            </span>
          </div>
        </div>
        <button onClick={() => void refresh()} disabled={loading}>
          {loading ? "…" : "Refresh"}
        </button>
      </header>

      {error && (
        <div className="pill err mono" style={{ marginBottom: 16 }}>
          {error}
        </div>
      )}

      <div className="uppercase-label" style={{ marginBottom: 8 }}>
        workers ({workers.length})
      </div>
      <div className="card">
        {workers.length === 0 ? (
          <div style={{ padding: 16, color: "var(--muted)" }}>
            no workers reported
          </div>
        ) : (
          workers.map((w, i) => (
            <div
              key={`${w.name ?? "anon"}-${i}`}
              style={{
                display: "flex",
                justifyContent: "space-between",
                padding: "8px 12px",
                borderBottom: "1px solid var(--border-subtle)",
              }}
            >
              <span className="mono">{w.name ?? "unknown"}</span>
              <span
                className={`pill mono ${w.status === "running" ? "ok" : "outline"}`}
              >
                {w.status ?? "?"}
              </span>
            </div>
          ))
        )}
      </div>

      {harness?.expected_workers && (
        <>
          <div
            className="uppercase-label"
            style={{ marginTop: 24, marginBottom: 8 }}
          >
            expected ({harness.expected_workers.length})
          </div>
          <div
            className="mono"
            style={{
              color: "var(--secondary)",
              fontSize: 12,
              lineHeight: 1.7,
            }}
          >
            {harness.expected_workers.join(", ")}
          </div>
        </>
      )}
    </section>
  );
}
