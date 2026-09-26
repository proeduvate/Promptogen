import { Settings } from "lucide-react";
import PageShell from "../components/PageShell";
import PageHeader from "../components/PageHeader";
import EmptyState from "../components/EmptyState";

/* Placeholder until account settings are built. Opened from the profile menu. */
export default function SettingsPage({ chrome }) {
  return (
    <PageShell
      chrome={chrome}
      header={<PageHeader title="Settings" subtitle="Manage your account and app preferences." />}
    >
      <EmptyState
        icon={Settings}
        title="Settings are on the way"
        body="Account details, notification preferences and your default AI model will be managed here."
      />
    </PageShell>
  );
}
