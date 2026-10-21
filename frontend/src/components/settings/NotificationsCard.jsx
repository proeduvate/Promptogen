import { Bell } from "lucide-react";
import SettingsCard from "./SettingsCard";
import { ToggleRow } from "../Toggle";

export default function NotificationsCard({ settings, onChange }) {
  return (
    <SettingsCard
      icon={Bell}
      title="Notifications"
      description="Only useful updates. We never send promotional notifications."
      inset
    >
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <ToggleRow
          label="Shared Prompt Activity"
          description="When someone opens, copies or duplicates a prompt you shared."
          checked={settings.notifySharing}
          onChange={(value) => onChange("notifySharing", value)}
        />
        <ToggleRow
          label="Evaluation Completed"
          description="When a test run or Model Lab comparison finishes."
          checked={settings.notifyEvaluations}
          onChange={(value) => onChange("notifyEvaluations", value)}
        />
        <ToggleRow
          label="Product Updates"
          description="Important new features and improvements."
          checked={settings.productUpdates}
          onChange={(value) => onChange("productUpdates", value)}
        />
        <ToggleRow
          label="Weekly Summary"
          description="Get a weekly summary of your prompt activity."
          checked={settings.weeklySummary}
          onChange={(value) => onChange("weeklySummary", value)}
        />
      </div>
    </SettingsCard>
  );
}
