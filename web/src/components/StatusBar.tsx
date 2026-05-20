import type { ModelOption } from "./ModelPicker";

interface Props {
  model: ModelOption;
  ctxPercent?: number;
  ctxUsed?: number;
  ctxMax?: number;
  status?: "ready" | "busy" | "error" | "paused";
}

function formatTokens(n: number): string {
  if (n >= 1000) return `${Math.round(n / 1000)}k`;
  return String(n);
}

export function StatusBar({
  model,
  ctxPercent = 0,
  ctxUsed = 0,
  ctxMax = 200000,
  status = "ready",
}: Props) {
  const dotCls =
    status === "ready"
      ? "ok"
      : status === "busy"
        ? "warn"
        : status === "paused"
          ? "warn"
          : "err";
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "6px 14px",
        borderBottom: "1px solid var(--rule)",
        background: "var(--bg)",
        fontFamily: "var(--font-mono)",
        fontSize: 11,
        textTransform: "uppercase",
        letterSpacing: "0.06em",
        color: "var(--ink-faint)",
      }}
    >
      <span style={{ color: "var(--accent)" }}>$</span>
      <span style={{ color: "var(--ink)" }}>
        {model.provider}::{model.model}
      </span>
      <span style={{ color: "var(--ink-ghost)" }}>·</span>
      <span>agent</span>
      <span style={{ color: "var(--ink-ghost)" }}>·</span>
      <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
        ctx
        <span
          style={{
            display: "inline-block",
            width: 56,
            height: 6,
            border: "1px solid var(--rule)",
            position: "relative",
            background: "var(--bg)",
          }}
        >
          <span
            style={{
              position: "absolute",
              inset: 0,
              width: `${Math.min(100, ctxPercent)}%`,
              background:
                ctxPercent > 80
                  ? "var(--alert)"
                  : ctxPercent > 60
                    ? "var(--warn)"
                    : "var(--ink)",
            }}
          />
        </span>
        <span style={{ fontVariantNumeric: "tabular-nums" }}>
          {ctxPercent}%
        </span>
      </span>
      <span style={{ color: "var(--ink-ghost)" }}>·</span>
      <span style={{ fontVariantNumeric: "tabular-nums" }}>
        {formatTokens(ctxUsed)}/{formatTokens(ctxMax)}
      </span>
      <span style={{ marginLeft: "auto", display: "inline-flex", alignItems: "center", gap: 6 }}>
        <span className={`status-dot ${dotCls}`} />
        {status}
      </span>
    </div>
  );
}
