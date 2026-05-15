import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Message } from "../lib/types";

interface Props {
  messages: Message[];
  pending: Message | null;
}

export function Transcript({ messages, pending }: Props) {
  const items = pending ? [...messages, pending] : messages;
  return (
    <section className="transcript" aria-live="polite">
      {items.length === 0 && <EmptyState />}
      {items.map((m) => (
        <article key={m.id} className="turn">
          <div className="role mono">{m.role}</div>
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{m.content}</ReactMarkdown>
          {m.usage && (
            <div className="uppercase-label mono">
              in {m.usage.input ?? 0} · out {m.usage.output ?? 0}
              {m.usage.cache_read ? ` · cache ${m.usage.cache_read}` : ""}
            </div>
          )}
        </article>
      ))}
    </section>
  );
}

function EmptyState() {
  return (
    <div style={{ textAlign: "center", color: "var(--muted)", marginTop: "20vh" }}>
      <div className="mono uppercase-label">Start a session</div>
      <p>Type a message below to start a turn through the iii harness.</p>
    </div>
  );
}
