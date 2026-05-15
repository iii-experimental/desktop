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
        borderRadius: 6,
        background: "rgba(243, 247, 36, 0.05)",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          padding: "8px 12px",
          borderBottom: "1px solid var(--border-subtle)",
          display: "flex",
          alignItems: "center",
          gap: 8,
        }}
      >
        <span className="pill accent mono">approval required</span>
        <code className="mono" style={{ fontSize: 12 }}>
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
          borderTop: "1px solid var(--border-subtle)",
          justifyContent: "flex-end",
        }}
      >
        <button onClick={onReject} disabled={pending}>
          Reject
        </button>
        <button
          onClick={onApprove}
          disabled={pending}
          style={{
            background: "var(--accent)",
            color: "var(--accent-text)",
            border: 0,
          }}
        >
          Approve
        </button>
      </div>
    </div>
  );
}
