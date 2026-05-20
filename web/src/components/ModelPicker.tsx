import { useEffect, useRef, useState } from "react";

export interface ModelOption {
  provider: string;
  model: string;
  label?: string;
}

interface Props {
  options: ModelOption[];
  value: ModelOption;
  onChange: (next: ModelOption) => void;
}

export function ModelPicker({ options, value, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const wrapper = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (wrapper.current && !wrapper.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    window.addEventListener("mousedown", handler);
    return () => window.removeEventListener("mousedown", handler);
  }, [open]);

  return (
    <div ref={wrapper} style={{ position: "relative" }}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="mono"
        style={{
          fontSize: 12,
          padding: "3px 10px",
          background: "var(--bg)",
          border: "1px solid var(--rule)",
          color: "var(--ink)",
          display: "flex",
          alignItems: "center",
          gap: 6,
          textTransform: "lowercase",
        }}
      >
        <span style={{ color: "var(--ink-faint)" }}>{value.provider}</span>
        <span style={{ color: "var(--ink-ghost)" }}>/</span>
        <span>{value.model}</span>
        <span style={{ color: "var(--ink-ghost)", marginLeft: 2 }}>▾</span>
      </button>
      {open && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 4px)",
            right: 0,
            minWidth: 280,
            background: "var(--bg)",
            border: "1px solid var(--rule)",
            padding: 0,
            zIndex: 10,
            maxHeight: 320,
            overflowY: "auto",
          }}
        >
          {options.length === 0 && (
            <div
              style={{
                padding: 12,
                color: "var(--ink-ghost)",
                fontSize: 12,
                textTransform: "lowercase",
              }}
            >
              no models. add a provider worker.
            </div>
          )}
          {options.map((o) => {
            const active = o.provider === value.provider && o.model === value.model;
            return (
              <button
                key={`${o.provider}/${o.model}`}
                onClick={() => {
                  onChange(o);
                  setOpen(false);
                }}
                style={{
                  width: "100%",
                  textAlign: "left",
                  padding: "6px 12px",
                  border: 0,
                  borderBottom: "1px solid var(--rule-2)",
                  background: active ? "var(--panel)" : "transparent",
                  color: "var(--ink)",
                  display: "flex",
                  justifyContent: "space-between",
                  fontFamily: "var(--font-mono)",
                  fontSize: 12,
                  borderLeft: active ? "2px solid var(--accent)" : "2px solid transparent",
                  textTransform: "lowercase",
                }}
              >
                <span>{o.label ?? o.model}</span>
                <span style={{ color: "var(--ink-faint)" }}>{o.provider}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
