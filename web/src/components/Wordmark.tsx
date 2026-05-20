interface Props {
  sub?: string;
}

export function Wordmark({ sub = "desktop" }: Props) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "baseline",
        gap: 6,
        fontFamily: "var(--font-mono)",
        fontWeight: 600,
        fontSize: 14,
        textTransform: "lowercase",
      }}
    >
      <span style={{ color: "var(--ink)" }}>iii</span>
      <span style={{ color: "var(--ink-ghost)" }}>/</span>
      <span style={{ color: "var(--ink-faint)", fontWeight: 500 }}>{sub}</span>
    </span>
  );
}
