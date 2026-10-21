import { useEffect, useState } from "react";

const STORAGE_KEY = "pg-theme";

const systemQuery = () => window.matchMedia("(prefers-color-scheme: dark)");

const readSaved = () => {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    return value === "light" || value === "dark" ? value : null;
  } catch {
    return null;
  }
};

/* `preference` is what the user picked: "light", "dark" or "system" (nothing
   saved, so follow the OS live). `theme` is the resolved "light" / "dark".
   The inline script in index.html applies the same rule before first paint
   so the page never flashes the wrong theme. */
export default function useTheme() {
  const [preference, setPreferenceState] = useState(() => readSaved() ?? "system");
  const [systemTheme, setSystemTheme] = useState(() => (systemQuery().matches ? "dark" : "light"));
  const theme = preference === "system" ? systemTheme : preference;

  /* Theme lives on <html> so the CSS variables in index.css swap globally. */
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  useEffect(() => {
    const query = systemQuery();
    const onChange = (event) => setSystemTheme(event.matches ? "dark" : "light");
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, []);

  const setPreference = (next) => {
    try {
      if (next === "system") localStorage.removeItem(STORAGE_KEY);
      else localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Storage blocked (private mode): the choice still holds for this visit.
    }
    setPreferenceState(next);
  };

  return { theme, preference, setPreference };
}
