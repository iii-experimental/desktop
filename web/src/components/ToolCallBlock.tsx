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
        border: "1px solid var(--rule)",
        background: "var(--bg)",
      }}
    >
      <button
        onClick={() => setExpanded((v) => !v)}
        style={{
          display: "flex",
          gap: 8,
          alignItems: "center",
          width: "100%",
          padding: "6px 12px",
          border: 0,
          background: "var(--panel)",
          textAlign: "left",
          color: "var(--ink)",
          borderBottom: expanded ? "1px solid var(--rule-2)" : 0,
        }}
      >
        <span style={{ color: "var(--ink-faint)" }}>{expanded ? "▾" : "▸"}</span>
        <code
          className="mono"
          style={{
            background: "transparent",
            padding: 0,
            fontSize: 12.5,
            color: "var(--ink)",
            fontWeight: 500,
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
        <div style={{ padding: 12 }}>
          <div className="uppercase-label" style={{ marginBottom: 6 }}>
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
                style={{ marginTop: 12, marginBottom: 6 }}
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
