import type { ReactNode } from "react";
import { ApprovalRow } from "./ApprovalRow";
import { Composer } from "./Composer";
import { Transcript } from "./Transcript";
import type { FunctionCall, Message } from "../lib/types";
import type { StreamState } from "../lib/useAgentStream";

interface Props {
  messages: Message[];
  stream: StreamState;
  turnActive: boolean;
  onSend: (text: string) => void | Promise<void>;
  onStop: () => void;
  approvals: FunctionCall[];
  onApproval: (id: string, decision: "approve" | "reject") => void;
  density?: "route" | "dock";
  header?: ReactNode;
}

export function ChatPanel({
  messages,
  stream,
  turnActive,
  onSend,
  onStop,
  approvals,
  onApproval,
  density = "route",
  header,
}: Props) {
  return (
    <section
      style={{
        display: "grid",
        gridTemplateRows: "auto 1fr auto",
        height: "100%",
        overflow: "hidden",
      }}
    >
      {header ? (
        <div
          style={{
            padding: density === "dock" ? "6px 12px" : "8px 24px",
            borderBottom: "1px solid var(--rule)",
            background: "var(--panel)",
            fontFamily: "var(--font-mono)",
            fontSize: 11,
            textTransform: "uppercase",
            letterSpacing: "0.18em",
            color: "var(--ink-faint)",
          }}
        >
          {header}
        </div>
      ) : (
        <span />
      )}
      <div style={{ overflowY: "auto" }}>
        <Transcript
          messages={messages}
          pending={stream.pending}
          thinking={turnActive}
          onSuggest={onSend}
        />
        {approvals.length > 0 && (
          <div
            style={{
              maxWidth: 780,
              margin: "0 auto",
              padding: "0 24px 16px",
            }}
          >
            {approvals.map((a) => (
              <ApprovalRow
                key={a.id}
                request={a}
                onApprove={() => onApproval(a.id, "approve")}
                onReject={() => onApproval(a.id, "reject")}
              />
            ))}
          </div>
        )}
      </div>
      <Composer
        onSend={onSend}
        onStop={onStop}
        busy={turnActive}
        disabled={turnActive}
      />
    </section>
  );
}
