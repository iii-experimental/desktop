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
          padding: "4px 10px",
          background: "transparent",
          border: "1px solid var(--border)",
          borderRadius: 4,
          display: "flex",
          alignItems: "center",
          gap: 6,
        }}
      >
        <span style={{ color: "var(--secondary)" }}>{value.provider}</span>
        <span>/</span>
        <span>{value.model}</span>
        <span style={{ color: "var(--muted)", marginLeft: 2 }}>▾</span>
      </button>
      {open && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 6px)",
            right: 0,
            minWidth: 280,
            background: "var(--elevated)",
            border: "1px solid var(--border)",
            borderRadius: 6,
            padding: 4,
            zIndex: 10,
            maxHeight: 320,
            overflowY: "auto",
            boxShadow: "0 8px 24px rgba(0,0,0,0.45)",
          }}
        >
          {options.length === 0 && (
            <div style={{ padding: 12, color: "var(--muted)", fontSize: 12 }}>
              No models. Add a provider worker.
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
                  padding: "6px 10px",
                  border: 0,
                  borderRadius: 4,
                  background: active ? "var(--hover)" : "transparent",
                  display: "flex",
                  justifyContent: "space-between",
                  fontFamily: "var(--font-mono)",
                  fontSize: 12,
                }}
              >
                <span>{o.label ?? o.model}</span>
                <span style={{ color: "var(--muted)" }}>{o.provider}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
