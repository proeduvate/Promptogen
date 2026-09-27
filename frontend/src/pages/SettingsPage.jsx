import { useState } from "react";
import PageShell from "../components/PageShell";
import PageHeader from "../components/PageHeader";
import Tabs from "../components/Tabs";
import AppearanceCard from "../components/settings/AppearanceCard";
import AiModelCard from "../components/settings/AiModelCard";
import PromptDefaultsCard from "../components/settings/PromptDefaultsCard";
import NotificationsCard from "../components/settings/NotificationsCard";
import AccountCard from "../components/settings/AccountCard";
import PrivacyCard from "../components/settings/PrivacyCard";
import AccountActionsCard from "../components/settings/AccountActionsCard";
import useSettings from "../hooks/useSettings";
import { SETTINGS_TABS } from "../data/settings";

/* General shows every card (two columns on wide screens); the other tabs
   show just their own section. Opened from the profile menu. */
export default function SettingsPage({ chrome, themePreference, onThemePreferenceChange }) {
  const [tab, setTab] = useState("general");
  const [settings, update] = useSettings();

  const appearance = (
    <AppearanceCard
      themePreference={themePreference}
      onThemePreferenceChange={onThemePreferenceChange}
      language={settings.language}
      onLanguageChange={(value) => update("language", value)}
    />
  );
  const model = <AiModelCard model={settings.model} onModelChange={(value) => update("model", value)} />;
  const defaults = <PromptDefaultsCard settings={settings} onChange={update} />;
  const notifications = <NotificationsCard settings={settings} onChange={update} />;
  const privacy = <PrivacyCard settings={settings} onChange={update} />;

  const sections = {
    models: model,
    defaults,
    privacy,
    account: (
      <>
        <AccountCard />
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
