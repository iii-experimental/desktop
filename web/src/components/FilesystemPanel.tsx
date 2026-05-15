import { useCallback, useEffect, useState } from "react";
import { getIiiClient } from "../lib/iii-client";

interface FsEntry {
  path: string;
  kind: "file" | "dir" | "symlink";
  size?: number;
}

interface Props {
  cwd?: string;
}

export function FilesystemPanel({ cwd }: Props) {
  const [path, setPath] = useState<string>(cwd ?? ".");
  const [entries, setEntries] = useState<FsEntry[]>([]);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (target: string) => {
    setError(null);
    try {
      const client = await getIiiClient();
      const result = await client.call<{ entries?: FsEntry[] }>(
        "harness::call",
        {
          function_id: "shell::fs::ls",
          payload: { path: target },
        },
      );
      setEntries(result.entries ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setEntries([]);
    }
  }, []);

  useEffect(() => {
    void load(path);
  }, [load, path]);

  return (
    <section style={{ padding: 32, overflowY: "auto", height: "100%" }}>
      <div
        style={{
          display: "flex",
          gap: 8,
          alignItems: "center",
          marginBottom: 16,
        }}
      >
        <span className="uppercase-label">cwd</span>
        <input
          className="mono"
          value={path}
          onChange={(e) => setPath(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && load(path)}
          style={{ flex: 1 }}
        />
        <button onClick={() => void load(path)}>Reload</button>
      </div>
      {error && (
        <div className="pill err mono" style={{ marginBottom: 12 }}>
          {error}
        </div>
      )}
      <div className="card" style={{ overflow: "hidden" }}>
        {entries.length === 0 && !error ? (
          <div style={{ padding: 16, color: "var(--muted)" }}>empty</div>
        ) : (
          entries.map((e) => (
            <Row key={e.path} entry={e} onOpen={(p) => setPath(p)} />
          ))
        )}
      </div>
    </section>
  );
}

function Row({
  entry,
  onOpen,
}: {
  entry: FsEntry;
  onOpen: (path: string) => void;
}) {
  const icon = entry.kind === "dir" ? "▸" : entry.kind === "symlink" ? "↗" : " ";
  return (
    <button
      onClick={() => entry.kind === "dir" && onOpen(entry.path)}
      style={{
        display: "grid",
        gridTemplateColumns: "16px 1fr auto",
        gap: 8,
        width: "100%",
        textAlign: "left",
        border: 0,
        borderBottom: "1px solid var(--border-subtle)",
        borderRadius: 0,
        background: "transparent",
        padding: "8px 12px",
      }}
    >
      <span className="mono" style={{ color: "var(--muted)" }}>
        {icon}
      </span>
      <span className="mono">{entry.path}</span>
      {entry.size !== undefined && (
        <span className="mono" style={{ color: "var(--secondary)" }}>
          {entry.size}
        </span>
      )}
    </button>
  );
}
