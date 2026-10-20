import { Settings, Bot, FileText, ShieldCheck, UserRound, Contact } from "lucide-react";
import { MODELS_CATALOG } from "./models";

export const SETTINGS_TABS = [
  { id: "general", label: "General", icon: Settings },
  { id: "models", label: "AI Models", icon: Bot },
  { id: "defaults", label: "Prompt Defaults", icon: FileText },
  { id: "profiles", label: "Context Profiles", icon: Contact },
  { id: "privacy", label: "Data & Privacy", icon: ShieldCheck },
  { id: "account", label: "Account", icon: UserRound },
];

export const LANGUAGES = [{ value: "en", label: "English" }];

export const MODELS = MODELS_CATALOG.map(({ id, name }) => ({
  value: id,
  label: id === "gpt-4o" ? `${name} (Recommended)` : name,
}));

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

/* Default Detail Level (spec §39). */
export const DETAIL_LEVELS = [
  { value: "concise", label: "Concise" },
  { value: "balanced", label: "Balanced" },
  { value: "detailed", label: "Detailed" },
];

/* Every preference on the Settings page, with its starting value.
   Hand-off point: load and save these through the settings API once it exists. */
export const DEFAULT_SETTINGS = {
  language: "en",
  model: "gpt-4o",
  outputStyle: "structured",
  tone: "professional",
  length: "balanced",
  bestPractices: true,
  experience: "simple",
  notifySharing: true,
  productUpdates: true,
  notifyEvaluations: true,
  weeklySummary: true,
  providers: {},
  monthlyBudget: 20,
  maxTokensPerRun: 4096,
  budgetAlerts: true,
  twoFactor: false,
  connectedAccounts: { google: true },
  saveHistory: true,
  usageAnalytics: true,
  modelImprovement: false,
};
