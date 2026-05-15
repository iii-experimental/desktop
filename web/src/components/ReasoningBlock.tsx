import { useState } from "react";
import { Markdown } from "./Markdown";

interface Props {
  text: string;
  open?: boolean;
}

export function ReasoningBlock({ text, open = false }: Props) {
  const [expanded, setExpanded] = useState(open);
  if (!text.trim()) return null;
  return (
    <div
      style={{
        margin: "8px 0",
        border: "1px solid var(--border-subtle)",
        borderRadius: 6,
        background: "var(--sidebar)",
        overflow: "hidden",
      }}
    >
      <button
        onClick={() => setExpanded((v) => !v)}
        style={{
          width: "100%",
          textAlign: "left",
          padding: "6px 12px",
          background: "transparent",
          border: 0,
          borderRadius: 0,
          display: "flex",
          alignItems: "center",
          gap: 8,
          color: "var(--secondary)",
          fontSize: 11,
          textTransform: "uppercase",
          letterSpacing: "0.06em",
          fontFamily: "var(--font-mono)",
        }}
      >
        <span>{expanded ? "▾" : "▸"}</span>
        <span>reasoning</span>
        <span style={{ marginLeft: "auto" }}>
          {text.length} chars
        </span>
      </button>
      {expanded && (
        <div
          style={{
            padding: "0 16px 8px",
            color: "var(--secondary)",
            fontSize: 13,
            borderTop: "1px solid var(--border-subtle)",
          }}
        >
          <Markdown text={text} />
        </div>
      )}
    </div>
  );
}
