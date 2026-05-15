import { useState } from "react";
import SyntaxHighlighter from "react-syntax-highlighter";
import { atomOneDark } from "react-syntax-highlighter/dist/esm/styles/hljs";

interface Props {
  code: string;
  language?: string;
  inline?: boolean;
}

const THEME = {
  ...atomOneDark,
  hljs: {
    ...(atomOneDark as { hljs?: Record<string, string> }).hljs,
    background: "var(--elevated)",
    color: "var(--foreground)",
    padding: "12px",
  },
};

export function CodeBlock({ code, language, inline }: Props) {
  const [copied, setCopied] = useState(false);

  if (inline) {
    return (
      <code
        className="mono"
        style={{
          background: "var(--hover)",
          padding: "1px 6px",
          borderRadius: 4,
          fontSize: "0.92em",
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
        margin: "12px 0",
        border: "1px solid var(--border)",
        borderRadius: 6,
        overflow: "hidden",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "6px 12px",
          background: "var(--hover)",
          fontSize: 11,
          fontFamily: "var(--font-mono)",
          color: "var(--secondary)",
          textTransform: "uppercase",
          letterSpacing: "0.06em",
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
            color: "var(--secondary)",
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
          background: "var(--elevated)",
          fontSize: 12.5,
          lineHeight: 1.55,
        }}
        codeTagProps={{ style: { fontFamily: "var(--font-mono)" } }}
      >
        {code}
      </SyntaxHighlighter>
    </div>
  );
}
