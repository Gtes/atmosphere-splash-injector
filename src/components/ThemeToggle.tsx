import { THEME_LABEL, type ThemeId } from "../lib/theme";

interface ThemeToggleProps {
  theme: ThemeId;
  onCycle: () => void;
}

export function ThemeToggle({ theme, onCycle }: ThemeToggleProps) {
  return (
    <button
      type="button"
      className="theme-toggle ghost"
      onClick={onCycle}
      aria-label={`Theme: ${THEME_LABEL[theme]}. Click to switch.`}
      title="Cycle theme (dark / light / dense)"
    >
      Theme · {THEME_LABEL[theme]}
    </button>
  );
}
