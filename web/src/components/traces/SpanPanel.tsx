import { useMemo, useState } from "react";
import { CodeBlock } from "../CodeBlock";
import type { VisualizationSpan } from "../../lib/trace-transform";

interface Props {
  span: VisualizationSpan | null;
  onClose: () => void;
  onSelectSpan?: (spanId: string) => void;
}

type Tab = "info" | "attributes" | "events" | "errors" | "logs" | "context";

function fmtDuration(ms: number): string {
  if (ms < 1) return `${(ms * 1000).toFixed(0)}µs`;
  if (ms < 1000) return `${ms.toFixed(1)}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

export function SpanPanel({ span, onClose, onSelectSpan }: Props) {
  const [tab, setTab] = useState<Tab>("info");
  const eventErrors = useMemo(
    () =>
      span
        ? span.events.filter((e) => e.name === "exception" || e.name === "error")
        : [],
    [span],
  );
  if (!span) {
    return (
      <aside
        style={{
          height: "100%",
          background: "var(--bg)",
          borderLeft: "1px solid var(--rule)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "var(--ink-ghost)",
          fontFamily: "var(--font-mono)",
          fontSize: 11,
          textTransform: "uppercase",
          letterSpacing: "0.18em",
          padding: 16,
          textAlign: "center",
        }}
      >
        select a span to inspect
      </aside>
    );
  }

  const attrCount = Object.keys(span.attributes ?? {}).length;
  const eventCount = span.events?.length ?? 0;
  const tabs: { id: Tab; label: string; count?: number }[] = [
    { id: "info", label: "info" },
    { id: "attributes", label: "attributes", count: attrCount },
    { id: "events", label: "events", count: eventCount },
    { id: "errors", label: "errors", count: eventErrors.length },
    { id: "logs", label: "logs" },
    { id: "context", label: "context" },
  ];

  return (
    <aside
      style={{
        height: "100%",
        background: "var(--bg)",
        borderLeft: "1px solid var(--rule)",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        fontFamily: "var(--font-mono)",
        minWidth: 0,
      }}
    >
      <header
        style={{
          padding: "8px 14px",
          borderBottom: "1px solid var(--rule)",
          background: "var(--panel)",
          display: "flex",
          flexDirection: "column",
          gap: 6,
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <span
            style={{
              fontSize: 11,
              textTransform: "uppercase",
              letterSpacing: "0.18em",
              color: "var(--accent)",
              fontWeight: 500,
            }}
          >
            $ {span.service_name ?? "span"}
          </span>
          <button
            onClick={onClose}
            aria-label="close span"
            style={{
              border: 0,
              background: "transparent",
              color: "var(--ink-faint)",
              padding: 0,
              fontSize: 18,
              lineHeight: 1,
              cursor: "pointer",
            }}
          >
            ×
          </button>
        </div>
        <div
          className="mono"
          style={{ fontSize: 13, color: "var(--ink)" }}
        >
          {span.name}
        </div>
        <div
          className="mono"
          style={{
            fontSize: 11,
            color: "var(--ink-ghost)",
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {span.span_id.slice(0, 12)} · {fmtDuration(span.duration_ms)} · depth{" "}
          {span.depth}
        </div>
      </header>
      <nav
        style={{
          display: "flex",
          borderBottom: "1px solid var(--rule)",
          background: "var(--bg)",
        }}
      >
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            data-active={t.id === tab}
            style={{
              border: 0,
              borderRight: "1px solid var(--rule-2)",
              borderBottom:
                t.id === tab
                  ? "1px solid var(--accent)"
                  : "1px solid transparent",
              background: "transparent",
              padding: "6px 12px",
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              color: t.id === tab ? "var(--ink)" : "var(--ink-faint)",
              cursor: "pointer",
              textTransform: "lowercase",
              display: "flex",
              alignItems: "center",
              gap: 4,
            }}
          >
            {t.label}
            {t.count !== undefined && t.count > 0 && (
              <span style={{ color: "var(--ink-ghost)", fontSize: 10 }}>
                {t.count}
              </span>
            )}
          </button>
        ))}
      </nav>
      <div style={{ flex: 1, overflowY: "auto", padding: 12 }}>
        {tab === "info" && (
          <SpanInfo span={span} onSelectSpan={onSelectSpan} />
        )}
        {tab === "attributes" && <SpanAttributes span={span} />}
        {tab === "events" && <SpanEvents span={span} />}
        {tab === "errors" && <SpanEvents span={span} onlyErrors />}
        {tab === "logs" && (
          <div style={{ color: "var(--ink-ghost)", fontSize: 12 }}>
            logs view ships with otel-logs integration. wire engine::logs::list
            when available.
          </div>
        )}
        {tab === "context" && (
          <CodeBlock
            code={JSON.stringify(
              {
                trace_id: span.trace_id,
                span_id: span.span_id,
                parent_span_id: span.parent_span_id,
                kind: span.kind,
                flags: span.flags,
              },
              null,
              2,
            )}
            language="json"
          />
        )}
      </div>
    </aside>
  );
}

function SpanInfo({
  span,
  onSelectSpan,
}: {
  span: VisualizationSpan;
  onSelectSpan?: (id: string) => void;
}) {
  const rows: Array<[string, string]> = [
    ["status", span.status],
    ["service", span.service_name ?? "—"],
    ["kind", span.kind ?? "—"],
    ["start %", `${span.start_percent.toFixed(2)}`],
    ["width %", `${span.width_percent.toFixed(2)}`],
  ];
  return (
    <>
      <table
        style={{
          width: "100%",
          borderCollapse: "collapse",
          fontFamily: "var(--font-mono)",
          fontSize: 12,
        }}
      >
        <tbody>
          {rows.map(([k, v]) => (
            <tr key={k} style={{ borderBottom: "1px solid var(--rule-2)" }}>
              <td
                style={{
                  padding: "6px 8px 6px 0",
                  color: "var(--ink-faint)",
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                  fontSize: 11,
                  whiteSpace: "nowrap",
                }}
              >
                {k}
              </td>
              <td
                style={{
                  padding: "6px 0",
                  color: "var(--ink)",
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {v}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {span.parent_span_id && onSelectSpan && (
        <button
          onClick={() => onSelectSpan(span.parent_span_id ?? "")}
          style={{
            marginTop: 12,
            padding: "4px 10px",
            background: "var(--bg)",
            border: "1px solid var(--rule)",
            color: "var(--ink-faint)",
            fontSize: 11,
            textTransform: "lowercase",
          }}
        >
          ↑ parent {span.parent_span_id.slice(0, 8)}
        </button>
      )}
    </>
  );
}

function SpanAttributes({ span }: { span: VisualizationSpan }) {
  const entries = Object.entries(span.attributes ?? {});
  if (entries.length === 0) {
    return (
      <div style={{ color: "var(--ink-ghost)", fontSize: 12 }}>
        no attributes
      </div>
    );
  }
  return (
    <CodeBlock
      code={JSON.stringify(Object.fromEntries(entries), null, 2)}
      language="json"
    />
  );
}

function SpanEvents({
  span,
  onlyErrors,
}: {
  span: VisualizationSpan;
  onlyErrors?: boolean;
}) {
  const events = onlyErrors
    ? span.events.filter(
        (e) => e.name === "exception" || e.name === "error",
      )
    : span.events;
  if (events.length === 0) {
    return (
      <div style={{ color: "var(--ink-ghost)", fontSize: 12 }}>
        {onlyErrors ? "no errors" : "no events"}
      </div>
    );
  }
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {events.map((e, i) => (
        <article key={`${e.name}-${i}`}>
          <div
            style={{
              fontSize: 11,
              color: "var(--ink-faint)",
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              marginBottom: 4,
            }}
          >
            {e.name}
          </div>
          <CodeBlock code={JSON.stringify(e.attributes ?? {}, null, 2)} language="json" />
        </article>
      ))}
    </div>
  );
}
