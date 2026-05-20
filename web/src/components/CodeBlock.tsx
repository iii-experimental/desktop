import { useState } from "react";
import SyntaxHighlighter from "react-syntax-highlighter";
import { atomOneLight } from "react-syntax-highlighter/dist/esm/styles/hljs";

interface Props {
  code: string;
  language?: string;
  inline?: boolean;
}

const THEME = {
  ...atomOneLight,
  hljs: {
    ...(atomOneLight as { hljs?: Record<string, string> }).hljs,
    background: "var(--bg)",
    color: "var(--ink)",
    padding: "16px 20px",
  },
};

export function CodeBlock({ code, language, inline }: Props) {
  const [copied, setCopied] = useState(false);

  if (inline) {
    return (
      <code
        className="mono"
        style={{
          background: "var(--panel)",
          padding: "0 5px",
          fontSize: "0.92em",
          color: "var(--ink)",
        }}
      >
        {code}
      </code>
    );
  }

  const lang = (language ?? "text").toLowerCase();

  return (
    <div
      style={{
        position: "relative",
        margin: "10px 0",
        border: "1px solid var(--rule)",
        background: "var(--bg)",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "6px 14px",
          background: "var(--panel)",
          fontSize: 11,
          fontFamily: "var(--font-mono)",
          color: "var(--ink-faint)",
          textTransform: "uppercase",
          letterSpacing: "0.18em",
          borderBottom: "1px solid var(--rule)",
        }}
      >
        <span>{lang}</span>
        <button
          onClick={async () => {
            await navigator.clipboard.writeText(code);
            setCopied(true);
            setTimeout(() => setCopied(false), 1200);
          }}
          style={{
            border: 0,
            background: "transparent",
            color: "var(--ink-faint)",
            padding: 0,
            fontSize: 11,
            cursor: "pointer",
            textTransform: "uppercase",
            letterSpacing: "0.06em",
          }}
        >
          {copied ? "copied" : "copy"}
        </button>
      </div>
      <SyntaxHighlighter
        language={lang}
        style={THEME}
        customStyle={{
          margin: 0,
          background: "var(--bg)",
          fontSize: 12.5,
          lineHeight: 1.55,
          padding: "16px 20px",
        }}
        codeTagProps={{ style: { fontFamily: "var(--font-mono)" } }}
      >
        {code}
      </SyntaxHighlighter>
    </div>
  );
}
