/*
 * Polling + newness tracking + hover-buffering for the trace list.
 * No @tanstack/react-query dep — we use a plain interval since this is
 * already inside a Tauri webview and we don't share cache across views.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { fetchTraces, isMemoryExporterMissing } from "./traces-api";
import type { StoredSpan, TracesFilterParams } from "./traces-api";
import { toMs } from "./trace-transform";

const DEFAULT_LIMIT = 200;
const POLL_INTERVAL_MS = 3000;

export interface TraceListItem {
  trace_id: string;
  root_op: string;
  status: "ok" | "error" | "pending";
  start_ms: number;
  end_ms: number;
  duration_ms: number;
  span_count: number;
  services: string[];
}

export interface UseTraceData {
  traces: TraceListItem[];
  spans: StoredSpan[];
  newTraceIds: Set<string>;
  acknowledgeNew: (traceId: string) => void;
  loading: boolean;
  paused: boolean;
  setPaused: (p: boolean) => void;
  refresh: () => void;
  clear: () => void;
  hasOtelConfigured: boolean;
  isHoveredRef: { current: boolean };
  flushPending: () => void;
  errorMessage: string | null;
}

function statusOf(spans: StoredSpan[]): "ok" | "error" | "pending" {
  if (spans.some((s) => String(s.status).toLowerCase() === "error"))
    return "error";
  return "ok";
}

function groupSpans(all: StoredSpan[]): TraceListItem[] {
  const byTrace = new Map<string, StoredSpan[]>();
  for (const s of all) {
    const arr = byTrace.get(s.trace_id) ?? [];
    arr.push(s);
    byTrace.set(s.trace_id, arr);
  }
  const rows: TraceListItem[] = [];
  for (const [trace_id, group] of byTrace) {
    const root = group.find((s) => !s.parent_span_id) ?? group[0];
    if (!root) continue;
    let minStart = Number.POSITIVE_INFINITY;
    let maxEnd = Number.NEGATIVE_INFINITY;
    for (const s of group) {
      const start = toMs(s.start_time_unix_nano);
      const end = toMs(s.end_time_unix_nano);
      if (start < minStart) minStart = start;
      if (end > maxEnd) maxEnd = end;
    }
    const services = Array.from(
      new Set(
        group
          .map(
            (s) =>
              s.service_name ??
              ((s.resource?.["service.name"] as string | undefined) ??
                undefined),
          )
          .filter((v): v is string => Boolean(v)),
      ),
    );
    rows.push({
      trace_id,
      root_op: root.name,
      status: statusOf(group),
      start_ms: minStart,
      end_ms: maxEnd,
      duration_ms: Math.max(0, maxEnd - minStart),
      span_count: group.length,
      services,
    });
  }
  rows.sort((a, b) => b.start_ms - a.start_ms);
  return rows;
}

function fingerprint(rows: TraceListItem[]): string {
  return rows.map((r) => `${r.trace_id}:${r.span_count}`).join("|");
}

export function useTraceData(
  filter: TracesFilterParams = {},
): UseTraceData {
  const [traces, setTraces] = useState<TraceListItem[]>([]);
  const [spans, setSpans] = useState<StoredSpan[]>([]);
  const [newTraceIds, setNewTraceIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [paused, setPaused] = useState(false);
  const [hasOtel, setHasOtel] = useState(true);
  const [errorMessage, setError] = useState<string | null>(null);

  const fingerprintRef = useRef<string>("");
  const prevIdsRef = useRef<Set<string>>(new Set());
  const isHoveredRef = useRef<boolean>(false);
  const pendingRef = useRef<{
    traces: TraceListItem[];
    spans: StoredSpan[];
  } | null>(null);

  const apply = useCallback((next: TraceListItem[], allSpans: StoredSpan[]) => {
    const ids = new Set(next.map((r) => r.trace_id));
    const fresh = new Set<string>();
    for (const id of ids) {
      if (!prevIdsRef.current.has(id)) fresh.add(id);
    }
    prevIdsRef.current = ids;
    setTraces(next);
    setSpans(allSpans);
    if (fresh.size > 0) {
      setNewTraceIds((prev) => {
        const merged = new Set(prev);
        for (const id of fresh) merged.add(id);
        return merged;
      });
    }
  }, []);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchTraces({
        ...filter,
        offset: 0,
        limit: DEFAULT_LIMIT,
      });
      setHasOtel(true);
      const next = groupSpans(result.spans ?? []);
      const fp = fingerprint(next);
      if (fp === fingerprintRef.current) return;
      fingerprintRef.current = fp;
      if (isHoveredRef.current) {
        pendingRef.current = { traces: next, spans: result.spans ?? [] };
      } else {
        apply(next, result.spans ?? []);
      }
    } catch (err) {
      if (isMemoryExporterMissing(err)) {
        setHasOtel(false);
      } else {
        setError(err instanceof Error ? err.message : String(err));
      }
    } finally {
      setLoading(false);
    }
  }, [apply, filter]);

  const flushPending = useCallback(() => {
    if (!pendingRef.current) return;
    apply(pendingRef.current.traces, pendingRef.current.spans);
    pendingRef.current = null;
  }, [apply]);

  const acknowledgeNew = useCallback((traceId: string) => {
    setNewTraceIds((prev) => {
      if (!prev.has(traceId)) return prev;
      const next = new Set(prev);
      next.delete(traceId);
      return next;
    });
  }, []);

  const clear = useCallback(async () => {
    const { clearTraces } = await import("./traces-api");
    await clearTraces();
    setTraces([]);
    setSpans([]);
    fingerprintRef.current = "";
    prevIdsRef.current = new Set();
    void refresh();
  }, [refresh]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (paused) return;
    const id = setInterval(() => void refresh(), POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [paused, refresh]);

  return {
    traces,
    spans,
    newTraceIds,
    acknowledgeNew,
    loading,
    paused,
    setPaused,
    refresh,
    clear,
    hasOtelConfigured: hasOtel,
    isHoveredRef,
    flushPending,
    errorMessage,
  };
}
