import { useCallback, useEffect, useState } from "react";
import { getIiiClient } from "../lib/iii-client";

interface SkillEntry {
  id: string;
  title?: string;
  description?: string;
  type?: string;
  bytes?: number;
  modified_at?: string;
}

interface RegistryWorker {
  name: string;
  version?: string;
  description?: string;
  total_downloads?: number;
  type?: string;
}

type Tab = "skills" | "registry";

export function DirectoryPanel() {
  const [tab, setTab] = useState<Tab>("skills");
  const [skills, setSkills] = useState<SkillEntry[]>([]);
  const [workers, setWorkers] = useState<RegistryWorker[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const client = await getIiiClient();
      const [sk, rw] = await Promise.all([
        client
          .call<{ skills?: SkillEntry[] }>("directory::skills::list", {})
          .catch(() => ({ skills: [] }) as { skills: SkillEntry[] }),
        client
          .call<{ workers?: RegistryWorker[] }>(
            "directory::registry::workers::list",
            { limit: 30 },
          )
          .catch(
            () => ({ workers: [] }) as { workers: RegistryWorker[] },
          ),
      ]);
      setSkills(sk.skills ?? []);
      setWorkers(rw.workers ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return (
    <section
      style={{
        padding: 24,
        overflowY: "auto",
        height: "100%",
        maxWidth: 960,
        margin: "0 auto",
        width: "100%",
        fontFamily: "var(--font-mono)",
      }}
    >
      <header
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 18,
        }}
      >
        <div>
          <div
            style={{
              color: "var(--accent)",
              fontSize: 11,
              textTransform: "uppercase",
              letterSpacing: "0.18em",
              marginBottom: 4,
            }}
          >
            $ directory
          </div>
          <h2
            style={{
              margin: 0,
              fontSize: 18,
              fontWeight: 500,
              textTransform: "lowercase",
              letterSpacing: "-0.01em",
            }}
          >
            installed skills · public registry
          </h2>
        </div>
        <button
          onClick={() => void refresh()}
          disabled={loading}
          style={{ padding: "3px 12px", fontSize: 12 }}
        >
          {loading ? "…" : "refresh"}
        </button>
      </header>

      <div
        style={{
          display: "inline-flex",
          border: "1px solid var(--rule)",
          padding: 2,
          marginBottom: 16,
        }}
      >
        {(["skills", "registry"] as const).map((id) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            data-active={tab === id}
            style={{
              border: 0,
              padding: "3px 14px",
              background: tab === id ? "var(--ink)" : "transparent",
              color: tab === id ? "var(--bg)" : "var(--ink-faint)",
              fontSize: 12,
              textTransform: "lowercase",
            }}
          >
            {id} ({id === "skills" ? skills.length : workers.length})
          </button>
        ))}
      </div>

      {error && (
        <div
          style={{
            border: "1px solid var(--alert)",
            padding: 10,
            color: "var(--alert)",
            fontSize: 12,
            marginBottom: 12,
          }}
        >
          {error}
        </div>
      )}

      {tab === "skills" ? (
        <SkillsList skills={skills} />
      ) : (
        <RegistryList workers={workers} />
      )}
    </section>
  );
}

function SkillsList({ skills }: { skills: SkillEntry[] }) {
  if (skills.length === 0) {
    return (
      <div
        style={{
          padding: 18,
          color: "var(--ink-ghost)",
          fontSize: 12.5,
          border: "1px solid var(--rule)",
          textAlign: "center",
          textTransform: "lowercase",
        }}
      >
        no skills installed. `iii worker add &lt;name&gt;` populates this.
      </div>
    );
  }
  return (
    <div className="card">
      {skills.map((s) => (
        <article
          key={s.id}
          style={{
            padding: "10px 14px",
            borderBottom: "1px solid var(--rule-2)",
            display: "flex",
            flexDirection: "column",
            gap: 4,
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
            <span className="mono" style={{ color: "var(--ink)", fontSize: 13 }}>
              {s.title ?? s.id}
            </span>
            <span
              style={{
                color: "var(--accent)",
                fontSize: 10,
                textTransform: "uppercase",
                letterSpacing: "0.18em",
                fontWeight: 500,
              }}
            >
              {s.type ?? "skill"}
            </span>
          </div>
          <span className="mono" style={{ color: "var(--ink-ghost)", fontSize: 11 }}>
            {s.id}
          </span>
          {s.description && (
            <p
              style={{
                margin: 0,
                color: "var(--ink-faint)",
                fontSize: 12,
                lineHeight: 1.6,
              }}
            >
              {s.description.length > 220
                ? `${s.description.slice(0, 220)}…`
                : s.description}
            </p>
          )}
        </article>
      ))}
    </div>
  );
}

function RegistryList({ workers }: { workers: RegistryWorker[] }) {
  if (workers.length === 0) {
    return (
      <div
        style={{
          padding: 18,
          color: "var(--ink-ghost)",
          fontSize: 12.5,
          border: "1px solid var(--rule)",
          textAlign: "center",
          textTransform: "lowercase",
        }}
      >
        registry unreachable or empty. retry while online.
      </div>
    );
  }
  return (
    <div className="card">
      {workers.map((w) => (
        <article
          key={w.name}
          style={{
            padding: "10px 14px",
            borderBottom: "1px solid var(--rule-2)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
              <span className="mono" style={{ color: "var(--ink)", fontSize: 13 }}>
                {w.name}
              </span>
              {w.version && (
                <span
                  className="mono"
                  style={{ color: "var(--ink-ghost)", fontSize: 11 }}
                >
                  v{w.version}
                </span>
              )}
            </div>
            <span
              style={{
                color: "var(--ink-ghost)",
                fontSize: 11,
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {w.total_downloads !== undefined
                ? `${w.total_downloads} dl`
                : ""}
            </span>
          </div>
          {w.description && (
            <p
              style={{
                margin: "4px 0 0",
                color: "var(--ink-faint)",
                fontSize: 12,
                lineHeight: 1.6,
              }}
            >
              {w.description.length > 220
                ? `${w.description.slice(0, 220)}…`
                : w.description}
            </p>
          )}
          <div
            className="cmd-box"
            style={{ marginTop: 6, fontSize: 11.5 }}
          >
            iii worker add {w.name}
          </div>
        </article>
      ))}
    </div>
  );
}
