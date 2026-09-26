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
import { NOTIFICATIONS } from "./data/notifications";
import useTheme from "./hooks/useTheme";

export default function App() {
  const [theme, setTheme] = useTheme();
  const [activeNav, setActiveNav] = useState("home");
  /* Home has two states: the composer ("landing") and the generated prompt ("result"). */
  const [homeView, setHomeView] = useState("landing");
  const [idea, setIdea] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [featureOpen, setFeatureOpen] = useState(false);
  /* Hand-off point: load and mark-read through the notifications API once it exists. */
  const [notifications, setNotifications] = useState(NOTIFICATIONS);

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
    onThemeChange: setTheme,
    notifications,
    onMarkRead: markRead,
    onMarkAllRead: markAllRead,
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
      return <SettingsPage chrome={chrome} />;
    }
    if (activeNav === "profile") {
      return <ProfilePage chrome={chrome} />;
    }
    if (activeNav === "my-prompts") {
      return <MyPromptsPage chrome={chrome} onNewPrompt={startNewPrompt} />;
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
    // Nav items without a screen yet still fall back to the Home dashboard.
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
        onNavigate={setActiveNav}
        onUpgrade={() => console.log("Upgrade clicked")}
        onProfileAction={handleProfileAction}
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
