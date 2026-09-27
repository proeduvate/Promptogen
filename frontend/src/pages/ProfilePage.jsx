import PageShell from "../components/PageShell";
import PageHeader from "../components/PageHeader";
import AccountCard from "../components/settings/AccountCard";
import AccountActionsCard from "../components/settings/AccountActionsCard";

/* Built from the same cards as Settings → Account. Opened from the profile menu. */
export default function ProfilePage({ chrome }) {
  return (
    <PageShell
      chrome={chrome}
      header={<PageHeader title="Profile" subtitle="Your personal details and account." />}
    >
      <div className="grid grid-cols-1 items-start gap-5 min-[1360px]:grid-cols-[minmax(0,1fr)_minmax(0,460px)]">
        <AccountCard detailed />
        <AccountActionsCard />
      </div>
    </PageShell>
  );
}
