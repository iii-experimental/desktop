import { useCallback, useEffect, useRef, useState } from "react";

interface Props {
  onSend: (text: string) => void | Promise<void>;
  onStop?: () => void;
  disabled?: boolean;
  busy?: boolean;
  placeholder?: string;
}

const SLASH_COMMANDS: Array<{ id: string; description: string }> = [
  { id: "/clear", description: "clear current transcript" },
  { id: "/model", description: "switch model" },
  { id: "/new", description: "new session" },
  { id: "/export", description: "export transcript as markdown" },
];

export function Composer({ onSend, onStop, disabled, busy, placeholder }: Props) {
  const [value, setValue] = useState("");
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const ta = ref.current;
    if (!ta) return;
    ta.style.height = "0px";
    const next = Math.min(ta.scrollHeight, 220);
    ta.style.height = `${next}px`;
  }, [value]);

  const send = useCallback(async () => {
    const text = value.trim();
    if (!text || disabled) return;
    setValue("");
    await onSend(text);
    ref.current?.focus();
  }, [value, disabled, onSend]);

  const showSlash =
    value.startsWith("/") && value.indexOf("\n") === -1 && value.length < 32;
  const matched = showSlash
    ? SLASH_COMMANDS.filter((c) => c.id.startsWith(value))
    : [];

  return (
    <div
      style={{
        borderTop: "1px solid var(--rule)",
        background: "var(--panel)",
        padding: "10px 14px 12px",
      }}
    >
      {matched.length > 0 && (
        <div
          style={{
            border: "1px solid var(--rule)",
            marginBottom: 8,
            background: "var(--bg)",
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
                padding: "6px 12px",
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
      <div
        style={{
          display: "flex",
          gap: 8,
          alignItems: "flex-end",
          background: "var(--bg)",
          border: "1px solid var(--rule)",
          padding: "8px 10px",
        }}
      >
        <span
          style={{
            color: "var(--accent)",
            fontFamily: "var(--font-mono)",
            fontSize: 13,
            lineHeight: "20px",
          }}
        >
          $
        </span>
        <textarea
          ref={ref}
          value={value}
          rows={1}
          placeholder={placeholder ?? "ask iii anything…  ⌘k for palette"}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey && !e.metaKey && !e.ctrlKey) {
              e.preventDefault();
              void send();
            }
          }}
          disabled={disabled}
          style={{
            flex: 1,
            resize: "none",
            background: "transparent",
            border: 0,
            outline: "none",
            padding: 0,
            fontFamily: "var(--font-mono)",
            fontSize: 13,
            color: "var(--ink)",
            minHeight: 20,
            maxHeight: 220,
            lineHeight: "20px",
          }}
        />
        {busy && onStop ? (
          <button
            onClick={onStop}
            style={{
              padding: "4px 14px",
              background: "var(--bg)",
              border: "1px solid var(--rule)",
              color: "var(--ink)",
              textTransform: "lowercase",
            }}
          >
            stop
          </button>
        ) : (
          <button
            onClick={() => void send()}
            disabled={disabled || !value.trim()}
            style={{
              padding: "4px 14px",
              background: value.trim() ? "var(--ink)" : "var(--bg)",
              color: value.trim() ? "var(--bg)" : "var(--ink-ghost)",
              border: `1px solid ${value.trim() ? "var(--ink)" : "var(--rule)"}`,
              cursor: !value.trim() ? "not-allowed" : "pointer",
              textTransform: "lowercase",
            }}
          >
            send
          </button>
        )}
      </div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginTop: 6,
          color: "var(--ink-ghost)",
          fontSize: 11,
          fontFamily: "var(--font-mono)",
          textTransform: "lowercase",
        }}
      >
        <span>
          <kbd>⏎</kbd> send · <kbd>⇧⏎</kbd> newline
        </span>
        <span className="mono">{value.length} chars</span>
      </div>
    </div>
  );
}
