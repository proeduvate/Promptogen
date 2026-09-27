import { Settings, Bot, FileText, ShieldCheck, UserRound } from "lucide-react";

export const SETTINGS_TABS = [
  { id: "general", label: "General", icon: Settings },
  { id: "models", label: "AI Models", icon: Bot },
  { id: "defaults", label: "Prompt Defaults", icon: FileText },
  { id: "privacy", label: "Data & Privacy", icon: ShieldCheck },
  { id: "account", label: "Account", icon: UserRound },
];

export const LANGUAGES = [{ value: "en", label: "English" }];

export const MODELS = [
  { value: "GPT-4o", label: "GPT-4o (Recommended)" },
  { value: "Claude 3.5", label: "Claude 3.5" },
  { value: "Gemini", label: "Gemini" },
  { value: "Llama", label: "Llama" },
];

export const OUTPUT_STYLES = [
  { value: "structured", label: "Structured (Recommended)" },
  { value: "bullets", label: "Bulleted list" },
  { value: "prose", label: "Flowing prose" },
  { value: "table", label: "Table / matrix" },
];

export const TONES = [
  { value: "professional", label: "Professional" },
  { value: "friendly", label: "Friendly" },
  { value: "academic", label: "Academic" },
  { value: "persuasive", label: "Persuasive" },
  { value: "technical", label: "Technical" },
];

export const LENGTHS = [
  { value: "short", label: "Short" },
  { value: "medium", label: "Medium" },
  { value: "detailed", label: "Detailed" },
];

/* Every preference on the Settings page, with its starting value.
   Hand-off point: load and save these through the settings API once it exists. */
export const DEFAULT_SETTINGS = {
  language: "en",
  model: "GPT-4o",
  outputStyle: "structured",
  tone: "professional",
  length: "detailed",
  bestPractices: true,
  productUpdates: true,
  weeklySummary: true,
  saveHistory: true,
  usageAnalytics: true,
  modelImprovement: false,
};
