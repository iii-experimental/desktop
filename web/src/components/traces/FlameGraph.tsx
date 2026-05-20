import { useEffect, useRef } from "react";
import type { WaterfallData } from "../../lib/trace-transform";

interface Props {
  data: WaterfallData;
  selectedSpanId: string | null;
  onSelectSpan: (spanId: string) => void;
}

const ROW_HEIGHT = 18;
const PAD_X = 12;
const PAD_Y = 12;

function getCssVar(name: string): string {
  if (typeof window === "undefined") return "#000";
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || "#000";
}

function depthColor(depth: number, isError: boolean): string {
  if (isError) return getCssVar("--alert");
  const cycle = depth % 4;
  if (cycle === 0) return getCssVar("--ink");
  if (cycle === 1) return getCssVar("--ink-faint");
  if (cycle === 2) return getCssVar("--ink-ghost");
  return getCssVar("--rule");
}

export function FlameGraph({ data, selectedSpanId, onSelectSpan }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const dataRef = useRef(data);
  dataRef.current = data;

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrapper = wrapperRef.current;
    if (!canvas || !wrapper) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const draw = () => {
      const rect = wrapper.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const bg = getCssVar("--bg");
      const rule = getCssVar("--rule-2");
      const inkFaint = getCssVar("--ink-faint");
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, rect.width, rect.height);

      const innerW = rect.width - PAD_X * 2;
      const innerH = rect.height - PAD_Y * 2;
      const maxDepth = Math.max(
        1,
        dataRef.current.spans.reduce((m, s) => Math.max(m, s.depth), 0) + 1,
      );
      const rowH = Math.max(ROW_HEIGHT, Math.min(28, innerH / maxDepth));
      const totalH = rowH * maxDepth;

      // Grid lines at 25/50/75%
      ctx.strokeStyle = rule;
      ctx.lineWidth = 1;
      for (let i = 1; i < 4; i++) {
        const x = PAD_X + (innerW * i) / 4;
        ctx.beginPath();
        ctx.moveTo(Math.floor(x) + 0.5, PAD_Y);
        ctx.lineTo(Math.floor(x) + 0.5, PAD_Y + totalH);
        ctx.stroke();
      }

      ctx.font = "11px 'Chivo Mono', monospace";
      ctx.textBaseline = "middle";

      for (const span of dataRef.current.spans) {
        const x = PAD_X + (innerW * span.start_percent) / 100;
        const w = Math.max(1, (innerW * span.width_percent) / 100);
        const y = PAD_Y + span.depth * rowH;
        const h = rowH - 2;
        const isError = span.status === "error";
        ctx.fillStyle = depthColor(span.depth, isError);
        ctx.fillRect(x, y, w, h);
        if (span.span_id === selectedSpanId) {
          ctx.strokeStyle = getCssVar("--accent");
          ctx.lineWidth = 2;
          ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
        }
        if (w > 48) {
          ctx.fillStyle = bg;
          const text = span.name;
          const truncated =
            text.length > w / 6 ? text.slice(0, Math.floor(w / 6) - 1) + "…" : text;
          ctx.fillText(truncated, x + 4, y + h / 2);
        }
      }
      // Legend
      ctx.fillStyle = inkFaint;
      ctx.font = "10px 'Chivo Mono', monospace";
      ctx.fillText(`${dataRef.current.span_count} spans`, PAD_X, rect.height - 6);
    };

    draw();

    const handleClick = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      const innerW = rect.width - PAD_X * 2;
      const innerH = rect.height - PAD_Y * 2;
      const maxDepth = Math.max(
        1,
        dataRef.current.spans.reduce((m, s) => Math.max(m, s.depth), 0) + 1,
      );
      const rowH = Math.max(ROW_HEIGHT, Math.min(28, innerH / maxDepth));
      for (const span of dataRef.current.spans) {
        const x = PAD_X + (innerW * span.start_percent) / 100;
        const w = Math.max(1, (innerW * span.width_percent) / 100);
        const y = PAD_Y + span.depth * rowH;
        const h = rowH - 2;
        if (mx >= x && mx <= x + w && my >= y && my <= y + h) {
          onSelectSpan(span.span_id);
          return;
        }
      }
    };

    canvas.addEventListener("click", handleClick);
    const ro = new ResizeObserver(draw);
    ro.observe(wrapper);
    const theme = new MutationObserver(draw);
    theme.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });
    return () => {
      canvas.removeEventListener("click", handleClick);
      ro.disconnect();
      theme.disconnect();
    };
  }, [selectedSpanId, onSelectSpan]);

  return (
    <div
      ref={wrapperRef}
      style={{
        width: "100%",
        height: "100%",
        background: "var(--bg)",
        overflow: "hidden",
      }}
    >
      <canvas ref={canvasRef} />
    </div>
  );
}
