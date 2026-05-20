import { useCallback, useEffect, useMemo, useState } from "react";
import { getIiiClient } from "../lib/iii-client";

interface StoredSpan {
  trace_id: string;
  span_id: string;
  parent_span_id?: string;
  name: string;
  start_time_unix_nano: number;
  end_time_unix_nano: number;
  status: string;
  attributes?: Array<[string, unknown]>;
  service_name?: string;
}

interface TracesResponse {
  spans: StoredSpan[];
  total: number;
}

interface TraceRow {
  trace_id: string;
  root_op: string;
  status: "ok" | "error" | "pending";
  start_ms: number;
  duration_ms: number;
  span_count: number;
  services: string[];
}

function formatRelative(ms: number): string {
  const diff = Date.now() - ms;
  if (diff < 1000) return "just now";
  if (diff < 60_000) return `${Math.floor(diff / 1000)}s`;
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h`;
  return `${Math.floor(diff / 86_400_000)}d`;
}

function groupSpans(spans: StoredSpan[]): TraceRow[] {
  const byTrace = new Map<string, StoredSpan[]>();
  for (const s of spans) {
    const arr = byTrace.get(s.trace_id) ?? [];
    arr.push(s);
    byTrace.set(s.trace_id, arr);
  }
  const rows: TraceRow[] = [];
  for (const [trace_id, group] of byTrace) {
    const root = group.find((s) => !s.parent_span_id) ?? group[0];
    if (!root) continue;
    const start = root.start_time_unix_nano / 1_000_000;
    const end = Math.max(
      ...group.map((s) => s.end_time_unix_nano / 1_000_000),
    );
    const services = Array.from(
      new Set(group.map((s) => s.service_name ?? "?").filter(Boolean)),
    );
    const hasError = group.some((s) => s.status === "error");
    rows.push({
      trace_id,
      root_op: root.name,
      status: hasError ? "error" : "ok",
      start_ms: start,
      duration_ms: Math.max(0, end - start),
      span_count: group.length,
      services,
    });
  }
  rows.sort((a, b) => b.start_ms - a.start_ms);
  return rows;
}

export function TracesPanel() {
  const [rows, setRows] = useState<TraceRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [otelMissing, setOtelMissing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [paused, setPaused] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const client = await getIiiClient();
      const result = await client.call<TracesResponse>("engine::traces::list", {
        limit: 200,
        offset: 0,
        include_internal: false,
      });
      setOtelMissing(false);
      setRows(groupSpans(result.spans ?? []));
    } catch (err) {
      const message =
        err && typeof err === "object" && "code" in err
          ? String((err as { code?: string }).code ?? "")
          : "";
      if (message === "memory_exporter_not_enabled") {
        setOtelMissing(true);
      } else {
        setError(err instanceof Error ? err.message : String(err));
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
    if (paused) return;
    const interval = setInterval(refresh, 3000);
    return () => clearInterval(interval);
  }, [refresh, paused]);

  const clear = useCallback(async () => {
    try {
      const client = await getIiiClient();
      await client.call("engine::traces::clear", {});
      void refresh();
    } catch {
      // ignore
    }
  }, [refresh]);

  const totals = useMemo(() => {
    const errs = rows.filter((r) => r.status === "error").length;
    return { count: rows.length, errors: errs };
  }, [rows]);

  return (
    <section
      style={{
        padding: 24,
        overflowY: "auto",
        height: "100%",
        maxWidth: 960,
        margin: "0 auto",
        width: "100%",
        fontFamily: "var(--font-mono)",
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
          <div
            style={{
              color: "var(--accent)",
              fontSize: 11,
              textTransform: "uppercase",
              letterSpacing: "0.18em",
              marginBottom: 4,
            }}
          >
            $ traces
          </div>
          <h2
            style={{
              margin: 0,
              fontSize: 18,
              fontWeight: 500,
              textTransform: "lowercase",
              letterSpacing: "-0.01em",
            }}
          >
            otel waterfall
          </h2>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <span className="mono" style={{ fontSize: 11, color: "var(--ink-faint)" }}>
            {totals.count} traces · {totals.errors} errors
          </span>
          <button
            onClick={() => setPaused((v) => !v)}
            style={{ padding: "3px 12px", fontSize: 12 }}
          >
            {paused ? "resume" : "pause"}
          </button>
          <button onClick={() => void refresh()} disabled={loading} style={{ padding: "3px 12px", fontSize: 12 }}>
            {loading ? "…" : "refresh"}
          </button>
          <button onClick={() => void clear()} style={{ padding: "3px 12px", fontSize: 12 }}>
            clear
          </button>
        </div>
      </header>

      {otelMissing && (
        <div
          style={{
            border: "1px solid var(--warn)",
            padding: 14,
            color: "var(--warn)",
            fontSize: 12.5,
            lineHeight: 1.7,
          }}
        >
          <div
            style={{
              fontSize: 11,
              textTransform: "uppercase",
              letterSpacing: "0.18em",
              marginBottom: 4,
            }}
          >
            otel exporter not enabled
          </div>
          <div style={{ color: "var(--ink-faint)" }}>
            set <code style={{ background: "var(--panel)", padding: "0 4px" }}>exporter: memory</code> in your{" "}
            <code style={{ background: "var(--panel)", padding: "0 4px" }}>config.yaml</code> under the iii-observability
            block. restart the engine and traces will start landing here.
          </div>
        </div>
      )}

      {error && (
        <div style={{ border: "1px solid var(--alert)", padding: 10, color: "var(--alert)", fontSize: 12 }}>
          {error}
        </div>
      )}

      {!otelMissing && !error && rows.length === 0 && (
        <div
          style={{
            padding: 24,
            color: "var(--ink-ghost)",
            fontSize: 12.5,
            border: "1px solid var(--rule)",
            textAlign: "center",
            textTransform: "lowercase",
          }}
        >
          no traces yet. run a turn and they'll stream in.
        </div>
      )}

      {!otelMissing && rows.length > 0 && (
        <div className="card">
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "16px 1fr auto auto 80px",
              gap: 12,
              padding: "8px 14px",
              borderBottom: "1px solid var(--rule)",
              background: "var(--panel)",
              fontSize: 11,
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              color: "var(--ink-faint)",
              fontWeight: 500,
            }}
          >
            <span></span>
            <span>op</span>
            <span>spans</span>
            <span>duration</span>
            <span>when</span>
          </div>
          {rows.map((r) => (
            <TraceRow key={r.trace_id} row={r} />
          ))}
        </div>
      )}
    </section>
  );
}

function TraceRow({ row }: { row: TraceRow }) {
  const dot = row.status === "error" ? "err" : "ok";
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "16px 1fr auto auto 80px",
        gap: 12,
        padding: "6px 14px",
        borderBottom: "1px solid var(--rule-2)",
        alignItems: "center",
        fontSize: 12,
        borderLeft:
          row.status === "error"
            ? "2px solid var(--alert)"
            : "2px solid transparent",
      }}
    >
      <span className={`status-dot ${dot}`} />
      <span
        className="mono"
        style={{
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
          color: "var(--ink)",
        }}
      >
        {row.root_op}
        {row.services.length > 0 && (
          <span style={{ color: "var(--ink-ghost)", marginLeft: 8 }}>
            {row.services.join(",")}
          </span>
        )}
      </span>
      <span style={{ color: "var(--ink-faint)" }}>{row.span_count}</span>
      <span
        className="mono"
        style={{ color: "var(--ink-faint)", fontVariantNumeric: "tabular-nums" }}
      >
        {row.duration_ms < 1
          ? `${(row.duration_ms * 1000).toFixed(0)}µs`
          : `${row.duration_ms.toFixed(1)}ms`}
      </span>
      <span
        className="mono"
        style={{
          color: "var(--ink-ghost)",
          fontVariantNumeric: "tabular-nums",
          textAlign: "right",
        }}
      >
        {formatRelative(row.start_ms)}
      </span>
    </div>
  );
}
