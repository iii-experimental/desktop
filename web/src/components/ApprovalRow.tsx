import type { FunctionCall } from "../lib/types";
import { CodeBlock } from "./CodeBlock";

interface Props {
  request: FunctionCall;
  onApprove: () => void;
  onReject: () => void;
  pending?: boolean;
}

export function ApprovalRow({ request, onApprove, onReject, pending }: Props) {
  return (
    <div
      style={{
        margin: "12px 0",
        border: "1px solid var(--accent)",
        background: "var(--bg)",
      }}
    >
      <div
        style={{
          padding: "6px 12px",
          borderBottom: "1px solid var(--rule)",
          display: "flex",
          alignItems: "center",
          gap: 8,
          background: "var(--panel)",
        }}
      >
        <span
          style={{
            color: "var(--accent)",
            fontSize: 11,
            textTransform: "uppercase",
            letterSpacing: "0.18em",
            fontFamily: "var(--font-mono)",
            fontWeight: 500,
          }}
        >
          approval required
        </span>
        <code
          className="mono"
          style={{
            fontSize: 12,
            color: "var(--ink)",
            background: "transparent",
            padding: 0,
          }}
        >
          {request.function_id}
        </code>
      </div>
      <div style={{ padding: 12 }}>
        <CodeBlock
          code={JSON.stringify(request.payload, null, 2)}
          language="json"
        />
      </div>
      <div
        style={{
          display: "flex",
          gap: 8,
          padding: "8px 12px",
          borderTop: "1px solid var(--rule)",
          justifyContent: "flex-end",
        }}
      >
        <button
          onClick={onReject}
          disabled={pending}
          style={{
            padding: "4px 14px",
            background: "var(--bg)",
            border: "1px solid var(--rule)",
            color: "var(--ink)",
            textTransform: "lowercase",
          }}
        >
          reject
        </button>
        <button
          onClick={onApprove}
          disabled={pending}
          style={{
            padding: "4px 14px",
            background: "var(--ink)",
            color: "var(--bg)",
            border: "1px solid var(--ink)",
            textTransform: "lowercase",
          }}
        >
          approve
        </button>
      </div>
    </div>
  );
}
