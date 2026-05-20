/*
 * Span transformation utilities ported from
 * workers/console/web/src/pages/Traces/lib/traceTransform.ts.
 *
 * Iterative depth + DFS flatten on purpose: 8k+ span traces blow V8's
 * call stack via naive recursion and a spread-argument cap.
 */

import type { SpanTreeNode, StoredSpan } from "./traces-api";

export interface VisualizationSpan {
  name: string;
  span_id: string;
  parent_span_id?: string;
  trace_id: string;
  duration_ms: number;
  status: "ok" | "error" | "unset";
  depth: number;
  start_percent: number;
  width_percent: number;
  attributes: Record<string, unknown>;
  events: StoredSpan["events"];
  links: StoredSpan["links"];
  kind?: string;
  service_name?: string;
  flags?: number;
}

export interface WaterfallData {
  spans: VisualizationSpan[];
  total_duration_ms: number;
  span_count: number;
}

const NANO_THRESHOLD = 4102444800000;

export function toMs(timestamp: number): number {
  if (!Number.isFinite(timestamp)) return 0;
  return timestamp > NANO_THRESHOLD ? timestamp / 1_000_000 : timestamp;
}

export function calculateDurationMs(
  startTime: number,
  endTime: number,
): number {
  const startMs = toMs(startTime);
  const endMs = toMs(endTime);
  const duration = endMs - startMs;
  return Number.isFinite(duration) && duration >= 0 ? duration : 0;
}

function getSpanStatus(
  status: StoredSpan["status"],
): "ok" | "error" | "unset" {
  if (!status) return "unset";
  const lower = String(status).toLowerCase();
  if (lower === "error" || lower === "2") return "error";
  if (lower === "ok" || lower === "1") return "ok";
  if (lower === "unset" || lower === "0") return "unset";
  return "unset";
}

function attributesToRecord(
  attributes:
    | Array<[string, unknown]>
    | Record<string, unknown>
    | undefined,
): Record<string, unknown> {
  if (!attributes) return Object.create(null) as Record<string, unknown>;
  const record: Record<string, unknown> = Object.create(null);
  if (!Array.isArray(attributes)) {
    for (const [key, value] of Object.entries(attributes)) {
      record[key] = value;
    }
    return record;
  }
  for (const item of attributes) {
    if (Array.isArray(item) && item.length >= 2) {
      record[String(item[0])] = item[1];
    }
  }
  return record;
}

function calculateDepths(spans: StoredSpan[]): Map<string, number> {
  const depths = new Map<string, number>();
  const spanMap = new Map(spans.map((s) => [s.span_id, s]));
  for (const seed of spans) {
    if (depths.has(seed.span_id)) continue;
    const chain: StoredSpan[] = [];
    const visiting = new Set<string>();
    let cursor: StoredSpan | undefined = seed;
    while (
      cursor !== undefined &&
      !depths.has(cursor.span_id) &&
      !visiting.has(cursor.span_id)
    ) {
      visiting.add(cursor.span_id);
      chain.push(cursor);
      const parentId: string | undefined = cursor.parent_span_id;
      cursor = parentId !== undefined ? spanMap.get(parentId) : undefined;
    }
    let base =
      cursor !== undefined && depths.has(cursor.span_id)
        ? (depths.get(cursor.span_id) ?? 0)
        : -1;
    for (let i = chain.length - 1; i >= 0; i--) {
      base += 1;
      depths.set(chain[i].span_id, base);
    }
  }
  return depths;
}

export function toWaterfallData(
  spans: StoredSpan[],
  traceId: string,
): WaterfallData | null {
  const traceSpans = spans.filter((s) => s.trace_id === traceId);
  if (traceSpans.length === 0) return null;
  let minStart = Number.POSITIVE_INFINITY;
  let maxEnd = Number.NEGATIVE_INFINITY;
  for (const s of traceSpans) {
    const start = toMs(s.start_time_unix_nano);
    const end = toMs(s.end_time_unix_nano);
    if (start < minStart) minStart = start;
    if (end > maxEnd) maxEnd = end;
  }
  const totalDurationMs = maxEnd - minStart;
  const depths = calculateDepths(traceSpans);
  const spanMap = new Map(traceSpans.map((s) => [s.span_id, s]));

  const visualSpans: VisualizationSpan[] = traceSpans.map((storedSpan) => {
    const durationMs = calculateDurationMs(
      storedSpan.start_time_unix_nano,
      storedSpan.end_time_unix_nano,
    );
    const startOffset = toMs(storedSpan.start_time_unix_nano) - minStart;
    const startPercent =
      totalDurationMs > 0 ? (startOffset / totalDurationMs) * 100 : 0;
    const widthPercent =
      totalDurationMs > 0 ? (durationMs / totalDurationMs) * 100 : 100;
    return {
      name: storedSpan.name,
      span_id: storedSpan.span_id,
      parent_span_id: storedSpan.parent_span_id,
      trace_id: storedSpan.trace_id,
      duration_ms: durationMs,
      status: getSpanStatus(storedSpan.status),
      depth: depths.get(storedSpan.span_id) ?? 0,
      start_percent: startPercent,
      width_percent: widthPercent,
      attributes: attributesToRecord(storedSpan.attributes),
      events: (storedSpan.events ?? []).map((e) => ({
        ...e,
        attributes: attributesToRecord(e.attributes),
      })),
      links: storedSpan.links ?? [],
      kind: storedSpan.kind,
      service_name:
        storedSpan.service_name ??
        ((storedSpan.resource?.["service.name"] as string | undefined) ??
          undefined),
      flags: storedSpan.flags,
    };
  });

  visualSpans.sort((a, b) => {
    const aStart = toMs(
      spanMap.get(a.span_id)?.start_time_unix_nano ?? 0,
    );
    const bStart = toMs(
      spanMap.get(b.span_id)?.start_time_unix_nano ?? 0,
    );
    if (aStart !== bStart) return aStart - bStart;
    return a.depth - b.depth;
  });

  return {
    spans: visualSpans,
    total_duration_ms: totalDurationMs,
    span_count: visualSpans.length,
  };
}

function flattenTree(
  nodes: SpanTreeNode[],
): Array<{ span: SpanTreeNode; depth: number }> {
  const result: Array<{ span: SpanTreeNode; depth: number }> = [];
  const stack: Array<{ node: SpanTreeNode; depth: number }> = [];
  for (let i = nodes.length - 1; i >= 0; i--) {
    stack.push({ node: nodes[i], depth: 0 });
  }
  while (stack.length > 0) {
    const frame = stack.pop();
    if (!frame) break;
    const { node, depth } = frame;
    result.push({ span: node, depth });
    const children = node.children;
    if (children && children.length > 0) {
      for (let i = children.length - 1; i >= 0; i--) {
        stack.push({ node: children[i], depth: depth + 1 });
      }
    }
  }
  return result;
}

export function treeToWaterfallData(
  roots: SpanTreeNode[],
): WaterfallData | null {
  if (!roots || roots.length === 0) return null;
  const flatSpans = flattenTree(roots);
  if (flatSpans.length === 0) return null;

  let minStart = Number.POSITIVE_INFINITY;
  let maxEnd = Number.NEGATIVE_INFINITY;
  for (const { span } of flatSpans) {
    const start = toMs(span.start_time_unix_nano);
    const end = toMs(span.end_time_unix_nano);
    if (start < minStart) minStart = start;
    if (end > maxEnd) maxEnd = end;
  }
  const totalDurationMs = maxEnd - minStart;

  const visualSpans: VisualizationSpan[] = flatSpans.map(
    ({ span, depth }) => {
      const durationMs = calculateDurationMs(
        span.start_time_unix_nano,
        span.end_time_unix_nano,
      );
      const startOffset = toMs(span.start_time_unix_nano) - minStart;
      const startPercent =
        totalDurationMs > 0 ? (startOffset / totalDurationMs) * 100 : 0;
      const widthPercent =
        totalDurationMs > 0 ? (durationMs / totalDurationMs) * 100 : 100;
      return {
        name: span.name,
        span_id: span.span_id,
        parent_span_id: span.parent_span_id,
        trace_id: span.trace_id,
        duration_ms: durationMs,
        status: getSpanStatus(span.status),
        depth,
        start_percent: startPercent,
        width_percent: widthPercent,
        attributes: attributesToRecord(span.attributes ?? []),
        events: (span.events ?? []).map((e) => ({
          ...e,
          attributes: attributesToRecord(e.attributes),
        })),
        links: span.links ?? [],
        kind: span.kind,
        service_name:
          span.service_name ??
          ((span.resource?.["service.name"] as string | undefined) ??
            undefined),
        flags: span.flags,
      };
    },
  );

  return {
    spans: visualSpans,
    total_duration_ms: totalDurationMs,
    span_count: visualSpans.length,
  };
}
