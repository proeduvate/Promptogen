import { Layers, Sparkles, SlidersHorizontal } from "lucide-react";
import SettingsCard from "./SettingsCard";

export const EXPERIENCE_MODES = [
  {
    value: "simple",
    label: "Simple",
    icon: Sparkles,
    description: "Recommended. Create, answer questions, check quality, improve, copy and save.",
  },
  {
    value: "advanced",
    label: "Advanced",
    icon: SlidersHorizontal,
    description: "Adds versions, evaluation criteria, regression tests, model parameters, token and cost analysis.",
  },
];

/* Progressive disclosure (spec §40, §68): advanced controls only when wanted. */
export default function ExperienceCard({ value, onChange }) {
  return (
    <SettingsCard icon={Layers} title="Experience Mode" description="Choose how much of Promptogen you want to see.">
      <div role="radiogroup" aria-label="Experience mode" className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {EXPERIENCE_MODES.map(({ value: mode, label, icon: Icon, description }) => {
          const isOn = value === mode;
          return (
            <button
              key={mode}
              type="button"
              role="radio"
              aria-checked={isOn}
              onClick={() => onChange(mode)}
              className={[
                "flex items-start gap-3 rounded-xl border px-4 py-3.5 text-left transition-colors",
                isOn ? "border-brand bg-brand/10" : "border-line bg-surface-2 hover:bg-surface-3",
              ].join(" ")}
            >
              <Icon className={`mt-0.5 size-[18px] shrink-0 ${isOn ? "text-brand" : "text-muted"}`} strokeWidth={1.75} />
              <span className="min-w-0 flex-1">
                <span className="block text-[14px] font-medium">{label}</span>
                <span className="mt-0.5 block text-[12px] leading-5 text-muted">{description}</span>
              </span>
              <span
                aria-hidden
                className={`mt-0.5 grid size-[18px] shrink-0 place-items-center rounded-full border-2 ${isOn ? "border-brand" : "border-line"}`}
              >
                {isOn && <span className="size-2 rounded-full bg-brand" />}
              </span>
            </button>
          );
        })}
      </div>
    </SettingsCard>
  );
}
