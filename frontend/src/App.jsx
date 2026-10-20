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
import { SEED_ACTIVITY } from "./data/history";
import { NOTIFICATIONS } from "./data/notifications";
import useTheme from "./hooks/useTheme";

export default function App() {
  const { theme, preference: themePreference, setPreference: setThemePreference } = useTheme();
  const [activeNav, setActiveNav] = useState("home");
  /* Home has two states: the composer ("landing") and the generated prompt ("result"). */
  const [homeView, setHomeView] = useState("landing");
  const [idea, setIdea] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [featureOpen, setFeatureOpen] = useState(false);
  /* Mobile/tablet navigation drawer (the sidebar is always visible on lg+). */
  const [navOpen, setNavOpen] = useState(false);
  /* Hand-off point: load and mark-read through the notifications API once it exists. */
  const [notifications, setNotifications] = useState(NOTIFICATIONS);
  /* Hand-off point: load the library and activity timeline from the API. */
  const [prompts, setPrompts] = useState(PROMPTS);
  const [activity, setActivity] = useState(SEED_ACTIVITY);
  /* Which library prompt My Prompts should open with (e.g. from Favorites). */
  const [librarySelection, setLibrarySelection] = useState(null);

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

  const logActivity = (entry) =>
    setActivity((list) => [{ id: `a${Date.now()}${Math.random()}`, at: Date.now(), ...entry }, ...list]);

  const toggleFavorite = (id) =>
    setPrompts((list) => list.map((prompt) => (prompt.id === id ? { ...prompt, favorite: !prompt.favorite } : prompt)));

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

  const startNewPrompt = () => openComposer("");

  /* Profile menu actions. Profile and Settings are ordinary screens. */
  const handleProfileAction = (id) => {
    if (id === "feature") setFeatureOpen(true);
    // Hand-off point: sign the user out once authentication exists.
    else if (id === "logout") console.log("Log out clicked");
    else setActiveNav(id);
  };

  const handleComplete = (answers) => {
    // Hand-off point: this is where the collected answers go to the
    // prompt-generation API. Until then the result screen shows sample output.
    console.log("Wizard answers", answers);
    setModalOpen(false);
    setActiveNav("home");
    setHomeView("result");
  };

  const renderPage = () => {
    if (activeNav === "analytics") {
      return <AnalyticsPage chrome={chrome} onViewAllPrompts={() => setActiveNav("my-prompts")} />;
    }
    if (activeNav === "templates") {
      return <TemplatesPage chrome={chrome} onUseTemplate={(template) => openComposer(template.prompt)} />;
    }
    if (activeNav === "settings") {
      return (
        <SettingsPage
          chrome={chrome}
          themePreference={themePreference}
          onThemePreferenceChange={setThemePreference}
        />
      );
    }
    if (activeNav === "profile") {
      return <ProfilePage chrome={chrome} />;
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
          onNavigate={setActiveNav}
          onRequestFeature={() => setFeatureOpen(true)}
          onStartPrompt={startNewPrompt}
        />
      );
    }
    if (activeNav === "home" && homeView === "result") {
      return (
        <GeneratedPromptPage
          chrome={chrome}
          onBack={goHome}
          onNewPrompt={startNewPrompt}
          onViewAnalytics={() => setActiveNav("analytics")}
          onOpenLibrary={() => setActiveNav("my-prompts")}
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
      />
    );
  };

  return (
    <div className="flex min-h-screen bg-bg text-text">
      <Sidebar
        active={activeNav}
        onNavigate={(id) => {
          if (id === "my-prompts") setLibrarySelection(null);
          setActiveNav(id);
        }}
        onUpgrade={() => console.log("Upgrade clicked")}
        onProfileAction={handleProfileAction}
        open={navOpen}
        onClose={() => setNavOpen(false)}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        {renderPage()}
        <Footer />
      </div>

      <QuestionsModal
        open={modalOpen}
        seed={idea}
        onClose={() => setModalOpen(false)}
        onComplete={handleComplete}
      />

      <FeatureRequestModal
        open={featureOpen}
        onClose={() => setFeatureOpen(false)}
        // Hand-off point: send the request to a feedback API once it exists.
        onSubmit={(request) => console.log("Feature request", request)}
      />
    </div>
  );
}
