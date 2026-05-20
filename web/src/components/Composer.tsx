import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";

export type ComposerMode = "plan" | "ask" | "agent";

interface Props {
  onSend: (text: string, mode: ComposerMode) => void | Promise<void>;
  onStop?: () => void;
  disabled?: boolean;
  busy?: boolean;
  placeholder?: string;
  modelPicker?: ReactNode;
}

const SLASH_COMMANDS: Array<{ id: string; description: string }> = [
  { id: "/clear", description: "clear current transcript" },
  { id: "/model", description: "switch model" },
  { id: "/new", description: "new session" },
  { id: "/export", description: "export transcript as markdown" },
];

const MODES: { value: ComposerMode; label: string }[] = [
  { value: "plan", label: "plan" },
  { value: "ask", label: "ask" },
  { value: "agent", label: "agent" },
];

export function Composer({
  onSend,
  onStop,
  disabled,
  busy,
  placeholder,
  modelPicker,
}: Props) {
  const [value, setValue] = useState("");
  const [mode, setMode] = useState<ComposerMode>("agent");
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const ta = ref.current;
    if (!ta) return;
    ta.style.height = "0px";
    const next = Math.min(ta.scrollHeight, 200);
    ta.style.height = `${next}px`;
  }, [value]);

  const send = useCallback(async () => {
    const text = value.trim();
    if (!text || disabled) return;
    setValue("");
    await onSend(text, mode);
    ref.current?.focus();
  }, [value, disabled, mode, onSend]);

  const showSlash =
    value.startsWith("/") && value.indexOf("\n") === -1 && value.length < 32;
  const matched = showSlash
    ? SLASH_COMMANDS.filter((c) => c.id.startsWith(value))
    : [];

  return (
    <div
      style={{
        borderTop: "1px solid var(--rule)",
        background: "var(--bg)",
        padding: 0,
      }}
    >
      {matched.length > 0 && (
        <div
          style={{
            borderBottom: "1px solid var(--rule)",
            background: "var(--panel)",
          }}
        >
          {matched.map((c) => (
            <button
              key={c.id}
              onClick={() => {
                setValue(c.id + " ");
                ref.current?.focus();
              }}
              style={{
                width: "100%",
                textAlign: "left",
                border: 0,
                borderBottom: "1px solid var(--rule-2)",
                background: "transparent",
                padding: "6px 14px",
                display: "flex",
                justifyContent: "space-between",
                color: "var(--ink)",
              }}
            >
              <span className="mono" style={{ fontSize: 12 }}>
                {c.id}
              </span>
              <span style={{ color: "var(--ink-faint)", fontSize: 12 }}>
                {c.description}
              </span>
            </button>
          ))}
        </div>
      )}
      <textarea
        ref={ref}
        value={value}
        rows={1}
        placeholder={placeholder ?? "send a message…"}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey && !e.metaKey && !e.ctrlKey) {
            e.preventDefault();
            void send();
          }
        }}
        disabled={disabled}
        style={{
          width: "100%",
          resize: "none",
          background: "transparent",
          border: 0,
          outline: "none",
          padding: "14px 16px 8px",
          fontFamily: "var(--font-mono)",
          fontSize: 13,
          color: "var(--ink)",
          lineHeight: 1.55,
          minHeight: 44,
          maxHeight: 200,
        }}
      />
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "8px 12px 12px",
        }}
      >
        <button
          type="button"
          title="attach"
          style={{
            border: "1px solid var(--rule)",
            background: "var(--bg)",
            color: "var(--ink-faint)",
            padding: "3px 8px",
            fontSize: 13,
            lineHeight: 1,
          }}
        >
          ⌘
        </button>
        <div
          role="tablist"
          style={{
            display: "inline-flex",
            border: "1px solid var(--rule)",
            padding: 2,
            background: "var(--bg)",
          }}
        >
          {MODES.map((m) => {
            const active = m.value === mode;
            return (
              <button
                key={m.value}
                role="tab"
                aria-pressed={active}
                onClick={() => setMode(m.value)}
                style={{
                  border: 0,
                  padding: "3px 10px",
                  background: active ? "var(--ink)" : "transparent",
                  color: active ? "var(--bg)" : "var(--ink-faint)",
                  fontSize: 12,
                  textTransform: "lowercase",
                  fontFamily: "var(--font-mono)",
                }}
              >
                {m.label}
              </button>
            );
          })}
        </div>
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 8 }}>
          {modelPicker}
          {busy && onStop ? (
            <button
              onClick={onStop}
              style={{
                padding: "4px 14px",
                background: "var(--bg)",
                border: "1px solid var(--rule)",
                color: "var(--ink)",
                textTransform: "lowercase",
                fontSize: 12,
              }}
            >
              stop
            </button>
          ) : (
            <button
              onClick={() => void send()}
              disabled={disabled || !value.trim()}
              aria-label="send"
              style={{
                padding: "4px 14px",
                background: value.trim() ? "var(--ink)" : "var(--bg)",
                color: value.trim() ? "var(--bg)" : "var(--ink-ghost)",
                border: `1px solid ${value.trim() ? "var(--ink)" : "var(--rule)"}`,
                cursor: !value.trim() ? "not-allowed" : "pointer",
                textTransform: "lowercase",
                fontSize: 12,
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              send <span aria-hidden>→</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
