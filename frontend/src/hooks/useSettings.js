import { useState } from "react";
import { DEFAULT_SETTINGS } from "../data/settings";

const STORAGE_KEY = "pg-settings";

const readSaved = () => {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) ?? {};
  } catch {
    return {};
  }
};

/* Settings page preferences, kept in localStorage so they survive a reload.
   Unknown or missing keys fall back to DEFAULT_SETTINGS. */
export default function useSettings() {
  const [settings, setSettings] = useState(() => ({ ...DEFAULT_SETTINGS, ...readSaved() }));

  const update = (key, value) =>
    setSettings((current) => {
      const next = { ...current, [key]: value };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        // Storage blocked (private mode): the change still holds for this visit.
      }
      return next;
    });

  return [settings, update];
}
