import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";

interface Props {
  width: number;
  onWidthChange: (next: number) => void;
  onClose: () => void;
  children: ReactNode;
}

const MIN = 320;
const NEIGHBOR_MIN = 360;

function maxWidth(): number {
  if (typeof window === "undefined") return 720;
  return Math.max(MIN, window.innerWidth - NEIGHBOR_MIN);
}

const clamp = (w: number, max: number) => Math.max(MIN, Math.min(max, w));

export function ChatDock({ width, onWidthChange, onClose, children }: Props) {
  const [isResizing, setIsResizing] = useState(false);
  const [max, setMax] = useState<number>(() => maxWidth());
  const start = useRef({ x: 0, w: width, max });

  useEffect(() => {
    const onResize = () => setMax(maxWidth());
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    if (!isResizing) return;
    const onMove = (e: MouseEvent) => {
      const dx = e.clientX - start.current.x;
      onWidthChange(clamp(start.current.w + dx, start.current.max));
    };
    const onUp = () => setIsResizing(false);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [isResizing, onWidthChange]);

  const onDragStart = useCallback(
    (e: React.MouseEvent) => {
      start.current = { x: e.clientX, w: width, max };
      setIsResizing(true);
    },
    [width, max],
  );

  return (
    <aside
      style={{
        width: clamp(width, max),
        height: "100%",
        position: "relative",
        background: "var(--bg)",
        borderRight: "1px solid var(--rule)",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        flexShrink: 0,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "6px 12px",
          borderBottom: "1px solid var(--rule)",
          background: "var(--panel)",
          fontFamily: "var(--font-mono)",
          fontSize: 11,
          textTransform: "uppercase",
          letterSpacing: "0.18em",
          color: "var(--ink-faint)",
        }}
      >
        <span>chat dock</span>
        <button
          onClick={onClose}
          aria-label="close chat dock"
          style={{
            border: 0,
            background: "transparent",
            color: "var(--ink-faint)",
            padding: 0,
            fontSize: 16,
            lineHeight: 1,
            cursor: "pointer",
          }}
        >
          ×
        </button>
      </div>
      <div style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}>
        {children}
      </div>
      <button
        onMouseDown={onDragStart}
        aria-label="resize chat dock"
        style={{
          position: "absolute",
          right: -3,
          top: 0,
          bottom: 0,
          width: 6,
          cursor: "col-resize",
          background: isResizing ? "var(--accent)" : "transparent",
          border: 0,
          padding: 0,
          zIndex: 2,
        }}
      />
    </aside>
  );
}
