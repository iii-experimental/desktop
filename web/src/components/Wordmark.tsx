interface Props {
  sub?: string;
}

export function Wordmark({ sub }: Props) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "baseline",
        gap: 10,
        fontFamily: "var(--font-mono)",
      }}
    >
      <span
        style={{
          color: "var(--ink)",
          fontSize: 14,
          fontWeight: 600,
          letterSpacing: "-0.01em",
          textTransform: "lowercase",
        }}
      >
        iii
      </span>
      {sub && (
        <span
          style={{
            color: "var(--ink-faint)",
            fontSize: 11,
            fontWeight: 500,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
          }}
        >
          {sub}
        </span>
      )}
    </span>
  );
}
