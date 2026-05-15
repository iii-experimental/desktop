import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { CodeBlock } from "./CodeBlock";

interface Props {
  text: string;
}

export function Markdown({ text }: Props) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        code({ inline, className, children, ...rest }: {
          inline?: boolean;
          className?: string;
          children?: React.ReactNode;
        }) {
          const code = String(children ?? "").replace(/\n$/, "");
          const match = /language-(\w+)/.exec(className ?? "");
          if (inline || !match) {
            return <CodeBlock code={code} inline {...rest} />;
          }
          return <CodeBlock code={code} language={match[1]} />;
        },
        a({ href, children }) {
          return (
            <a href={href} target="_blank" rel="noreferrer noopener">
              {children}
            </a>
          );
        },
        table({ children }) {
          return (
            <div style={{ overflowX: "auto", margin: "12px 0" }}>
              <table
                style={{
                  borderCollapse: "collapse",
                  width: "100%",
                  fontSize: 13,
                }}
              >
                {children}
              </table>
            </div>
          );
        },
        th({ children }) {
          return (
            <th
              style={{
                textAlign: "left",
                borderBottom: "1px solid var(--border)",
                padding: "6px 10px",
                color: "var(--secondary)",
                fontWeight: 500,
              }}
            >
              {children}
            </th>
          );
        },
        td({ children }) {
          return (
            <td
              style={{
                borderBottom: "1px solid var(--border-subtle)",
                padding: "6px 10px",
              }}
            >
              {children}
            </td>
          );
        },
      }}
    >
      {text}
    </ReactMarkdown>
  );
}
