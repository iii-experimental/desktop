import { useRef } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import type { VisualizationSpan, WaterfallData } from "../../lib/trace-transform";

interface Props {
  data: WaterfallData;
  selectedSpanId: string | null;
  onSelectSpan: (spanId: string) => void;
}

const ROW_HEIGHT = 30;
const INDENT_PX = 14;
const NAME_COL_PX = 280;

function fmtDuration(ms: number): string {
  if (ms < 1) return `${(ms * 1000).toFixed(0)}µs`;
  if (ms < 1000) return `${ms.toFixed(1)}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

function barClass(status: VisualizationSpan["status"]): string {
  if (status === "error") return "error";
  if (status === "unset") return "unset";
  return "";
}

export function WaterfallChart({
  data,
  selectedSpanId,
  onSelectSpan,
}: Props) {
  const parentRef = useRef<HTMLDivElement | null>(null);

  const virtualizer = useVirtualizer({
    count: data.spans.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 16,
  });

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        background: "var(--bg)",
        fontFamily: "var(--font-mono)",
      }}
    >
      <header
        style={{
          display: "grid",
          gridTemplateColumns: `${NAME_COL_PX}px 1fr 90px`,
          gap: 12,
          padding: "6px 12px",
          borderBottom: "1px solid var(--rule)",
          background: "var(--panel)",
          fontSize: 10,
          textTransform: "uppercase",
          letterSpacing: "0.18em",
          color: "var(--ink-faint)",
        }}
      >
        <span>span</span>
        <span>
          {fmtDuration(data.total_duration_ms)} · {data.span_count} spans
        </span>
        <span style={{ textAlign: "right" }}>duration</span>
      </header>
      <div
        ref={parentRef}
        style={{ flex: 1, overflowY: "auto", overflowX: "hidden" }}
      >
        <div
          style={{
            height: virtualizer.getTotalSize(),
            position: "relative",
          }}
        >
          {virtualizer.getVirtualItems().map((v) => {
            const span = data.spans[v.index];
            if (!span) return null;
            const active = span.span_id === selectedSpanId;
            const barBg = barClass(span.status);
            return (
              <button
                key={span.span_id}
                onClick={() => onSelectSpan(span.span_id)}
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  transform: `translateY(${v.start}px)`,
                  width: "100%",
                  height: ROW_HEIGHT,
                  display: "grid",
                  gridTemplateColumns: `${NAME_COL_PX}px 1fr 90px`,
                  gap: 12,
                  alignItems: "center",
                  padding: "0 12px",
                  border: 0,
                  borderBottom: "1px solid var(--rule-2)",
                  background: active ? "var(--panel)" : "transparent",
                  borderLeft: active
                    ? "2px solid var(--accent)"
                    : "2px solid transparent",
                  cursor: "pointer",
                  textTransform: "lowercase",
                  fontFamily: "var(--font-mono)",
                  textAlign: "left",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    paddingLeft: span.depth * INDENT_PX,
                    overflow: "hidden",
                  }}
                >
                  <span
                    className={`status-dot ${span.status === "error" ? "err" : span.status === "unset" ? "idle" : "ok"}`}
                  />
                  <span
                    className="mono"
                    style={{
                      fontSize: 12,
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      color: "var(--ink)",
                    }}
                  >
                    {span.name}
                  </span>
                  {span.service_name && (
                    <span
                      className="mono"
                      style={{
                        fontSize: 10,
                        color: "var(--ink-ghost)",
                      }}
                    >
                      {span.service_name}
                    </span>
                  )}
                </div>
                <div
                  className="waterfall-track"
                  style={{
                    position: "relative",
                    height: 6,
                  }}
                >
                  <span
                    className={`waterfall-bar ${barBg}`}
                    style={{
                      position: "absolute",
                      left: `${span.start_percent}%`,
                      width: `${Math.max(0.5, span.width_percent)}%`,
                      top: 0,
                      bottom: 0,
                    }}
                  />
                </div>
                <span
                  className="mono"
                  style={{
                    fontSize: 11,
                    color: "var(--ink-faint)",
                    fontVariantNumeric: "tabular-nums",
                    textAlign: "right",
                  }}
                >
                  {fmtDuration(span.duration_ms)}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
