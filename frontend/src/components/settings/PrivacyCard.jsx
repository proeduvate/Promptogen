import { ShieldCheck, ArrowRight } from "lucide-react";
import SettingsCard from "./SettingsCard";
import { ToggleRow } from "../Toggle";
import { btn } from "../../lib/ui";

export default function PrivacyCard({ settings, onChange }) {
  return (
    <SettingsCard icon={ShieldCheck} title="Data & Privacy" description="Manage your data and privacy preferences.">
      <div className="space-y-5">
        <ToggleRow
          label="Save prompt history"
          description="Automatically save your generated prompts."
          checked={settings.saveHistory}
          onChange={(value) => onChange("saveHistory", value)}
        />
        <ToggleRow
          label="Allow usage analytics"
          description="Help us improve Promptogen with anonymous usage data."
          checked={settings.usageAnalytics}
          onChange={(value) => onChange("usageAnalytics", value)}
        />
        <ToggleRow
          label="Use data for model improvement"
          description="Allow anonymized data to improve AI models."
          checked={settings.modelImprovement}
          onChange={(value) => onChange("modelImprovement", value)}
        />
      </div>
      {/* Hand-off point: link to the privacy policy once it's published. */}
      <button
        type="button"
        onClick={() => console.log("View privacy policy")}
        className={`${btn("secondary")} mt-6 w-full`}
      >
        View Privacy Policy
        <ArrowRight className="size-4" />
      </button>
    </SettingsCard>
  );
}
