import { useState } from "react";
import { DEFAULT_SETTINGS, DETAIL_LEVELS, MODELS } from "../data/settings";

const OLD_LENGTHS = { short: "concise", medium: "balanced" };

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
  const [settings, setSettings] = useState(() => {
    const merged = { ...DEFAULT_SETTINGS, ...readSaved() };
    // Model ids changed from display names to catalog ids; fall back if unknown.
    if (!MODELS.some(({ value }) => value === merged.model)) merged.model = DEFAULT_SETTINGS.model;
    merged.length = OLD_LENGTHS[merged.length] ?? merged.length;
    if (!DETAIL_LEVELS.some(({ value }) => value === merged.length)) merged.length = DEFAULT_SETTINGS.length;
    return merged;
  });

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
