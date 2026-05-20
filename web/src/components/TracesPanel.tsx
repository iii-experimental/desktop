import { useEffect, useMemo, useState } from "react";
import {
  fetchTraceTree,
  isMemoryExporterMissing,
} from "../lib/traces-api";
import {
  toWaterfallData,
  treeToWaterfallData,
  type VisualizationSpan,
  type WaterfallData,
} from "../lib/trace-transform";
import { useResizablePanels } from "../lib/use-resizable-panels";
import { useTraceData } from "../lib/use-trace-data";
import { FlameGraph } from "./traces/FlameGraph";
import { FlowView } from "./traces/FlowView";
import { TraceList } from "./traces/TraceList";
import { TraceMap } from "./traces/TraceMap";
import { SpanPanel } from "./traces/SpanPanel";
import { ViewSwitcher, type TraceView } from "./traces/ViewSwitcher";
import { WaterfallChart } from "./traces/WaterfallChart";

export function TracesPanel() {
  const {
    traces,
    spans,
    newTraceIds,
    acknowledgeNew,
    loading,
    paused,
    setPaused,
    refresh,
    clear,
    hasOtelConfigured,
    isHoveredRef,
    flushPending,
    errorMessage,
  } = useTraceData();

  const {
    containerRef,
    traceWidth,
    spanWidth,
    spanOpen,
    setSpanOpen,
    onTraceDragStart,
    onSpanDragStart,
  } = useResizablePanels();

  const [selectedTraceId, setSelectedTraceId] = useState<string | null>(null);
  const [selectedSpanId, setSelectedSpanId] = useState<string | null>(null);
  const [view, setView] = useState<TraceView>("waterfall");
  const [traceTree, setTraceTree] = useState<WaterfallData | null>(null);
  const [treeError, setTreeError] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedTraceId) {
      setTraceTree(null);
      return;
    }
    let cancelled = false;
    setTreeError(null);
    void (async () => {
      try {
        const tree = await fetchTraceTree(selectedTraceId);
        if (cancelled) return;
        const fromTree = treeToWaterfallData(tree.roots ?? []);
        if (fromTree) {
          setTraceTree(fromTree);
          return;
        }
        // Fallback to flat span list filtered by trace id
        setTraceTree(toWaterfallData(spans, selectedTraceId));
      } catch (err) {
        if (cancelled) return;
        if (isMemoryExporterMissing(err)) {
          setTreeError("otel exporter not enabled");
          return;
        }
        // Fallback: derive from already-fetched spans
        setTraceTree(toWaterfallData(spans, selectedTraceId));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedTraceId, spans]);

  const selectedSpan = useMemo<VisualizationSpan | null>(() => {
    if (!traceTree || !selectedSpanId) return null;
    return traceTree.spans.find((s) => s.span_id === selectedSpanId) ?? null;
  }, [traceTree, selectedSpanId]);

  // Auto-open span panel on selection
  useEffect(() => {
    if (selectedSpanId && !spanOpen) setSpanOpen(true);
  }, [selectedSpanId, spanOpen, setSpanOpen]);

  const totals = useMemo(() => {
    const errs = traces.filter((r) => r.status === "error").length;
    return { count: traces.length, errors: errs };
  }, [traces]);

  return (
    <section
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
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "space-between",
          padding: "12px 18px 8px",
          borderBottom: "1px solid var(--rule)",
          background: "var(--bg)",
        }}
      >
        <div>
          <div
            style={{
              color: "var(--accent)",
              fontSize: 11,
              textTransform: "uppercase",
              letterSpacing: "0.18em",
              marginBottom: 2,
            }}
          >
            $ traces
          </div>
          <h2
            style={{
              margin: 0,
              fontSize: 22,
              fontWeight: 500,
              textTransform: "lowercase",
              letterSpacing: "-0.02em",
              display: "inline-flex",
              alignItems: "center",
              gap: 10,
            }}
          >
            traces
            {paused && (
              <span
                style={{
                  fontSize: 11,
                  letterSpacing: "0.18em",
                  color: "var(--ink-faint)",
                  textTransform: "uppercase",
                  border: "1px solid var(--rule)",
                  padding: "1px 8px",
                }}
              >
                paused
              </span>
            )}
          </h2>
        </div>
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <span
            className="mono"
            style={{
              fontSize: 11,
              color: "var(--ink-faint)",
              marginRight: 8,
            }}
          >
            <span className="pill mono info" style={{ fontSize: 11 }}>
              # {totals.count} traces
            </span>{" "}
            <span className="pill mono err" style={{ fontSize: 11 }}>
              ● {totals.errors} errors
            </span>
          </span>
          <button
            onClick={() => setPaused(!paused)}
            style={{ padding: "4px 12px", fontSize: 12 }}
          >
            {paused ? "▷ resume" : "⏸ pause"}
          </button>
          <button
            onClick={() => void refresh()}
            disabled={loading}
            style={{ padding: "4px 12px", fontSize: 12 }}
          >
            ↻ refresh
          </button>
          <button
            onClick={() => void clear()}
            style={{ padding: "4px 12px", fontSize: 12 }}
          >
            clear
          </button>
        </div>
      </header>

      {!hasOtelConfigured && (
        <div
          style={{
            margin: "12px 18px",
            border: "1px solid var(--warn)",
            padding: 12,
            color: "var(--warn)",
            fontSize: 12,
            lineHeight: 1.6,
          }}
        >
          otel exporter not enabled. add{" "}
          <code style={{ background: "var(--panel)", padding: "0 4px" }}>
            iii-observability
          </code>{" "}
          worker with{" "}
          <code style={{ background: "var(--panel)", padding: "0 4px" }}>
            exporter: memory
          </code>{" "}
          and restart the engine.
        </div>
      )}

      {errorMessage && (
        <div
          style={{
            margin: "12px 18px",
            border: "1px solid var(--alert)",
            padding: 8,
            color: "var(--alert)",
            fontSize: 12,
          }}
        >
          {errorMessage}
        </div>
      )}

      <div
        ref={containerRef as React.RefObject<HTMLDivElement>}
        style={{
          flex: 1,
          display: "flex",
          minHeight: 0,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            width: traceWidth,
            flexShrink: 0,
            borderRight: "1px solid var(--rule)",
            display: "flex",
            flexDirection: "column",
            minHeight: 0,
          }}
        >
          <TraceList
            items={traces}
            selectedId={selectedTraceId}
            onSelect={(id) => {
              setSelectedTraceId(id);
              setSelectedSpanId(null);
            }}
            newIds={newTraceIds}
            onAcknowledgeNew={acknowledgeNew}
            onHover={(hovered) => {
              isHoveredRef.current = hovered;
              if (!hovered) flushPending();
            }}
          />
        </div>
        <button
          aria-label="resize trace list"
          onMouseDown={onTraceDragStart}
          className="resize-handle"
          style={{ border: 0, padding: 0 }}
        />
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            minHeight: 0,
            minWidth: 0,
          }}
        >
          <div
            style={{
              padding: "8px 12px",
              borderBottom: "1px solid var(--rule)",
              background: "var(--bg)",
              display: "flex",
              alignItems: "center",
              gap: 12,
            }}
          >
            <ViewSwitcher value={view} onChange={setView} />
            <div
              className="mono"
              style={{
                fontSize: 11,
                color: "var(--ink-ghost)",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                flex: 1,
              }}
            >
              {selectedTraceId
                ? selectedTraceId
                : "select a trace from the list"}
            </div>
            {!spanOpen && selectedTraceId && (
              <button
                onClick={() => setSpanOpen(true)}
                style={{
                  padding: "3px 10px",
                  fontSize: 11,
                  background: "var(--bg)",
                  border: "1px solid var(--rule)",
                  color: "var(--ink-faint)",
                  textTransform: "lowercase",
                }}
              >
                + attributes
              </button>
            )}
          </div>
          <div style={{ flex: 1, overflow: "hidden", minHeight: 0 }}>
            {!selectedTraceId && (
              <EmptyDetail message="pick a trace on the left to view its waterfall" />
            )}
            {selectedTraceId && treeError && (
              <EmptyDetail message={treeError} />
            )}
            {selectedTraceId && traceTree && view === "waterfall" && (
              <WaterfallChart
                data={traceTree}
                selectedSpanId={selectedSpanId}
                onSelectSpan={setSelectedSpanId}
              />
            )}
            {selectedTraceId && traceTree && view === "flame" && (
              <FlameGraph
                data={traceTree}
                selectedSpanId={selectedSpanId}
                onSelectSpan={setSelectedSpanId}
              />
            )}
            {selectedTraceId && traceTree && view === "map" && (
              <TraceMap data={traceTree} />
            )}
            {selectedTraceId && traceTree && view === "flow" && (
              <FlowView
                data={traceTree}
                selectedSpanId={selectedSpanId}
                onSelectSpan={setSelectedSpanId}
              />
            )}
          </div>
        </div>
        {spanOpen && (
          <>
            <button
              aria-label="resize span panel"
              onMouseDown={onSpanDragStart}
              className="resize-handle"
              style={{ border: 0, padding: 0 }}
            />
            <div
              style={{
                width: spanWidth,
                flexShrink: 0,
                minHeight: 0,
                display: "flex",
                flexDirection: "column",
              }}
            >
              <SpanPanel
                span={selectedSpan}
                onClose={() => setSpanOpen(false)}
                onSelectSpan={setSelectedSpanId}
              />
            </div>
          </>
        )}
      </div>
    </section>
  );
}

function EmptyDetail({ message }: { message: string }) {
  return (
    <div
      style={{
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "var(--ink-ghost)",
        fontSize: 12,
        textTransform: "lowercase",
        letterSpacing: "0.06em",
        padding: 24,
        textAlign: "center",
      }}
    >
      {message}
    </div>
  );
}
