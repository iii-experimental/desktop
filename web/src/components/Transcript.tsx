import { useEffect, useRef } from "react";
import type { Message } from "../lib/types";
import { Markdown } from "./Markdown";
import { ReasoningBlock } from "./ReasoningBlock";
import { ToolCallBlock } from "./ToolCallBlock";

interface Props {
  messages: Message[];
  pending: Message | null;
  thinking?: boolean;
  onSuggest?: (text: string) => void;
}

const SUGGESTIONS: Array<{ hint: string; text: string }> = [
  { hint: "explore", text: "What can you do?" },
  { hint: "code", text: "Write a Rust function that streams a CSV file" },
  { hint: "files", text: "List the files in this directory" },
  { hint: "explain", text: "Explain the iii engine in one paragraph" },
];

export function Transcript({ messages, pending, thinking, onSuggest }: Props) {
  const items = pending ? [...messages, pending] : messages;
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = endRef.current;
    if (!el) return;
    // Instant scroll — smooth-scroll on every stream tick causes flicker.
    el.scrollIntoView({ block: "end" });
  }, [items.length]);

  return (
    <section
      className="transcript"
      aria-live="polite"
      style={{
        maxWidth: 780,
        margin: "0 auto",
        width: "100%",
        padding: "24px 24px 32px",
      }}
    >
      {items.length === 0 && !thinking && (
        <EmptyState onPick={onSuggest ?? (() => {})} />
      )}
      {items.map((m) => (
        <article key={m.id} className={`turn ${m.role}`}>
          {m.role === "user" ? (
            <div className="bubble">{m.content}</div>
          ) : (
            <>
              <RoleBadge role={m.role} ts={m.timestamp} />
              <div className="body">
                {m.reasoning && <ReasoningBlock text={m.reasoning} />}
                {m.parts && m.parts.length > 0
                  ? m.parts.map((p, i) =>
                      p.kind === "text" ? (
                        <Markdown key={`t-${i}`} text={p.text} />
                      ) : (
                        <ToolCallBlock key={`c-${p.call.id}`} call={p.call} />
                      ),
                    )
                  : (
                      <>
                        {m.content && <Markdown text={m.content} />}
                        {m.function_calls?.map((fc) => (
                          <ToolCallBlock key={fc.id} call={fc} />
                        ))}
                      </>
                    )}
                {pending && pending.id === m.id && !m.content && (!m.parts || m.parts.length === 0) && (
                  <InlineThinking />
                )}
                {m.usage && (
                  <div
                    style={{
                      marginTop: 6,
                      color: "var(--muted)",
                      fontFamily: "var(--font-mono)",
                      fontSize: 11,
                      letterSpacing: "0.04em",
                    }}
                  >
                    in {m.usage.input ?? 0} · out {m.usage.output ?? 0}
                    {m.usage.cache_read
                      ? ` · cache ${m.usage.cache_read}`
                      : ""}
                  </div>
                )}
              </div>
            </>
          )}
        </article>
      ))}
      {thinking && !pending && <Thinking />}
      <div ref={endRef} />
    </section>
  );
}

function RoleBadge({ role, ts }: { role: Message["role"]; ts: number }) {
  const fmt = new Date(ts).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        marginBottom: 6,
        color: "var(--muted)",
      }}
    >
      <span
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 10,
          letterSpacing: "0.1em",
          textTransform: "uppercase",
          color: role === "system" ? "var(--error)" : "var(--accent)",
        }}
      >
        {role === "system" ? "system" : "iii"}
      </span>
      <span
        style={{ fontFamily: "var(--font-mono)", fontSize: 10 }}
      >
        {fmt}
      </span>
    </div>
  );
}

function Thinking() {
  return (
    <div className="turn assistant">
      <div className="body" style={{ color: "var(--muted)" }}>
        <InlineThinking />
      </div>
    </div>
  );
}

function InlineThinking() {
  return (
    <span
      style={{
        color: "var(--muted)",
        fontFamily: "var(--font-mono)",
        fontSize: 12,
        letterSpacing: "0.06em",
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
      }}
    >
      thinking
      <span className="thinking-dot" />
      <span className="thinking-dot" style={{ animationDelay: "0.2s" }} />
      <span className="thinking-dot" style={{ animationDelay: "0.4s" }} />
    </span>
  );
}

function EmptyState({ onPick }: { onPick: (text: string) => void }) {
  return (
    <div style={{ color: "var(--muted)", marginTop: "10vh" }}>
      <div style={{ textAlign: "center", marginBottom: 8 }}>
        <div
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 14,
            color: "var(--foreground)",
            fontWeight: 700,
          }}
        >
          iii <span style={{ color: "var(--muted)" }}>/</span> desktop
        </div>
        <div
          style={{
            color: "var(--secondary)",
            fontSize: 11,
            marginTop: 6,
            letterSpacing: "0.04em",
          }}
        >
          native chat on iii primitives
        </div>
      </div>
      <div
        style={{
          textAlign: "center",
          fontSize: 11,
          color: "var(--muted)",
          marginTop: 14,
          fontFamily: "var(--font-mono)",
        }}
      >
        <kbd>⌘K</kbd> palette · <kbd>⌘N</kbd> new · <kbd>⏎</kbd> send
      </div>
      <div className="suggest-grid">
        {SUGGESTIONS.map((s) => (
          <button key={s.text} onClick={() => onPick(s.text)}>
            <span className="hint">{s.hint}</span>
            {s.text}
          </button>
        ))}
      </div>
    </div>
  );
}
