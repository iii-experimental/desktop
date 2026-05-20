import { useMemo } from "react";
import {
  Background,
  ReactFlow,
  type Edge,
  type Node,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import type { WaterfallData } from "../../lib/trace-transform";

interface Props {
  data: WaterfallData;
}

interface ServiceStat {
  service: string;
  spans: number;
  errors: number;
  total_ms: number;
}

export function TraceMap({ data }: Props) {
  const { nodes, edges } = useMemo(() => {
    const stats = new Map<string, ServiceStat>();
    for (const s of data.spans) {
      const key = s.service_name ?? "—";
      const entry =
        stats.get(key) ?? { service: key, spans: 0, errors: 0, total_ms: 0 };
      entry.spans += 1;
      entry.total_ms += s.duration_ms;
      if (s.status === "error") entry.errors += 1;
      stats.set(key, entry);
    }
    const services = Array.from(stats.values());
    const nodes: Node[] = services.map((stat, i) => ({
      id: stat.service,
      position: {
        x: 40 + (i % 3) * 220,
        y: 40 + Math.floor(i / 3) * 140,
      },
      data: { stat },
      type: "service",
      style: { width: 200 },
    }));

    // Edges: child-service called by parent-service (best-effort)
    const parentService = (id: string) =>
      data.spans.find((s) => s.span_id === id)?.service_name ?? "—";
    const edgeKeys = new Set<string>();
    const edges: Edge[] = [];
    for (const s of data.spans) {
      if (!s.parent_span_id) continue;
      const from = parentService(s.parent_span_id);
      const to = s.service_name ?? "—";
      if (from === to) continue;
      const key = `${from}->${to}`;
      if (edgeKeys.has(key)) continue;
      edgeKeys.add(key);
      edges.push({
        id: key,
        source: from,
        target: to,
        style: { stroke: "var(--rule)", strokeWidth: 1 },
        animated: false,
      });
    }
    return { nodes, edges };
  }, [data]);

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        background: "var(--bg)",
        fontFamily: "var(--font-mono)",
      }}
    >
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={{ service: ServiceNode }}
        fitView
        proOptions={{ hideAttribution: true }}
      >
        <Background gap={20} color="var(--rule-2)" />
      </ReactFlow>
    </div>
  );
}

function ServiceNode({ data }: { data: { stat: ServiceStat } }) {
  const stat = data.stat;
  const hasError = stat.errors > 0;
  return (
    <div
      style={{
        background: "var(--bg)",
        border: `1px solid ${hasError ? "var(--alert)" : "var(--rule)"}`,
        fontFamily: "var(--font-mono)",
        fontSize: 11,
      }}
    >
      <div
        style={{
          padding: "5px 10px",
          background: "var(--panel)",
          borderBottom: "1px solid var(--rule)",
          color: hasError ? "var(--alert)" : "var(--ink)",
          textTransform: "uppercase",
          letterSpacing: "0.18em",
          fontSize: 10,
        }}
      >
        {stat.service}
      </div>
      <div
        style={{
          padding: "8px 10px",
          display: "grid",
          gridTemplateColumns: "1fr auto",
          gap: 4,
          color: "var(--ink-faint)",
        }}
      >
        <span>spans</span>
        <span className="mono" style={{ color: "var(--ink)" }}>
          {stat.spans}
        </span>
        <span>errors</span>
        <span
          className="mono"
          style={{ color: hasError ? "var(--alert)" : "var(--ink)" }}
        >
          {stat.errors}
        </span>
        <span>total</span>
        <span className="mono" style={{ color: "var(--ink)" }}>
          {stat.total_ms.toFixed(1)}ms
        </span>
      </div>
    </div>
  );
}
