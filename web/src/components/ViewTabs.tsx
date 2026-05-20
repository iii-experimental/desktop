import type { Tab } from "../lib/types";

interface Option {
  value: Tab;
  label: string;
}

interface Props {
  value: Tab;
  onChange: (next: Tab) => void;
  options: Option[];
}

export function ViewTabs({ value, onChange, options }: Props) {
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
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            role="tab"
            aria-pressed={active}
            onClick={() => onChange(opt.value)}
            style={{
              border: 0,
              padding: "3px 12px",
              background: active ? "var(--ink)" : "transparent",
              color: active ? "var(--bg)" : "var(--ink-faint)",
              textTransform: "lowercase",
              letterSpacing: 0,
              transition: "background 0.12s, color 0.12s",
            }}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
