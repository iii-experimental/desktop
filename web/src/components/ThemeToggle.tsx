import type { Theme } from "../lib/theme";

interface Props {
  theme: Theme;
  onChange: (theme: Theme) => void;
}

export function ThemeToggle({ theme, onChange }: Props) {
  return (
    <div className="theme-toggle" role="group" aria-label="Theme">
      <button
        type="button"
        data-active={theme === "light"}
        onClick={() => onChange("light")}
      >
        light
      </button>
      <button
        type="button"
        data-active={theme === "dark"}
        onClick={() => onChange("dark")}
      >
        dark
      </button>
    </div>
  );
}
