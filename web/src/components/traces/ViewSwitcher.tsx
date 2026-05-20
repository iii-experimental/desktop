export type TraceView = "waterfall" | "flame" | "map" | "flow";

interface Props {
  value: TraceView;
  onChange: (v: TraceView) => void;
}

const OPTIONS: { value: TraceView; label: string }[] = [
  { value: "waterfall", label: "waterfall" },
  { value: "flame", label: "flame" },
  { value: "map", label: "map" },
  { value: "flow", label: "flow" },
];

export function ViewSwitcher({ value, onChange }: Props) {
  return (
    <div
      role="tablist"
      style={{
        display: "inline-flex",
        border: "1px solid var(--rule)",
        padding: 2,
        background: "var(--bg)",
        fontFamily: "var(--font-mono)",
        fontSize: 12,
      }}
    >
      {OPTIONS.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            role="tab"
            aria-pressed={active}
            onClick={() => onChange(o.value)}
            style={{
              border: 0,
              padding: "3px 12px",
              background: active ? "var(--ink)" : "transparent",
              color: active ? "var(--bg)" : "var(--ink-faint)",
              textTransform: "lowercase",
              letterSpacing: 0,
            }}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
