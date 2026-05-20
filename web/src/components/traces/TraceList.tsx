import { useEffect, useRef } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import type { TraceListItem } from "../../lib/use-trace-data";

interface Props {
  items: TraceListItem[];
  selectedId: string | null;
  onSelect: (traceId: string) => void;
  newIds: Set<string>;
  onAcknowledgeNew: (id: string) => void;
  onHover: (hovered: boolean) => void;
}

const ROW_HEIGHT = 56;

function relative(ms: number): string {
  const diff = Date.now() - ms;
  if (diff < 1000) return "now";
  if (diff < 60_000) return `${Math.floor(diff / 1000)}s`;
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h`;
  return `${Math.floor(diff / 86_400_000)}d`;
}

function fmtDuration(ms: number): string {
  if (ms < 1) return `${(ms * 1000).toFixed(0)}µs`;
  if (ms < 1000) return `${ms.toFixed(1)}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

export function TraceList({
  items,
  selectedId,
  onSelect,
  newIds,
  onAcknowledgeNew,
  onHover,
}: Props) {
  const parentRef = useRef<HTMLDivElement | null>(null);

  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 12,
  });

  // Reset scroll when items reorder substantially (e.g. cleared)
  useEffect(() => {
    if (items.length === 0) parentRef.current?.scrollTo({ top: 0 });
  }, [items.length]);

  return (
    <div
      ref={parentRef}
      onMouseEnter={() => onHover(true)}
      onMouseLeave={() => onHover(false)}
      style={{
        height: "100%",
        overflowY: "auto",
        background: "var(--bg)",
        fontFamily: "var(--font-mono)",
      }}
    >
      <div
        style={{
          height: virtualizer.getTotalSize(),
          position: "relative",
        }}
      >
        {virtualizer.getVirtualItems().map((v) => {
          const item = items[v.index];
          if (!item) return null;
          const active = item.trace_id === selectedId;
          const isNew = newIds.has(item.trace_id);
          const dotCls =
            item.status === "error"
              ? "err"
              : item.status === "pending"
                ? "warn"
                : "ok";
          return (
            <button
              key={item.trace_id}
              onClick={() => onSelect(item.trace_id)}
              onAnimationEnd={() => isNew && onAcknowledgeNew(item.trace_id)}
              className={isNew ? "trace-flash" : undefined}
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                transform: `translateY(${v.start}px)`,
                width: "100%",
                height: ROW_HEIGHT,
                textAlign: "left",
                background: active ? "var(--panel)" : "transparent",
                border: 0,
                borderBottom: "1px solid var(--rule-2)",
                borderLeft: active
                  ? "2px solid var(--accent)"
                  : "2px solid transparent",
                padding: "8px 12px",
                color: "var(--ink)",
                display: "flex",
                flexDirection: "column",
                gap: 4,
                cursor: "pointer",
                textTransform: "lowercase",
              }}
            >
              <div
                style={{ display: "flex", alignItems: "center", gap: 8 }}
              >
                <span className={`status-dot ${dotCls}`} />
                <span
                  className="mono"
                  style={{
                    fontSize: 12,
                    flex: 1,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    color: "var(--ink)",
                  }}
                >
                  {item.root_op}
                </span>
                <span
                  className="mono"
                  style={{
                    fontSize: 11,
                    color: "var(--ink-faint)",
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  {fmtDuration(item.duration_ms)}
                </span>
              </div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  color: "var(--ink-ghost)",
                  fontSize: 11,
                }}
              >
                <span className="mono">{item.trace_id.slice(0, 8)}</span>
                <span>·</span>
                <span
                  className="mono"
                  style={{
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    flex: 1,
                  }}
                >
                  {item.services.join(",") || "—"}
                </span>
                <span className="mono">{relative(item.start_ms)}</span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
