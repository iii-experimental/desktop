import type { Tab } from "../lib/types";

interface Props {
  tab: Tab;
  setTab: (tab: Tab) => void;
}

const TABS: { id: Tab; label: string; hint: string }[] = [
  { id: "chat", label: "Chat", hint: "⌘1" },
  { id: "cost", label: "Cost", hint: "⌘2" },
  { id: "files", label: "Files", hint: "⌘3" },
  { id: "status", label: "Status", hint: "⌘4" },
];

export function Sidebar({ tab, setTab }: Props) {
  return (
    <aside className="sidebar">
      <div className="logo mono">iii</div>
      <nav aria-label="primary">
        {TABS.map((t) => (
          <button
            key={t.id}
            data-active={tab === t.id}
            onClick={() => setTab(t.id)}
          >
            <span>{t.label}</span>
            <span className="uppercase-label" style={{ float: "right" }}>
              {t.hint}
            </span>
          </button>
        ))}
      </nav>
      <div style={{ flex: 1 }} />
      <div className="uppercase-label">v0.1.0</div>
    </aside>
  );
}
