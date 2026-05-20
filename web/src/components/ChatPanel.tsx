import type { ReactNode } from "react";
import { ApprovalRow } from "./ApprovalRow";
import { Composer, type ComposerMode } from "./Composer";
import { StatusBar } from "./StatusBar";
import { Transcript } from "./Transcript";
import type { ModelOption } from "./ModelPicker";
import type { FunctionCall, Message } from "../lib/types";
import type { StreamState } from "../lib/useAgentStream";

interface Props {
  messages: Message[];
  stream: StreamState;
  turnActive: boolean;
  onSend: (text: string, mode: ComposerMode) => void | Promise<void>;
  onStop: () => void;
  approvals: FunctionCall[];
  onApproval: (id: string, decision: "approve" | "reject") => void;
  density?: "route" | "dock";
  model: ModelOption;
  modelPicker?: ReactNode;
  ctxPercent?: number;
  ctxUsed?: number;
  ctxMax?: number;
}

export function ChatPanel({
  messages,
  stream,
  turnActive,
  onSend,
  onStop,
  approvals,
  onApproval,
  model,
  modelPicker,
  ctxPercent,
  ctxUsed,
  ctxMax,
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
      <StatusBar
        model={model}
        ctxPercent={ctxPercent}
        ctxUsed={ctxUsed}
        ctxMax={ctxMax}
        status={
          stream.pausedForApproval
            ? "paused"
            : turnActive
              ? "busy"
              : "ready"
        }
      />
      <div style={{ overflowY: "auto" }}>
        <Transcript
          messages={messages}
          pending={stream.pending}
          thinking={turnActive}
          onSuggest={(text) => onSend(text, "agent")}
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
        modelPicker={modelPicker}
      />
    </section>
  );
}
