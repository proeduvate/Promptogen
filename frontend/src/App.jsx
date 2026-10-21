import { useEffect, useState } from "react";
import Sidebar from "./components/Sidebar";
import Footer from "./components/Footer";
import QuestionsModal from "./components/QuestionsModal";
import FeatureRequestModal from "./components/FeatureRequestModal";
import HomePage from "./pages/HomePage";
import GeneratedPromptPage from "./pages/GeneratedPromptPage";
import AnalyticsPage from "./pages/AnalyticsPage";
import MyPromptsPage from "./pages/MyPromptsPage";
import TemplatesPage from "./pages/TemplatesPage";
import SettingsPage from "./pages/SettingsPage";
import ProfilePage from "./pages/ProfilePage";
import FavoritesPage from "./pages/FavoritesPage";
import HistoryPage from "./pages/HistoryPage";
import ModelLabPage from "./pages/ModelLabPage";
import HelpPage from "./pages/HelpPage";
import { PROMPTS } from "./data/library";
import { GENERATED_PROMPT } from "./data/generated";
import { MODELS_CATALOG } from "./data/models";
import { fillVariables } from "./data/templates";
import { detectDomain } from "./lib/analysis";
import { slugify } from "./lib/promptBuilder";
import { SEED_ACTIVITY } from "./data/history";
import { EVALUATION_NOTIFICATION, NOTIFICATIONS } from "./data/notifications";
import useTheme from "./hooks/useTheme";
import useContextProfiles from "./hooks/useContextProfiles";

export default function App() {
  const { theme, preference: themePreference, setPreference: setThemePreference } = useTheme();
  const [activeNav, setActiveNav] = useState("home");
  /* Home has two states: the composer ("landing") and the generated prompt ("result"). */
  const [homeView, setHomeView] = useState("landing");
  const [idea, setIdea] = useState("");
  /* Files and images attached in the composer (names only until upload exists). */
  const [attachments, setAttachments] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [featureOpen, setFeatureOpen] = useState(false);
  /* Mobile/tablet navigation drawer (the sidebar is always visible on lg+). */
  const [navOpen, setNavOpen] = useState(false);
  /* Hand-off point: load and mark-read through the notifications API once it exists. */
  const [notifications, setNotifications] = useState(NOTIFICATIONS);
  /* Hand-off point: load the library and activity timeline from the API. */
  const [prompts, setPrompts] = useState(PROMPTS);
  const [activity, setActivity] = useState(SEED_ACTIVITY);
  /* The prompt open in the workspace (built from the wizard's answers). */
  const [draft, setDraft] = useState(null);
  /* Templates the user converted from their prompts, and prompt feedback.
     Hand-off point: persist both through the API. */
  const [personalTemplates, setPersonalTemplates] = useState([]);
  /* A template picked on Home opens its variables form on Templates. */
  const [templateRequest, setTemplateRequest] = useState(null);
  const [feedback, setFeedback] = useState([]);
  /* Which library prompt My Prompts should open with (e.g. from Favorites). */
  const [librarySelection, setLibrarySelection] = useState(null);
  /* Which Settings tab to open with (e.g. Help → Context Profiles). */
  const [settingsTab, setSettingsTab] = useState("general");
  const contextProfiles = useContextProfiles();

  /* Switching screens starts at the top, like a page load would. */
  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [activeNav, homeView]);

  const markRead = (id) =>
    setNotifications((list) => list.map((item) => (item.id === id ? { ...item, unread: false } : item)));
  const markAllRead = () =>
    setNotifications((list) => list.map((item) => ({ ...item, unread: false })));

  const chrome = {
    theme,
    onThemeChange: setThemePreference,
    notifications,
    onMarkRead: markRead,
    onMarkAllRead: markAllRead,
    navOpen,
    onOpenNav: () => setNavOpen(true),
  };

  const logActivity = (entry) => {
    setActivity((list) => [{ id: `a${Date.now()}${Math.random()}`, at: Date.now(), ...entry }, ...list]);
    /* "Evaluation completed" notifications (spec §55), unless turned off in Settings. */
    let notify = true;
    try {
      notify = JSON.parse(localStorage.getItem("pg-settings"))?.notifyEvaluations !== false;
    } catch {
      // Storage blocked: keep the default.
    }
    if (entry.type === "tested" && notify) {
      setNotifications((list) => [
        { ...EVALUATION_NOTIFICATION, id: `n${Date.now()}`, body: `${entry.prompt}: ${entry.detail} (${entry.title.replace(/^Tested /, "")}).`, createdAt: new Date().toISOString(), unread: true },
        ...list,
      ]);
    }
  };

  const saveToLibrary = (record) =>
    setPrompts((list) =>
      list.some((item) => item.id === record.id)
        ? list.map((item) => (item.id === record.id ? { ...item, ...record } : item))
        : [record, ...list],
    );
  const removeFromLibrary = (id) => setPrompts((list) => list.filter((item) => item.id !== id));

  const toggleFavorite = (id) =>
    setPrompts((list) => list.map((prompt) => (prompt.id === id ? { ...prompt, favorite: !prompt.favorite } : prompt)));

  // Hand-off point: sign the user out / start checkout once auth and billing exist.
  const logout = () => console.log("Log out clicked");
  const upgrade = () => console.log("Upgrade clicked");

  const navigate = (id, tab) => {
    if (id === "my-prompts") setLibrarySelection(null);
    if (id === "templates") setTemplateRequest(null);
    if (id === "settings") setSettingsTab(tab ?? "general");
    setActiveNav(id);
  };

  const openInLibrary = (id) => {
    setLibrarySelection(id);
    setActiveNav("my-prompts");
  };

  const goHome = () => {
    setActiveNav("home");
    setHomeView("landing");
  };

  /* Back to the Home composer with `text` pre-filled and the cursor at its end. */
  const openComposer = (text) => {
    setIdea(text);
    goHome();
    requestAnimationFrame(() => {
      const composer = document.getElementById("pg-idea");
      composer?.focus();
      composer?.setSelectionRange(text.length, text.length);
    });
  };

  const startNewPrompt = () => {
    setAttachments([]);
    openComposer("");
  };

  /* Profile menu actions. Profile and Settings are ordinary screens. */
  const handleProfileAction = (id) => {
    if (id === "feature") setFeatureOpen(true);
    else if (id === "logout") logout();
    else navigate(id);
  };

  const openWorkspace = (prompt) => {
    setDraft({ generatedAt: "Just now", tip: GENERATED_PROMPT.tip, slug: slugify(prompt.title), ...prompt, id: prompt.id ?? `draft-${Date.now()}`, key: Date.now() });
    setActiveNav("home");
    setHomeView("result");
  };

  /* Opens a My Prompts record in the workspace with its versions. */
  const openPromptRecord = (record, initialDialog) => {
    const stored = [...(record.versions ?? [])].reverse();
    const fallback = record.id === "saas-marketing" ? GENERATED_PROMPT.sections : [{ id: "objective", label: "OBJECTIVE", type: "text", content: `${record.title}.` }];
    const versions = (stored.length ? stored : [{ id: "v1", sections: fallback }]).map((version, index) => {
      const number = Number.parseInt(version.id.replace(/\D/g, ""), 10) || index + 1;
      return { id: version.id, number, label: `V${number}`, name: number === 1 ? "Initial version" : `Version ${number}`, note: "", sections: version.sections, createdAt: Date.now(), preferred: false, test: null };
    });
    const current = versions.find((version) => version.id === record.currentVersion) ?? versions[versions.length - 1];
    openWorkspace({
      id: record.id,
      title: record.title,
      domain: record.domain ?? detectDomain(`${record.title} ${record.tags.join(" ")}`),
      modelId: MODELS_CATALOG.find(({ name }) => name.startsWith(record.model))?.id,
      sections: current.sections,
      versions,
      currentVersion: current.id,
      generatedAt: record.created,
      fromLibrary: true,
      favorite: record.favorite,
      initialDialog,
    });
  };

  const useTemplate = (template, values) => {
    setIdea(fillVariables(template.prompt, values).slice(0, 500));
    goHome();
    setModalOpen(true);
  };

  const usePersonalTemplate = (template, values) => {
    const fill = (text) => fillVariables(text, values);
    const sections = template.sections.map((section) =>
      section.type === "text" ? { ...section, content: fill(section.content) } : { ...section, items: section.items.map((item) => ({ ...item, text: fill(item.text) })) },
    );
    const domain = { productivity: "general", creative: "writing" }[template.category] ?? template.category;
    openWorkspace({ title: template.title.replace(/ template$/i, ""), domain, sections, generatedAt: "From your template" });
    logActivity({ type: "created", title: `Created from template “${template.title}”`, prompt: template.title });
  };

  /* The wizard hands back a prompt built from its answers (see lib/promptBuilder). */
  const handleComplete = (prompt) => {
    logActivity({ type: "created", title: `Created “${prompt.title}”`, prompt: prompt.title });
    setModalOpen(false);
    openWorkspace(prompt);
  };

  const renderPage = () => {
    if (activeNav === "analytics") {
      return (
        <AnalyticsPage
          chrome={chrome}
          prompts={prompts}
          activity={activity}
          feedback={feedback}
          onViewAllPrompts={() => openInLibrary(null)}
          onNavigate={navigate}
        />
      );
    }
    if (activeNav === "templates") {
      return (
        <TemplatesPage
          key={templateRequest ?? "templates"}
          chrome={chrome}
          personalTemplates={personalTemplates}
          initialTemplateId={templateRequest}
          onUseTemplate={useTemplate}
          onUsePersonalTemplate={usePersonalTemplate}
        />
      );
    }
    if (activeNav === "settings") {
      return (
        <SettingsPage
          key={settingsTab}
          chrome={chrome}
          themePreference={themePreference}
          onThemePreferenceChange={setThemePreference}
          contextProfiles={contextProfiles}
          initialTab={settingsTab}
          onLogout={logout}
          onUpgrade={upgrade}
        />
      );
    }
    if (activeNav === "profile") {
      return <ProfilePage chrome={chrome} onLogout={logout} onUpgrade={upgrade} />;
    }
    if (activeNav === "my-prompts") {
      return (
        <MyPromptsPage
          key={librarySelection ?? "library"}
          chrome={chrome}
          onNewPrompt={startNewPrompt}
          prompts={prompts}
          onPromptsChange={setPrompts}
          initialSelectedId={librarySelection}
          onOpenPrompt={openPromptRecord}
          onOpenImported={(imported) => {
            logActivity({ type: "created", title: `Imported “${imported.title}”`, prompt: imported.title });
            openWorkspace({ ...imported, generatedAt: "Imported" });
          }}
          onLog={logActivity}
        />
      );
    }
    if (activeNav === "favorites") {
      return (
        <FavoritesPage
          chrome={chrome}
          prompts={prompts}
          onToggleFavorite={toggleFavorite}
          onOpenPrompt={openInLibrary}
          onBrowseLibrary={() => openInLibrary(null)}
        />
      );
    }
    if (activeNav === "history") {
      return <HistoryPage chrome={chrome} activity={activity} />;
    }
    if (activeNav === "model-lab") {
      return <ModelLabPage chrome={chrome} prompts={prompts} onLog={logActivity} />;
    }
    if (activeNav === "guide") {
      return (
        <HelpPage
          chrome={chrome}
          onNavigate={navigate}
          onRequestFeature={() => setFeatureOpen(true)}
          onStartPrompt={startNewPrompt}
        />
      );
    }
    if (activeNav === "home" && homeView === "result") {
      return (
        <GeneratedPromptPage
          key={draft?.key ?? "sample"}
          chrome={chrome}
          prompt={draft ?? undefined}
          onBack={goHome}
          onNewPrompt={startNewPrompt}
          onOpenLibrary={() => openInLibrary(null)}
          onSaveToLibrary={saveToLibrary}
          onRemoveFromLibrary={removeFromLibrary}
          onSaveTemplate={(template) => setPersonalTemplates((list) => [template, ...list])}
          onFeedback={(entry) => setFeedback((list) => [entry, ...list])}
          onLog={logActivity}
        />
      );
    }
    return (
      <HomePage
        chrome={chrome}
        idea={idea}
        onIdeaChange={setIdea}
        onSubmitIdea={() => setModalOpen(true)}
        onViewAnalytics={() => setActiveNav("analytics")}
        attachments={attachments}
        onAttachmentsChange={setAttachments}
        contextProfiles={contextProfiles}
        onManageProfiles={() => navigate("settings", "profiles")}
        prompts={prompts}
        onOpenPrompt={openInLibrary}
        onUseTemplate={(template) => {
          setTemplateRequest(template.id);
          setActiveNav("templates");
        }}
        onNavigate={navigate}
      />
    );
  };

  return (
    <div className="flex min-h-screen bg-bg text-text">
      <Sidebar
        active={activeNav}
        onNavigate={navigate}
        onUpgrade={upgrade}
        onProfileAction={handleProfileAction}
        open={navOpen}
        onClose={() => setNavOpen(false)}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        {renderPage()}
        <Footer />
      </div>

      {modalOpen && (
        <QuestionsModal
          seed={idea}
          profile={contextProfiles.active}
          attachments={attachments}
          onClose={() => setModalOpen(false)}
          onComplete={handleComplete}
        />
      )}

      <FeatureRequestModal
        open={featureOpen}
        onClose={() => setFeatureOpen(false)}
        // Hand-off point: send the request to a feedback API once it exists.
        onSubmit={(request) => console.log("Feature request", request)}
      />
    </div>
  );
}
