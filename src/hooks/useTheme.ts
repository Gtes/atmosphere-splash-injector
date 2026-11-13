import { useCallback, useState } from "react";
import {
  applyTheme,
  nextTheme,
  readStoredTheme,
  writeStoredTheme,
  type ThemeId,
} from "../lib/theme";

export function useTheme() {
  const [theme, setTheme] = useState<ThemeId>(() => readStoredTheme());

  const cycleTheme = useCallback(() => {
    setTheme((current) => {
      const next = nextTheme(current);
      applyTheme(next);
      writeStoredTheme(next);
      return next;
    });
  }, []);

  return { theme, cycleTheme };
}
