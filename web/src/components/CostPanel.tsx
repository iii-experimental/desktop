import { useMemo } from "react";
import type { Message } from "../lib/types";

interface Props {
  messages: Message[];
}

interface Totals {
  input: number;
  output: number;
  cacheRead: number;
  cacheWrite: number;
}

function aggregate(messages: Message[]): Totals {
  return messages.reduce<Totals>(
    (acc, m) => {
      const u = m.usage;
      if (!u) return acc;
      return {
        input: acc.input + (u.input ?? 0),
        output: acc.output + (u.output ?? 0),
        cacheRead: acc.cacheRead + (u.cache_read ?? 0),
        cacheWrite: acc.cacheWrite + (u.cache_write ?? 0),
      };
    },
    { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
  );
}

export function CostPanel({ messages }: Props) {
  const totals = useMemo(() => aggregate(messages), [messages]);
  const turns = messages.filter((m) => m.role === "assistant").length;
  const rows: Array<[string, number]> = [
    ["input tokens", totals.input],
    ["output tokens", totals.output],
    ["cache read", totals.cacheRead],
    ["cache write", totals.cacheWrite],
    ["assistant turns", turns],
  ];

  return (
    <section style={{ padding: 32 }}>
      <div className="uppercase-label">session cost</div>
      <div
        style={{
          marginTop: 16,
          display: "grid",
          gridTemplateColumns: "1fr auto",
          gap: 4,
        }}
      >
        {rows.map(([label, value]) => (
          <Row key={label} label={label} value={value} />
        ))}
      </div>
      <p style={{ marginTop: 24, color: "var(--muted)", fontSize: 12 }}>
        Token counts come from `agent::events` <code>message_end</code> frames.
        For provider-priced totals add the <code>llm-budget</code> worker and
        call <code>budget::usage</code>.
      </p>
    </section>
  );
}

function Row({ label, value }: { label: string; value: number }) {
  return (
    <>
      <div className="mono" style={{ color: "var(--secondary)" }}>
        {label}
      </div>
      <div className="mono">{value.toLocaleString()}</div>
    </>
  );
}
