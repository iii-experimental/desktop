import { useMemo } from "react";
import {
  Background,
  ReactFlow,
  type Edge,
  type Node,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import dagre from "dagre";
import type {
  VisualizationSpan,
  WaterfallData,
} from "../../lib/trace-transform";

interface Props {
  data: WaterfallData;
  selectedSpanId: string | null;
  onSelectSpan: (spanId: string) => void;
}

const NODE_W = 180;
const NODE_H = 56;

function layout(nodes: Node[], edges: Edge[]) {
  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({ rankdir: "TB", nodesep: 24, ranksep: 32 });
  for (const n of nodes) g.setNode(n.id, { width: NODE_W, height: NODE_H });
  for (const e of edges) g.setEdge(e.source, e.target);
  dagre.layout(g);
  return nodes.map((n) => {
    const pos = g.node(n.id);
    return {
      ...n,
      position: { x: (pos?.x ?? 0) - NODE_W / 2, y: (pos?.y ?? 0) - NODE_H / 2 },
    };
  });
}

export function FlowView({ data, selectedSpanId, onSelectSpan }: Props) {
  const { nodes, edges } = useMemo(() => {
    const rawNodes: Node[] = data.spans.map((span) => ({
      id: span.span_id,
      position: { x: 0, y: 0 },
      data: { span, selected: span.span_id === selectedSpanId },
      type: "span",
      style: { width: NODE_W },
    }));
    const edges: Edge[] = [];
    for (const span of data.spans) {
      if (!span.parent_span_id) continue;
      edges.push({
        id: `${span.parent_span_id}-${span.span_id}`,
        source: span.parent_span_id,
        target: span.span_id,
        style: { stroke: "var(--rule)", strokeWidth: 1 },
      });
    }
    return { nodes: layout(rawNodes, edges), edges };
  }, [data, selectedSpanId]);

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
        nodeTypes={{ span: SpanNode }}
        onNodeClick={(_, n) => onSelectSpan(n.id)}
        fitView
        proOptions={{ hideAttribution: true }}
      >
        <Background gap={16} color="var(--rule-2)" />
      </ReactFlow>
    </div>
  );
}

function SpanNode({
  data,
}: {
  data: { span: VisualizationSpan; selected: boolean };
}) {
  const { span, selected } = data;
  const isError = span.status === "error";
  return (
    <div
      style={{
        background: "var(--bg)",
        border: `1px solid ${
          isError ? "var(--alert)" : selected ? "var(--accent)" : "var(--rule)"
        }`,
        borderLeft: selected
          ? "2px solid var(--accent)"
          : isError
            ? "2px solid var(--alert)"
            : "1px solid var(--rule)",
        padding: "5px 9px",
        fontFamily: "var(--font-mono)",
        fontSize: 11,
        color: "var(--ink)",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}
      >
        {span.name}
      </div>
      <div
        style={{
          color: "var(--ink-faint)",
          fontSize: 10,
          fontVariantNumeric: "tabular-nums",
          marginTop: 2,
        }}
      >
        {span.duration_ms < 1
          ? `${(span.duration_ms * 1000).toFixed(0)}µs`
          : `${span.duration_ms.toFixed(1)}ms`}
      </div>
    </div>
  );
}
