import { useState } from "react";
import type { FunctionCall } from "../lib/types";
import { CodeBlock } from "./CodeBlock";

interface Props {
  call: FunctionCall;
}

function statusPill(status: FunctionCall["status"]) {
  switch (status) {
    case "running":
      return { label: "running", cls: "warn" };
    case "done":
      return { label: "done", cls: "ok" };
    case "error":
      return { label: "error", cls: "err" };
    default:
      return { label: "pending", cls: "neutral" };
  }
}

function resultPreview(result: unknown): string {
  if (typeof result === "string") return result;
  if (result && typeof result === "object") {
    const obj = result as { content?: Array<{ text?: string }> };
    if (Array.isArray(obj.content)) {
      const text = obj.content
        .map((c) => c.text ?? "")
        .filter(Boolean)
        .join("\n");
      if (text) {
        try {
          const parsed = JSON.parse(text);
          return JSON.stringify(parsed, null, 2);
        } catch {
          return text;
        }
      }
    }
  }
  try {
    return JSON.stringify(result, null, 2);
  } catch {
    return String(result);
  }
}

export function ToolCallBlock({ call }: Props) {
  const [expanded, setExpanded] = useState(call.status === "running");
  const pill = statusPill(call.status);
  const resultText = call.result !== undefined ? resultPreview(call.result) : "";

  return (
    <div
      style={{
        margin: "10px 0",
        border: "1px solid var(--border)",
        borderRadius: 6,
        background: "var(--elevated)",
        overflow: "hidden",
      }}
    >
      <button
        onClick={() => setExpanded((v) => !v)}
        style={{
          display: "flex",
          gap: 8,
          alignItems: "center",
          width: "100%",
          padding: "7px 12px",
          border: 0,
          borderRadius: 0,
          background: "transparent",
          textAlign: "left",
        }}
      >
        <span style={{ color: "var(--muted)" }}>{expanded ? "▾" : "▸"}</span>
        <code
          className="mono"
          style={{
            background: "var(--hover)",
            padding: "1px 8px",
            borderRadius: 4,
            fontSize: 12,
            color: "var(--accent)",
          }}
        >
          {call.function_id}
        </code>
        <span className={`pill mono ${pill.cls}`}>{pill.label}</span>
        {call.status === "running" && (
          <span className="thinking-dot" style={{ marginLeft: 4 }} />
        )}
      </button>
      {expanded && (
        <div style={{ borderTop: "1px solid var(--border-subtle)", padding: 10 }}>
          <div className="uppercase-label" style={{ marginBottom: 4 }}>
            args
          </div>
          <CodeBlock
            code={JSON.stringify(call.payload, null, 2)}
            language="json"
          />
          {resultText && (
            <>
              <div
                className="uppercase-label"
                style={{ marginTop: 10, marginBottom: 4 }}
              >
                {call.status === "error" ? "error" : "result"}
              </div>
              <CodeBlock
                code={resultText}
                language={
                  resultText.startsWith("{") || resultText.startsWith("[")
                    ? "json"
                    : "text"
                }
              />
            </>
          )}
        </div>
      )}
    </div>
  );
}
