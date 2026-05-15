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
        background: "rgba(0, 0, 0, 0.55)",
        backdropFilter: "blur(2px)",
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
          background: "var(--elevated)",
          border: "1px solid var(--border)",
          borderRadius: 10,
          overflow: "hidden",
          boxShadow: "0 12px 32px rgba(0,0,0,0.6)",
        }}
      >
        <Command label="Command palette">
          <Command.Input
            autoFocus
            placeholder="Type a command…"
            style={{
              width: "100%",
              border: 0,
              borderBottom: "1px solid var(--border-subtle)",
              padding: "14px 16px",
              outline: "none",
              fontSize: 15,
              background: "transparent",
              color: "var(--foreground)",
              borderRadius: 0,
            }}
          />
          <Command.List
            style={{
              maxHeight: 360,
              overflowY: "auto",
              padding: 6,
            }}
          >
            <Command.Empty style={{ padding: 16, color: "var(--muted)" }}>
              No matches.
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
                        padding: "8px 12px",
                        borderRadius: 6,
                        display: "flex",
                        justifyContent: "space-between",
                        cursor: "pointer",
                      }}
                    >
                      <span>{it.label}</span>
                      {it.hint && (
                        <span
                          className="mono"
                          style={{ color: "var(--muted)", fontSize: 12 }}
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
