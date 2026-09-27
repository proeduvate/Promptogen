import { useId } from "react";
import { FileText } from "lucide-react";
import SettingsCard, { Field } from "./SettingsCard";
import SelectInput from "../SelectInput";
import Toggle from "../Toggle";
import { OUTPUT_STYLES, TONES, LENGTHS } from "../../data/settings";

export default function PromptDefaultsCard({ settings, onChange }) {
  const id = useId();
  return (
    <SettingsCard
      icon={FileText}
      title="Prompt Defaults"
      description="Set your default preferences for better results."
      inset
    >
      <div className="grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-2">
        <Field id={`${id}-style`} label="Default Output Style" hint="Output with clear sections, headings and formatting.">
          <SelectInput
            id={`${id}-style`}
            value={settings.outputStyle}
            onChange={(value) => onChange("outputStyle", value)}
            options={OUTPUT_STYLES}
          />
        </Field>
        <Field id={`${id}-tone`} label="Default Tone" hint="Tone for the generated prompts.">
          <SelectInput
            id={`${id}-tone`}
            value={settings.tone}
            onChange={(value) => onChange("tone", value)}
            options={TONES}
          />
        </Field>
        <Field id={`${id}-length`} label="Default Length" hint="Amount of detail in the generated prompt.">
          <SelectInput
            id={`${id}-length`}
            value={settings.length}
            onChange={(value) => onChange("length", value)}
            options={LENGTHS}
          />
        </Field>
        <div>
          <label htmlFor={`${id}-practices`} className="mb-2 block cursor-pointer text-[13px] font-medium">
            Include Best Practices
          </label>
          <div className="flex items-center gap-3 py-2">
            <Toggle
              id={`${id}-practices`}
              checked={settings.bestPractices}
              onChange={(value) => onChange("bestPractices", value)}
              describedBy={`${id}-practices-hint`}
            />
            <p id={`${id}-practices-hint`} className="text-[13px] text-muted">
              Add best practices and examples to the prompt.
            </p>
          </div>
        </div>
      </div>
    </SettingsCard>
  );
}
