import { Bot, Settings2, Info } from "lucide-react";
import SettingsCard from "./SettingsCard";
import SelectInput from "../SelectInput";
import { MODELS } from "../../data/settings";
import { btn } from "../../lib/ui";

export default function AiModelCard({ model, onModelChange }) {
  return (
    <SettingsCard
      icon={Bot}
      title="AI Models"
      description="Select your preferred AI model for prompt generation."
      inset
    >
      <div className="flex flex-col gap-3 sm:flex-row">
        <SelectInput
          aria-label="Preferred AI model"
          value={model}
          onChange={onModelChange}
          options={MODELS}
          className="min-w-0 flex-1"
        />
        {/* Hand-off point: open model management once connected models are available. */}
        <button type="button" onClick={() => console.log("Manage models")} className={btn("brandSoft")}>
          <Settings2 className="size-4" strokeWidth={1.75} />
          Manage Models
        </button>
      </div>
      <p className="mt-3 flex items-center gap-2 text-[13px] text-muted">
        <Info className="size-4 shrink-0 text-brand" strokeWidth={1.75} />
        You can change the model anytime while creating a prompt.
      </p>
    </SettingsCard>
  );
}
