/*
 * Two-pane drag-resize for trace list (left) and span panel (right),
 * with a central detail column that absorbs remaining space.
 * Adapted from workers/console/web/src/pages/Traces/hooks/useResizablePanels.ts.
 */

import { useCallback, useEffect, useRef, useState } from "react";

const TRACE_PANEL_DEFAULT = 360;
const SPAN_PANEL_DEFAULT = 360;
const PANEL_MIN_WIDTH = 240;
const NEIGHBOR_MIN_WIDTH = 240;

const KEY_TRACE = "iii-desktop:traces:list-width";
const KEY_SPAN = "iii-desktop:traces:span-width";
const KEY_SPAN_OPEN = "iii-desktop:traces:span-open";

function readNumber(key: string, fallback: number): number {
  if (typeof window === "undefined") return fallback;
  const stored = Number(window.localStorage.getItem(key));
  return Number.isFinite(stored) && stored > 0 ? stored : fallback;
}

function writeNumber(key: string, value: number): void {
  try {
    window.localStorage.setItem(key, String(value));
  } catch {
    // storage may be blocked
  }
}

export interface UseResizablePanels {
  containerRef: React.RefObject<HTMLDivElement | null>;
  traceWidth: number;
  spanWidth: number;
  spanOpen: boolean;
  setSpanOpen: (open: boolean) => void;
  onTraceDragStart: (e: React.MouseEvent) => void;
  onSpanDragStart: (e: React.MouseEvent) => void;
  isResizing: boolean;
}

export function useResizablePanels(): UseResizablePanels {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [traceWidth, setTraceWidth] = useState<number>(() =>
    readNumber(KEY_TRACE, TRACE_PANEL_DEFAULT),
  );
  const [spanWidth, setSpanWidth] = useState<number>(() =>
    readNumber(KEY_SPAN, SPAN_PANEL_DEFAULT),
  );
  const [spanOpen, setSpanOpenState] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem(KEY_SPAN_OPEN) === "1";
  });
  const [isResizing, setIsResizing] = useState(false);
  const startRef = useRef<{
    target: "trace" | "span";
    x: number;
    w: number;
  } | null>(null);

  const setSpanOpen = useCallback((open: boolean) => {
    setSpanOpenState(open);
    try {
      window.localStorage.setItem(KEY_SPAN_OPEN, open ? "1" : "0");
    } catch {
      // storage may be blocked
    }
  }, []);

  const clamp = useCallback(
    (target: "trace" | "span", next: number): number => {
      const container = containerRef.current;
      const total = container?.getBoundingClientRect().width ?? 1200;
      const other = target === "trace" ? spanWidth : traceWidth;
      const otherWidth = spanOpen || target === "trace" ? other : 0;
      const max = Math.max(
        PANEL_MIN_WIDTH,
        total - NEIGHBOR_MIN_WIDTH - otherWidth - 12,
      );
      return Math.max(PANEL_MIN_WIDTH, Math.min(max, next));
    },
    [traceWidth, spanWidth, spanOpen],
  );

  useEffect(() => {
    if (!isResizing) return;
    const onMove = (e: MouseEvent) => {
      const start = startRef.current;
      if (!start) return;
      const dx = e.clientX - start.x;
      if (start.target === "trace") {
        const next = clamp("trace", start.w + dx);
        setTraceWidth(next);
      } else {
        const next = clamp("span", start.w - dx);
        setSpanWidth(next);
      }
    };
    const onUp = () => {
      setIsResizing(false);
      writeNumber(KEY_TRACE, traceWidth);
      writeNumber(KEY_SPAN, spanWidth);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [isResizing, clamp, traceWidth, spanWidth]);

  const onTraceDragStart = useCallback(
    (e: React.MouseEvent) => {
      startRef.current = { target: "trace", x: e.clientX, w: traceWidth };
      setIsResizing(true);
    },
    [traceWidth],
  );

  const onSpanDragStart = useCallback(
    (e: React.MouseEvent) => {
      startRef.current = { target: "span", x: e.clientX, w: spanWidth };
      setIsResizing(true);
    },
    [spanWidth],
  );

  // Window resize → re-clamp both panels
  useEffect(() => {
    const onResize = () => {
      setTraceWidth((w) => clamp("trace", w));
      setSpanWidth((w) => clamp("span", w));
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [clamp]);

  return {
    containerRef,
    traceWidth,
    spanWidth,
    spanOpen,
    setSpanOpen,
    onTraceDragStart,
    onSpanDragStart,
    isResizing,
  };
}
