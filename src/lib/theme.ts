export type ThemeId = "dark" | "light";

export const THEME_ORDER: ThemeId[] = ["dark", "light"];

export const THEME_LABEL: Record<ThemeId, string> = {
  dark: "Dark",
  light: "Light",
};

const STORAGE_KEY = "asi-theme";

export function isThemeId(value: string): value is ThemeId {
  return THEME_ORDER.includes(value as ThemeId);
}

export function systemTheme(): ThemeId {
  try {
    if (window.matchMedia("(prefers-color-scheme: light)").matches) {
      return "light";
    }
  } catch {
    // ignore
  }
  return "dark";
}

export function readStoredTheme(): ThemeId {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw && isThemeId(raw)) return raw;
  } catch {
    // ignore
  }
  return systemTheme();
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
  document.documentElement.style.colorScheme = theme;
}

export function nextTheme(current: ThemeId): ThemeId {
  return current === "dark" ? "light" : "dark";
}
