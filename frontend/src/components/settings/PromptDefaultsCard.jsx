import { useId } from "react";
import { FileText } from "lucide-react";
import SettingsCard, { Field } from "./SettingsCard";
import SelectInput from "../SelectInput";
import Toggle, { ToggleRow } from "../Toggle";
import { OUTPUT_STYLES, TONES, DETAIL_LEVELS } from "../../data/settings";

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
        <Field id={`${id}-length`} label="Default Detail Level" hint="Amount of detail in the generated prompt. You can override it per prompt.">
          <SelectInput
            id={`${id}-length`}
            value={settings.length}
            onChange={(value) => onChange("length", value)}
            options={DETAIL_LEVELS}
          />
        </Field>
        <div>
          <label htmlFor={`${id}-practices`} className="mb-2 block cursor-pointer text-[13px] font-medium">
            Automatically Include Best Practices
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
      <div className="mt-6 border-t border-line pt-5">
        <h3 className="text-[14px] font-semibold">Learned preferences and questions</h3>
        <p className="mt-0.5 text-[13px] text-muted">Suggested from your feedback and insights in Analytics. Change them any time.</p>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <ToggleRow label="Include examples by default" description="Pre-answers “Should the AI include examples?” with Yes." checked={settings.preferExamples} onChange={(value) => onChange("preferExamples", value)} />
          <ToggleRow label="Prefer step-by-step instructions" description="Suggests a step-by-step output format." checked={settings.preferSteps} onChange={(value) => onChange("preferSteps", value)} />
          <ToggleRow label="Ask about edge cases" description="Adds an edge-case question to Development prompts." checked={settings.askEdgeCases} onChange={(value) => onChange("askEdgeCases", value)} />
          <ToggleRow label="Always ask about output format" description="Makes the output format question required." checked={settings.askOutputFormat} onChange={(value) => onChange("askOutputFormat", value)} />
        </div>
      </div>
    </SettingsCard>
  );
}
