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

/* A saved choice wins; until the user picks one, follow the OS setting live.
   The inline script in index.html applies the same rule before first paint
   so the page never flashes the wrong theme. */
export default function useTheme() {
  const [theme, setThemeState] = useState(
    () => readSaved() ?? (systemQuery().matches ? "dark" : "light"),
  );

  /* Theme lives on <html> so the CSS variables in index.css swap globally. */
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  useEffect(() => {
    const query = systemQuery();
    const onChange = (event) => {
      if (!readSaved()) setThemeState(event.matches ? "dark" : "light");
    };
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, []);

  const setTheme = (next) => {
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Storage blocked (private mode): the choice still holds for this visit.
    }
    setThemeState(next);
  };

  return [theme, setTheme];
}
