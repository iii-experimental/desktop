/*
 * Engine transport for the Traces page.
 * Calls go through the shared iii-browser-sdk client at iii-client.ts.
 */

import { getIiiClient } from "./iii-client";

export interface SpanEvent {
  name: string;
  timestamp_unix_nano: number;
  attributes:
    | Array<[string, unknown]>
    | Record<string, unknown>
    | undefined;
}

export interface SpanLink {
  trace_id: string;
  span_id: string;
  attributes:
    | Array<[string, unknown]>
    | Record<string, unknown>
    | undefined;
}

export interface StoredSpan {
  trace_id: string;
  span_id: string;
  parent_span_id?: string;
  name: string;
  kind?: string;
  start_time_unix_nano: number;
  end_time_unix_nano: number;
  status: string;
  attributes:
    | Array<[string, unknown]>
    | Record<string, unknown>
    | undefined;
  events: SpanEvent[];
  links: SpanLink[];
  flags?: number;
  service_name?: string;
  resource?: Record<string, unknown>;
}

export interface SpanTreeNode extends StoredSpan {
  children: SpanTreeNode[];
}

export interface TracesFilterParams {
  trace_id?: string;
  service_name?: string;
  name?: string;
  status?: "ok" | "error" | "unset";
  span_id?: string;
  parent_span_id?: string | null;
  search_all_spans?: boolean;
  offset?: number;
  limit?: number;
  include_internal?: boolean;
}

export interface TracesResponse {
  spans: StoredSpan[];
  total: number;
  offset: number;
  limit: number;
}

export interface TraceTreeResponse {
  roots: SpanTreeNode[];
}

export interface TracesGroupByParams {
  group_by: "session" | "function" | "message";
  limit?: number;
}

export interface TracesGroupByResponse {
  groups: Array<{
    key: string;
    label: string;
    count: number;
    error_count: number;
    avg_duration_ms?: number;
  }>;
}

const FNS = {
  list: "engine::traces::list",
  tree: "engine::traces::tree",
  clear: "engine::traces::clear",
  groupBy: "engine::traces::group_by",
} as const;

function stripUndefined<T extends Record<string, unknown>>(obj: T): T {
  return Object.fromEntries(
    Object.entries(obj).filter(([, v]) => v !== undefined),
  ) as T;
}

export function isMemoryExporterMissing(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const code = (err as { code?: string }).code;
  return code === "memory_exporter_not_enabled";
}

export async function fetchTraces(
  options: TracesFilterParams = {},
): Promise<TracesResponse> {
  const offset = options.offset ?? 0;
  const limit = options.limit ?? 200;
  const payload = stripUndefined({ ...options, offset, limit });
  const client = await getIiiClient();
  return client.call<TracesResponse>(FNS.list, payload);
}

export async function fetchTraceTree(
  traceId: string,
): Promise<TraceTreeResponse> {
  const client = await getIiiClient();
  return client.call<TraceTreeResponse>(FNS.tree, { trace_id: traceId });
}

export async function clearTraces(): Promise<{ success: boolean }> {
  const client = await getIiiClient();
  await client.call(FNS.clear, {});
  return { success: true };
}

export async function fetchTracesGroupBy(
  params: TracesGroupByParams,
): Promise<TracesGroupByResponse> {
  const client = await getIiiClient();
  return client.call<TracesGroupByResponse>(
    FNS.groupBy,
    params as unknown as Record<string, unknown>,
  );
}
