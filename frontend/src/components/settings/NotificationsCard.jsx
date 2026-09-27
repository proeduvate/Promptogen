import { Bell } from "lucide-react";
import SettingsCard from "./SettingsCard";
import { ToggleRow } from "../Toggle";

export default function NotificationsCard({ settings, onChange }) {
  return (
    <SettingsCard icon={Bell} title="Notifications" description="Get notified about important updates." inset>
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <ToggleRow
          label="Product Updates"
          description="New features, improvements and announcements."
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
