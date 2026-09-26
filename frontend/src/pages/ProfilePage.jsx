import { UserRound } from "lucide-react";
import PageShell from "../components/PageShell";
import PageHeader from "../components/PageHeader";
import EmptyState from "../components/EmptyState";

/* Placeholder until profiles are built. Opened from the profile menu. */
export default function ProfilePage({ chrome }) {
  return (
    <PageShell
      chrome={chrome}
      header={<PageHeader title="Profile" subtitle="Your personal details and prompt activity." />}
    >
      <EmptyState
        icon={UserRound}
        title="Your profile is on the way"
        body="Your name, photo, role and a summary of your prompt activity will show up here."
      />
    </PageShell>
  );
}
