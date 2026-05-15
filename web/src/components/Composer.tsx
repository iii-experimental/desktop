import { useCallback, useEffect, useRef, useState } from "react";

interface Props {
  onSend: (text: string) => void | Promise<void>;
  onStop?: () => void;
  disabled?: boolean;
  busy?: boolean;
  placeholder?: string;
}

const SLASH_COMMANDS: Array<{ id: string; description: string }> = [
  { id: "/clear", description: "Clear current transcript" },
  { id: "/model", description: "Switch model" },
  { id: "/new", description: "New session" },
  { id: "/export", description: "Export transcript as markdown" },
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
        borderTop: "1px solid var(--border-subtle)",
        background: "var(--elevated)",
        padding: "10px 14px 14px",
      }}
    >
      {matched.length > 0 && (
        <div
          style={{
            border: "1px solid var(--border)",
            borderRadius: 6,
            marginBottom: 8,
            background: "var(--sidebar)",
            overflow: "hidden",
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
                borderRadius: 0,
                background: "transparent",
                padding: "6px 12px",
                display: "flex",
                justifyContent: "space-between",
              }}
            >
              <span className="mono" style={{ fontSize: 12 }}>
                {c.id}
              </span>
              <span style={{ color: "var(--muted)", fontSize: 12 }}>
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
          background: "var(--background)",
          border: "1px solid var(--border)",
          borderRadius: 8,
          padding: "8px 10px",
        }}
      >
        <textarea
          ref={ref}
          value={value}
          rows={1}
          placeholder={placeholder ?? "Ask iii anything…  ⌘K for palette"}
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
            padding: 4,
            fontFamily: "var(--font-sans)",
            fontSize: 14,
            color: "var(--foreground)",
            minHeight: 24,
            maxHeight: 220,
          }}
        />
        {busy && onStop ? (
          <button
            onClick={onStop}
            style={{
              padding: "6px 14px",
              background: "transparent",
              border: "1px solid var(--border)",
              color: "var(--foreground)",
              borderRadius: 6,
            }}
          >
            Stop
          </button>
        ) : (
          <button
            onClick={() => void send()}
            disabled={disabled || !value.trim()}
            style={{
              padding: "6px 14px",
              background: "var(--accent)",
              color: "var(--accent-text)",
              border: 0,
              borderRadius: 6,
              fontWeight: 500,
              cursor: !value.trim() ? "not-allowed" : "pointer",
              opacity: !value.trim() ? 0.5 : 1,
            }}
          >
            Send
          </button>
        )}
      </div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginTop: 6,
          color: "var(--muted)",
          fontSize: 11,
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
