import { useState } from "react";
import PageShell from "../components/PageShell";
import PageHeader from "../components/PageHeader";
import Tabs from "../components/Tabs";
import AppearanceCard from "../components/settings/AppearanceCard";
import ExperienceCard from "../components/settings/ExperienceCard";
import AiModelCard from "../components/settings/AiModelCard";
import ProvidersCard from "../components/settings/ProvidersCard";
import UsageLimitsCard from "../components/settings/UsageLimitsCard";
import PromptDefaultsCard from "../components/settings/PromptDefaultsCard";
import ContextProfilesCard from "../components/settings/ContextProfilesCard";
import NotificationsCard from "../components/settings/NotificationsCard";
import AccountCard from "../components/settings/AccountCard";
import PlanUsageCard from "../components/settings/PlanUsageCard";
import SecurityCard from "../components/settings/SecurityCard";
import PrivacyCard from "../components/settings/PrivacyCard";
import AccountActionsCard from "../components/settings/AccountActionsCard";
import useSettings from "../hooks/useSettings";
import { SETTINGS_TABS } from "../data/settings";

/* General shows the everyday cards (two columns on wide screens); the other
   tabs hold each area in full. Opened from the profile menu. */
export default function SettingsPage({
  chrome,
  themePreference,
  onThemePreferenceChange,
  contextProfiles,
  initialTab = "general",
  onLogout,
  onUpgrade,
}) {
  const [tab, setTab] = useState(initialTab);
  const [settings, update] = useSettings();

  const appearance = (
    <AppearanceCard
      themePreference={themePreference}
      onThemePreferenceChange={onThemePreferenceChange}
      language={settings.language}
      onLanguageChange={(value) => update("language", value)}
    />
  );
  const experience = <ExperienceCard value={settings.experience} onChange={(value) => update("experience", value)} />;
  const model = (
    <AiModelCard
      model={settings.model}
      onModelChange={(value) => update("model", value)}
      onManageModels={() => setTab("models")}
    />
  );
  const defaults = <PromptDefaultsCard settings={settings} onChange={update} />;
  const notifications = <NotificationsCard settings={settings} onChange={update} />;
  const privacy = <PrivacyCard settings={settings} onChange={update} />;

  const sections = {
    models: (
      <>
        {model}
        <ProvidersCard providers={settings.providers} onChange={(value) => update("providers", value)} />
        <UsageLimitsCard settings={settings} onChange={update} />
      </>
    ),
    defaults,
    profiles: (
      <ContextProfilesCard
        profiles={contextProfiles.profiles}
        activeId={contextProfiles.activeId}
        onSave={contextProfiles.saveProfile}
        onDelete={contextProfiles.deleteProfile}
        onSetActive={contextProfiles.setActiveId}
      />
    ),
    privacy: (
      <>
        {privacy}
        <AccountActionsCard />
      </>
    ),
    account: (
      <>
        <AccountCard />
        <PlanUsageCard onUpgrade={onUpgrade} />
        <SecurityCard settings={settings} onChange={update} onLogout={onLogout} />
        <AccountActionsCard />
      </>
    ),
  };

  return (
    <PageShell
      chrome={chrome}
      header={
        <PageHeader
          title="Settings"
          subtitle="Manage your preferences and configure your Promptogen experience."
        />
      }
    >
      <Tabs tabs={SETTINGS_TABS} active={tab} onChange={setTab} className="mb-6" />

      {tab === "general" ? (
        <div className="grid grid-cols-1 items-start gap-5 min-[1360px]:grid-cols-[minmax(0,1fr)_minmax(0,460px)]">
          <div className="flex min-w-0 flex-col gap-5">
            {appearance}
            {experience}
            {model}
            {defaults}
            {notifications}
          </div>
          <div className="flex min-w-0 flex-col gap-5">
            <AccountCard />
            {privacy}
            <AccountActionsCard />
          </div>
        </div>
      ) : (
        <div className="flex max-w-[860px] flex-col gap-5">{sections[tab]}</div>
      )}
    </PageShell>
  );
}
