import PageShell from "../components/PageShell";
import PageHeader from "../components/PageHeader";
import AccountCard from "../components/settings/AccountCard";
import AccountActionsCard from "../components/settings/AccountActionsCard";
import PlanUsageCard from "../components/settings/PlanUsageCard";
import SecurityCard from "../components/settings/SecurityCard";
import useSettings from "../hooks/useSettings";

/* Built from the same cards as Settings → Account. Opened from the profile menu. */
export default function ProfilePage({ chrome, onLogout, onUpgrade }) {
  const [settings, update] = useSettings();
  return (
    <PageShell
      chrome={chrome}
      header={<PageHeader title="Profile" subtitle="Your personal details and account." />}
    >
      <div className="grid grid-cols-1 items-start gap-5 min-[1360px]:grid-cols-[minmax(0,1fr)_minmax(0,460px)]">
        <div className="flex min-w-0 flex-col gap-5">
          <AccountCard detailed />
          <PlanUsageCard onUpgrade={onUpgrade} />
        </div>
        <div className="flex min-w-0 flex-col gap-5">
          <SecurityCard settings={settings} onChange={update} onLogout={onLogout} />
          <AccountActionsCard />
        </div>
      </div>
    </PageShell>
  );
}
