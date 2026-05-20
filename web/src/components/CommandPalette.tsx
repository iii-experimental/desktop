import { useEffect, useState } from "react";
import { Command } from "cmdk";

interface PaletteItem {
  id: string;
  label: string;
  hint?: string;
  group: "session" | "view" | "model" | "action";
  run: () => void | Promise<void>;
}

interface Props {
  items: PaletteItem[];
}

export function CommandPalette({ items }: Props) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      } else if (e.key === "Escape") {
        setOpen(false);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  if (!open) return null;

  return (
    <div
      onClick={() => setOpen(false)}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(10, 10, 10, 0.35)",
        zIndex: 1000,
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "center",
        paddingTop: "12vh",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "min(640px, 92vw)",
          background: "var(--bg)",
          border: "1px solid var(--ink)",
          overflow: "hidden",
        }}
      >
        <Command label="command palette">
          <div
            style={{
              display: "flex",
              alignItems: "center",
              borderBottom: "1px solid var(--rule)",
              padding: "12px 16px",
              gap: 10,
            }}
          >
            <span
              style={{
                color: "var(--accent)",
                fontFamily: "var(--font-mono)",
                fontSize: 14,
              }}
            >
              $
            </span>
            <Command.Input
              autoFocus
              placeholder="type a command…"
              style={{
                flex: 1,
                border: 0,
                padding: 0,
                outline: "none",
                fontSize: 14,
                background: "transparent",
                color: "var(--ink)",
                fontFamily: "var(--font-mono)",
                textTransform: "lowercase",
              }}
            />
          </div>
          <Command.List
            style={{
              maxHeight: 360,
              overflowY: "auto",
              padding: 0,
            }}
          >
            <Command.Empty
              style={{
                padding: 16,
                color: "var(--ink-ghost)",
                fontFamily: "var(--font-mono)",
                fontSize: 12,
                textTransform: "lowercase",
              }}
            >
              no matches.
            </Command.Empty>
            {(["session", "view", "model", "action"] as const).map((group) => {
              const groupItems = items.filter((i) => i.group === group);
              if (groupItems.length === 0) return null;
              return (
                <Command.Group key={group} heading={group} className="palette-group">
                  {groupItems.map((it) => (
                    <Command.Item
                      key={it.id}
                      value={`${it.group} ${it.label} ${it.hint ?? ""}`}
                      onSelect={() => {
                        setOpen(false);
                        void it.run();
                      }}
                      style={{
                        padding: "6px 16px",
                        display: "flex",
                        justifyContent: "space-between",
                        cursor: "pointer",
                        fontFamily: "var(--font-mono)",
                        fontSize: 13,
                        color: "var(--ink)",
                        textTransform: "lowercase",
                      }}
                    >
                      <span>{it.label}</span>
                      {it.hint && (
                        <span
                          className="mono"
                          style={{ color: "var(--ink-ghost)", fontSize: 12 }}
                        >
                          {it.hint}
                        </span>
                      )}
                    </Command.Item>
                  ))}
                </Command.Group>
              );
            })}
          </Command.List>
        </Command>
      </div>
    </div>
  );
}
