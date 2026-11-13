export type ThemeId = "dark" | "light" | "dense";

export const THEME_ORDER: ThemeId[] = ["dark", "light", "dense"];

export const THEME_LABEL: Record<ThemeId, string> = {
  dark: "Dark",
  light: "Light",
  dense: "Dense",
};

const STORAGE_KEY = "asi-theme";

export function isThemeId(value: string): value is ThemeId {
  return THEME_ORDER.includes(value as ThemeId);
}

export function readStoredTheme(): ThemeId {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw && isThemeId(raw)) return raw;
  } catch {
    // ignore
  }
  return "dark";
}

export function writeStoredTheme(theme: ThemeId): void {
  try {
    localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    // ignore
  }
}

export function applyTheme(theme: ThemeId): void {
  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = theme === "light" ? "light" : "dark";
}

export function nextTheme(current: ThemeId): ThemeId {
  const index = THEME_ORDER.indexOf(current);
  return THEME_ORDER[(index + 1) % THEME_ORDER.length] ?? "dark";
}
