import { Monitor, Sun, Moon, Globe } from "lucide-react";
import SettingsCard from "./SettingsCard";
import SelectInput from "../SelectInput";
import { LANGUAGES } from "../../data/settings";

const THEME_OPTIONS = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System", icon: Monitor },
];

const LANGUAGE_OPTIONS = [
  ...LANGUAGES,
  { value: "more", label: "More languages coming soon", disabled: true },
];

/* The theme choice is the same one the top-bar switch controls; "System"
   follows the OS setting. */
export default function AppearanceCard({ themePreference, onThemePreferenceChange, language, onLanguageChange }) {
  return (
    <SettingsCard icon={Monitor} title="Appearance" description="Customize how Promptogen looks and feels.">
      <div role="radiogroup" aria-label="Theme" className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {THEME_OPTIONS.map(({ value, label, icon: Icon }) => {
          const isOn = themePreference === value;
          return (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={isOn}
              onClick={() => onThemePreferenceChange(value)}
              className={[
                "flex items-center gap-3 rounded-xl border px-4 py-3.5 text-left text-[14px] transition-colors",
                isOn ? "border-brand bg-brand/10 font-medium" : "border-line bg-surface-2 hover:bg-surface-3",
              ].join(" ")}
            >
              <Icon className={`size-[18px] ${isOn ? "text-brand" : "text-muted"}`} strokeWidth={1.75} />
              <span className="flex-1">{label}</span>
              <span
                aria-hidden
                className={[
                  "grid size-[18px] shrink-0 place-items-center rounded-full border-2",
                  isOn ? "border-brand" : "border-line",
                ].join(" ")}
              >
                {isOn && <span className="size-2 rounded-full bg-brand" />}
              </span>
            </button>
          );
        })}
      </div>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <Globe className="mt-0.5 size-5 shrink-0 text-muted" strokeWidth={1.75} />
          <div>
            <label htmlFor="pg-language" className="block text-[14px] font-medium">
              Language
            </label>
            <p className="text-[13px] text-muted">Choose your preferred language for the interface.</p>
          </div>
        </div>
        <SelectInput
          id="pg-language"
          value={language}
          onChange={onLanguageChange}
          options={LANGUAGE_OPTIONS}
          className="sm:w-[320px]"
        />
      </div>
    </SettingsCard>
  );
}
