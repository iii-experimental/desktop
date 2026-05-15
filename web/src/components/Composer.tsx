import { useCallback, useRef, useState } from "react";

interface Props {
  onSend: (text: string) => void | Promise<void>;
  disabled?: boolean;
}

export function Composer({ onSend, disabled }: Props) {
  const [value, setValue] = useState("");
  const ref = useRef<HTMLTextAreaElement>(null);

  const send = useCallback(async () => {
    const text = value.trim();
    if (!text || disabled) return;
    setValue("");
    await onSend(text);
    ref.current?.focus();
  }, [value, disabled, onSend]);

  return (
    <div className="composer">
      <textarea
        ref={ref}
        value={value}
        rows={1}
        placeholder="Ask iii anything…"
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            void send();
          }
        }}
        disabled={disabled}
      />
      <button onClick={() => void send()} disabled={disabled || !value.trim()}>
        Send
      </button>
    </div>
  );
}
