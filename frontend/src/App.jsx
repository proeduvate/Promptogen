import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { Loader2, Check, X } from "lucide-react";
import ChatSidebar from "./components/ChatSidebar";
import TopNavHeader from "./components/TopNavHeader";
import BottomNavDock from "./components/BottomNavDock";
import HomePage from "./pages/HomePage";
import AnalyticsPage from "./pages/AnalyticsPage";
import MyPromptsPage from "./pages/MyPromptsPage";
import LoginPage from "./pages/LoginPage";
import ChatHeader from "./components/chat/ChatHeader";
import ChatClarificationView from "./components/chat/ChatClarificationView";
import ChatResultView from "./components/chat/ChatResultView";
import Step2ComingSoonView from "./components/chat/Step2ComingSoonView";
import PageSlideTransition from "./components/common/PageSlideTransition";
import PublishConfirmationModal from "./components/common/PublishConfirmationModal";
import GuestLimitLockModal from "./components/common/GuestLimitLockModal";
import SignOutLoaderModal from "./components/common/SignOutLoaderModal";
import ErrorBoundary from "./components/common/ErrorBoundary";
import { INITIAL_CHATS } from "./data/mockChats";
import {
  startPipeline,
  continuePipeline,
  followUpPipeline,
  saveLibraryPrompt,
  getStoredUser,
  getAuthToken,
  setAuthSession,
  clearAuthSession,
  fetchCurrentUser,
  fetchRateLimitStatus,
  logoutUser,
  resolveProviderForModel,
} from "./lib/api";
import { downloadFile, promptToMarkdown, promptToText } from "./lib/promptText";
import {
  formatPipelineAnswers,
  upsertContextAddition,
  removeContextAddition,
  toContextAdditionsPayload,
} from "./lib/pipelineAnswers";
import { isPromptReadinessEnabled } from "./lib/promptReadinessApi";
import { evaluateGenerationGate } from "./lib/generationGate";
import usePromptReadiness from "./hooks/usePromptReadiness";

function formatTimestamp() {
  return new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function cleanTitle(query) {
  if (!query) return "New Prompt";
  const str = query.trim().replace(/^["']|["']$/g, "");
  if (str.length <= 36) return str;
  const words = str.split(/\s+/);
  if (words.length <= 6) return words.join(" ");
  return words.slice(0, 5).join(" ") + "...";
}

function getRouteFromPath(pathname = window.location.pathname) {
  const p = pathname.toLowerCase();
  if (p === "/login") {
    return "login";
  }
  if (p === "/library" || p === "/my-prompts" || p === "/prompts") {
    return "my-prompts";
  }
  if (p === "/analytics") {
    return "analytics";
  }
  return "home";
}

export default function App() {
  const [theme, setTheme] = useState("dark");
  const [activeNav, setActiveNav] = useState(() => getRouteFromPath()); // "home" | "my-prompts" | "analytics"
  const [homeView, setHomeView] = useState("landing"); // "landing" | "chat" | "result"
  const [selectedModel, setSelectedModel] = useState("gemini-3.5-flash-lite");
  const [apiKeys, setApiKeys] = useState(() => {
    try {
      return {
        gemini: localStorage.getItem("promptogen_gemini_api_key") || "",
        groq: localStorage.getItem("promptogen_groq_api_key") || "",
        openai: localStorage.getItem("promptogen_openai_api_key") || "",
        anthropic: localStorage.getItem("promptogen_anthropic_api_key") || "",
      };
    } catch {
      return { gemini: "", groq: "", openai: "", anthropic: "" };
    }
  });

  const handleApiKeyChange = (key, provider = "gemini") => {
    const prov = (provider || "gemini").toLowerCase();
    setApiKeys((prev) => ({ ...prev, [prov]: key }));
    try {
      const storageKey = `promptogen_${prov}_api_key`;
      if (key) {
        localStorage.setItem(storageKey, key);
      } else {
        localStorage.removeItem(storageKey);
      }
    } catch {
      // ignore localStorage quota errors
    }
  };

  const getKeyForModel = (modelId) => {
    const prov = resolveProviderForModel(modelId);
    return apiKeys[prov] || "";
  };

  const [currentUser, setCurrentUser] = useState(() => getStoredUser());
  const [rateLimitStatus, setRateLimitStatus] = useState(null);
  const [guestLockModalOpen, setGuestLockModalOpen] = useState(false);

  const [chats, setChats] = useState(() => {
    try {
      const user = getStoredUser();
      if (user?.id) {
        const userChatKey = `promptogen_active_chats_${user.id}`;
        const saved = localStorage.getItem(userChatKey);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        }

        // Map all existing chat history and prompt analytics under Dhanush C
        const isDhanush =
          user.email === "dhanush@proeduvate.com" ||
          user.id === "00000000-0000-0000-0000-000000000001" ||
          user.email === "demo@promptogen.ai";

        if (isDhanush) {
          const oldSaved = localStorage.getItem("promptogen_active_chats");
          let seeded = INITIAL_CHATS;
          if (oldSaved) {
            try {
              const oldParsed = JSON.parse(oldSaved);
              if (Array.isArray(oldParsed) && oldParsed.length > 0) seeded = oldParsed;
            } catch {}
          }
          try {
            localStorage.setItem(userChatKey, JSON.stringify(seeded));
          } catch {}
          return seeded;
        }
      }
    } catch (e) {
      console.warn("Could not load stored chats from localStorage:", e);
    }
    // Guest sessions are temporary and unpopulated
    return [];
  });

  const [pipelineError, setPipelineError] = useState(null);

  // Sync chats to user-specific localStorage only when authenticated
  useEffect(() => {
    try {
      if (currentUser?.id) {
        localStorage.setItem(`promptogen_active_chats_${currentUser.id}`, JSON.stringify(chats));
      }
    } catch {
      // ignore localStorage quota errors
    }
  }, [chats, currentUser]);

  // Sync / seed chats whenever authenticated user is loaded or changes
  useEffect(() => {
    if (currentUser?.id) {
      try {
        const userChatKey = `promptogen_active_chats_${currentUser.id}`;
        const saved = localStorage.getItem(userChatKey);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setChats(parsed);
            return;
          }
        }

        const isDhanush =
          currentUser.email === "dhanush@proeduvate.com" ||
          currentUser.id === "00000000-0000-0000-0000-000000000001" ||
          currentUser.email === "demo@promptogen.ai";

        if (isDhanush) {
          const oldSaved = localStorage.getItem("promptogen_active_chats");
          let seeded = INITIAL_CHATS;
          if (oldSaved) {
            try {
              const oldParsed = JSON.parse(oldSaved);
              if (Array.isArray(oldParsed) && oldParsed.length > 0) seeded = oldParsed;
            } catch {}
          }
          setChats(seeded);
          localStorage.setItem(userChatKey, JSON.stringify(seeded));
        }
      } catch (err) {
        console.warn("Could not sync user chats:", err);
      }
    }
  }, [currentUser?.id]);

  // Initial authentication validation and rate limit check
  useEffect(() => {
    fetchRateLimitStatus()
      .then((st) => setRateLimitStatus(st))
      .catch((err) => console.warn("Could not check rate limit status:", err));

    if (getAuthToken()) {
      fetchCurrentUser()
        .then((u) => {
          setCurrentUser(u);
          setAuthSession(getAuthToken(), u);
        })
        .catch(() => {
          clearAuthSession();
          setCurrentUser(null);
        });
    }
  }, []);

  // Keep guest rate limit status dynamic and updated across views (e.g. output prompt page)
  useEffect(() => {
    if (!currentUser) {
      fetchRateLimitStatus()
        .then((st) => setRateLimitStatus(st))
        .catch(() => {});
    }
  }, [homeView, activeNav, currentUser]);

  const handleLoginSuccess = (user) => {
    setCurrentUser(user);
    handleNavigate("home");
    setToastNotification({
      title: "Welcome to PromptoGen!",
      message: `Signed in as ${user.name || user.email}. Unlimited prompt generations unlocked.`,
    });
    fetchRateLimitStatus().then((st) => setRateLimitStatus(st)).catch(() => {});

    try {
      const userChatKey = `promptogen_active_chats_${user.id}`;
      const saved = localStorage.getItem(userChatKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setChats(parsed);
          return;
        }
      }

      const isDhanush =
        user.email === "dhanush@proeduvate.com" ||
        user.id === "00000000-0000-0000-0000-000000000001" ||
        user.email === "demo@promptogen.ai";

      if (isDhanush) {
        const oldSaved = localStorage.getItem("promptogen_active_chats");
        let seeded = INITIAL_CHATS;
        if (oldSaved) {
          try {
            const oldParsed = JSON.parse(oldSaved);
            if (Array.isArray(oldParsed) && oldParsed.length > 0) seeded = oldParsed;
          } catch {}
        }
        setChats(seeded);
        localStorage.setItem(userChatKey, JSON.stringify(seeded));
      } else {
        setChats([]);
      }
    } catch {}
  };

  const [isSigningOut, setIsSigningOut] = useState(false);

  const handleSignOut = async () => {
    setIsSigningOut(true);
    try {
      await Promise.all([
        logoutUser().catch(() => {}),
        new Promise((resolve) => setTimeout(resolve, 1100)),
      ]);
    } finally {
      setCurrentUser(null);
      setChats([]);
      setActiveChatId(null);
      setHomeView("landing");
      handleNavigate("login");
      setIsSigningOut(false);
      setToastNotification({
        title: "Signed Out",
        message: "You have been signed out successfully.",
      });
      fetchRateLimitStatus().then((st) => setRateLimitStatus(st)).catch(() => {});
    }
  };

  const [activeChatId, setActiveChatId] = useState(null);
  const [idea, setIdea] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [publishModalOpen, setPublishModalOpen] = useState(false);
  const [toastNotification, setToastNotification] = useState(null);
  const [selectedAnalyticsPromptId, setSelectedAnalyticsPromptId] = useState(null);

  // Auto-dismiss toast notification after 4 seconds
  useEffect(() => {
    if (!toastNotification) return;
    const timer = setTimeout(() => {
      setToastNotification(null);
    }, 4000);
    return () => clearTimeout(timer);
  }, [toastNotification]);

  /* Theme dataset on html */
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  const chrome = { theme, onThemeChange: setTheme, notifications: 1 };

  // Find currently active chat
  const activeChat =
    chats
      .flatMap((g) => g.items)
      .find((item) => item.id === activeChatId) || null;

  /* ── Prompt Readiness (behind VITE_ENABLE_PROMPT_READINESS / dev stub flag) ── */
  const readinessFeatureEnabled = isPromptReadinessEnabled();
  const readinessChat =
    readinessFeatureEnabled &&
    activeNav === "home" &&
    homeView === "chat" &&
    activeChat &&
    !activeChat.isComplete &&
    !activeChat.error
      ? activeChat
      : null;

  const readinessAnswers = useMemo(
    () =>
      readinessChat
        ? formatPipelineAnswers(readinessChat.backendQuestions, readinessChat.answers, { fillDefaults: false })
        : [],
    [readinessChat?.backendQuestions, readinessChat?.answers]
  );
  const readinessContextAdditions = useMemo(
    () => toContextAdditionsPayload(readinessChat?.contextAdditions),
    [readinessChat?.contextAdditions]
  );

  const readiness = usePromptReadiness({
    enabled: Boolean(readinessChat?.threadId),
    scopeKey: readinessChat ? `${readinessChat.id}::${readinessChat.threadId}` : null,
    threadId: readinessChat?.threadId || null,
    answers: readinessAnswers,
    contextAdditions: readinessContextAdditions,
    additionalContext: String(readinessChat?.answers?.additional_context || ""),
  });

  // Message shown when the readiness gate refuses a generation request.
  const [generationNotice, setGenerationNotice] = useState(null); // { chatId, message }
  const generationInFlightRef = useRef(false);

  // A new readiness result replaces any earlier "blocked" message.
  useEffect(() => {
    setGenerationNotice(null);
  }, [readiness.data?.requestId, activeChatId]);

  /* Browser Back/Forward navigation listener */
  useEffect(() => {
    const handlePopState = () => {
      const route = getRouteFromPath();
      handleNavigate(route, false);
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  /* Navigate between main pages with browser URL history synchronization */
  const handleNavigate = (navId, pushHistory = true) => {
    const normalized =
      navId === "library" || navId === "my-prompts" || navId === "prompts"
        ? "my-prompts"
        : navId;

    setActiveNav(normalized);

    if (pushHistory) {
      let targetPath = "/";
      if (normalized === "my-prompts") targetPath = "/library";
      else if (normalized === "analytics") targetPath = "/analytics";
      else if (normalized === "login") targetPath = "/login";

      if (window.location.pathname.toLowerCase() !== targetPath) {
        window.history.pushState({ nav: normalized }, "", targetPath);
      }
    }

    // Default sidebar to uncollapsed across all main pages
    setSidebarCollapsed(false);

    if (normalized === "home") {
      if (activeChat && !activeChat.isComplete) {
        setHomeView("chat");
      } else if (activeChat && activeChat.isComplete) {
        setHomeView("result");
      } else {
        setHomeView("landing");
      }
    }
  };

  /* Navigate to Home Composer */
  const goHome = () => {
    handleNavigate("home");
    setHomeView("landing");
  };

  /* Action: User starts a new chat */
  const handleNewChat = () => {
    setIdea("");
    setActiveChatId(null);
    goHome();
    requestAnimationFrame(() => {
      document.getElementById("pg-prompt-input")?.focus();
    });
  };

  /* Action: User selects a chat from the sidebar */
  const handleSelectChat = (chatItem) => {
    setActiveChatId(chatItem.id);
    setActiveNav("home");
    setSidebarCollapsed(false);
    setIsSaved(Boolean(chatItem.isSaved));

    if (chatItem.isComplete) {
      setHomeView("result");
    } else {
      setHomeView("chat");
    }
  };

  /* Action: User renames active chat title */
  const handleRenameActiveChat = (newTitle) => {
    if (!activeChatId) return;
    setChats((prev) =>
      prev.map((group) => ({
        ...group,
        items: group.items.map((item) =>
          item.id === activeChatId ? { ...item, title: newTitle } : item
        ),
      }))
    );
  };

  /* Action: User types prompt on Home and hits Enter */
  const handleStartChatFromPrompt = async (promptQuery, attachment = null) => {
    const query = promptQuery.trim() || idea.trim();
    if (!query && !attachment) return;

    // Check IP lock if user is not authenticated
    if (!currentUser && rateLimitStatus?.locked) {
      setGuestLockModalOpen(true);
      return;
    }

    const newChatId = `chat-${Date.now()}`;
    const generatedTitle = cleanTitle(query || attachment?.name || "Uploaded Document Analysis");

    // Initial chat state with Step 1 and defaults
    const newChat = {
      id: newChatId,
      title: generatedTitle,
      status: "Creating structured prompt...",
      timestamp: formatTimestamp(),
      query: query,
      attachment: attachment,
      step: 1,
      answers: {},
      contextAdditions: [],
      isComplete: false,
      isSubmitting: false,
      threadId: null,
      backendQuestions: [],
      depthAnalysis: null,
      taskDomain: "general",
      taskIntent: "",
      isSufficient: false,
      model: selectedModel,
      generatedPromptData: null,
      conversation: [],
      score: 92,
      metrics: {
        clarity: 92,
        specificity: 88,
        context: 85,
        structure: 90,
        actionability: 94,
      },
    };

    // 1. Immediately prepend to Today in chats sidebar
    setChats((prev) => {
      const todayGroup = prev.find((g) => g.group === "Today");
      const otherGroups = prev.filter((g) => g.group !== "Today");
      return [
        {
          group: "Today",
          items: [newChat, ...(todayGroup ? todayGroup.items : [])],
        },
        ...otherGroups,
      ];
    });

    // 2. Set as active chat and transition to Chat Question UI
    setActiveChatId(newChatId);
    setActiveNav("home");
    setSidebarCollapsed(false);
    setHomeView("chat");
    setIdea("");

    // 3. Initiate backend pipeline in background using selected Gemini model
    setPipelineError(null);
    try {
      const modelToUse = selectedModel;
      const startRes = await startPipeline(query, {
        model: modelToUse,
        apiKey: getKeyForModel(modelToUse),
        provider: resolveProviderForModel(modelToUse),
        attachment: attachment,
      });
      if (startRes && startRes.thread_id) {
        setChats((prev) =>
          prev.map((group) => ({
            ...group,
            items: group.items.map((item) =>
              item.id === newChatId
                ? {
                    ...item,
                    title: startRes.prompt_title || item.title,
                    threadId: startRes.thread_id,
                    backendQuestions: startRes.questions || [],
                    isSufficient: Boolean(startRes.is_sufficient),
                    taskDomain: startRes.task_domain || "general",
                    taskIntent: startRes.task_intent || "",
                    depthAnalysis: startRes.depth_analysis || null,
                    status: "Awaiting clarification",
                    error: null,
                  }
                : item
            ),
          }))
        );

        if (!currentUser) {
          fetchRateLimitStatus().then((st) => setRateLimitStatus(st)).catch(() => {});
        }
      }
    } catch (err) {
      console.error("Pipeline start error:", err);
      const isLimitError =
        err.status === 429 ||
        (err.message && err.message.toLowerCase().includes("guest generation limit"));

      if (isLimitError) {
        fetchRateLimitStatus().then((st) => setRateLimitStatus(st)).catch(() => {});
        setGuestLockModalOpen(true);
        setChats((prev) =>
          prev
            .map((g) => ({ ...g, items: g.items.filter((i) => i.id !== newChatId) }))
            .filter((g) => g.items.length > 0)
        );
        setActiveChatId(null);
        setHomeView("landing");
        return;
      }

      const errorMsg = err.message || "Failed to communicate with AI model.";
      setPipelineError(errorMsg);
      setChats((prev) =>
        prev.map((group) => ({
          ...group,
          items: group.items.map((item) =>
            item.id === newChatId
              ? {
                  ...item,
                  status: "Analysis error",
                  error: errorMsg,
                }
              : item
          ),
        }))
      );
    }
  };

  /* Action: Retry pipeline start if initial analysis failed */
  const handleRetryPipelineStart = async () => {
    if (!activeChat) return;
    setPipelineError(null);
    const chatId = activeChat.id;
    const query = activeChat.query;

    setChats((prev) =>
      prev.map((group) => ({
        ...group,
        items: group.items.map((item) =>
          item.id === chatId
            ? { ...item, status: "Creating structured prompt...", error: null }
            : item
        ),
      }))
    );

    try {
      const modelToUse = activeChat.model || selectedModel;
      const startRes = await startPipeline(query, {
        model: modelToUse,
        apiKey: getKeyForModel(modelToUse),
        provider: resolveProviderForModel(modelToUse),
      });
      if (startRes && startRes.thread_id) {
        setChats((prev) =>
          prev.map((group) => ({
            ...group,
            items: group.items.map((item) =>
              item.id === chatId
                ? {
                    ...item,
                    threadId: startRes.thread_id,
                    backendQuestions: startRes.questions || [],
                    isSufficient: Boolean(startRes.is_sufficient),
                    taskDomain: startRes.task_domain || "general",
                    taskIntent: startRes.task_intent || "",
                    depthAnalysis: startRes.depth_analysis || null,
                    status: "Awaiting clarification",
                    error: null,
                  }
                : item
            ),
          }))
        );
      }
    } catch (err) {
      console.error("Retry pipeline start error:", err);
      const errorMsg = err.message || "Failed to communicate with AI model.";
      setPipelineError(errorMsg);
      setChats((prev) =>
        prev.map((group) => ({
          ...group,
          items: group.items.map((item) =>
            item.id === chatId
              ? {
                  ...item,
                  status: "Analysis error",
                  error: errorMsg,
                }
              : item
          ),
        }))
      );
    }
  };

  /* Action: User selects a different model in AI Model panel */
  const handleSelectModel = (modelId) => {
    setSelectedModel(modelId);
    if (activeChatId) {
      setChats((prev) =>
        prev.map((group) => ({
          ...group,
          items: group.items.map((item) =>
            item.id === activeChatId
              ? { ...item, model: modelId, error: null }
              : item
          ),
        }))
      );
      setPipelineError(null);
    }
  };

  /* Action: Update in-progress answers or step for active chat */
  const handleUpdateAnswers = (updatedAnswers, newStep = null) => {
    if (!activeChatId) return;

    setChats((prev) =>
      prev.map((group) => ({
        ...group,
        items: group.items.map((item) => {
          if (item.id === activeChatId) {
            const resolvedAnswers =
              typeof updatedAnswers === "function"
                ? updatedAnswers(item.answers || {})
                : { ...(item.answers || {}), ...updatedAnswers };
            return {
              ...item,
              answers: resolvedAnswers,
              step: newStep !== null ? newStep : item.step,
            };
          }
          return item;
        }),
      }))
    );
  };

  /* Action: Complete generation on Step 4 or via Skip Questions */
  const handleCompleteGeneration = async (finalAnswers = null) => {
    if (!activeChat) return;
    // Prevent double submission (e.g. two quick clicks before state updates).
    if (generationInFlightRef.current) return;
    generationInFlightRef.current = true;

    const currentChat = activeChat;
    const answersToUse = finalAnswers || currentChat.answers || {};

    // Immediately transition homeView to "result" and show synthesis loader
    setHomeView("result");
    setIsGenerating(true);
    setPipelineError(null);

    // Set loading state on chat
    setChats((prev) =>
      prev.map((group) => ({
        ...group,
        items: group.items.map((item) =>
          item.id === currentChat.id
            ? { ...item, isSubmitting: true, status: "Optimizing prompt..." }
            : item
        ),
      }))
    );

    try {
      let result = null;

      // If we have a backend threadId, continue pipeline with answers
      if (currentChat.threadId && currentChat.backendQuestions?.length > 0) {
        const formattedAnswers = formatPipelineAnswers(currentChat.backendQuestions, answersToUse, {
          fillDefaults: true,
        });

        if (formattedAnswers.length > 0) {
          const modelToUse = currentChat.model || selectedModel;
          result = await continuePipeline(currentChat.threadId, formattedAnswers, {
            model: modelToUse,
            apiKey: getKeyForModel(modelToUse),
            provider: resolveProviderForModel(modelToUse),
            // Saved Add Details entries and free-form context travel with generation.
            contextAdditions: toContextAdditionsPayload(currentChat.contextAdditions),
            additionalContext: String(answersToUse.additional_context || ""),
          });
        }
      }

      if (!result) {
        throw new Error("Prompt generation failed: No response received from AI model.");
      }

      const finalPromptData = {
        ...result,
        sections: result.sections || [],
        required_attachments: result.required_attachments || [],
        model: selectedModel,
      };

      const initialConversation = [
        {
          id: `msg_u_init`,
          role: "user",
          text: currentChat.query,
          timestamp: currentChat.timestamp || formatTimestamp(),
        },
        {
          id: `msg_p_1`,
          role: "assistant",
          type: "prompt",
          version: 1,
          versionLabel: "v1: Initial Synthesis",
          title: result.prompt_title || currentChat.title,
          promptData: finalPromptData,
          score: result.overall_score || 90,
          timestamp: formatTimestamp(),
        },
      ];

      // Update chat with real generated adaptive prompt data
      setChats((prev) =>
        prev.map((group) => ({
          ...group,
          items: group.items.map((item) =>
            item.id === currentChat.id
              ? {
                  ...item,
                  title: result.prompt_title || item.title,
                  isComplete: true,
                  isSubmitting: false,
                  status: "Ready",
                  generatedPromptData: finalPromptData,
                  conversation:
                    item.conversation && item.conversation.length > 0
                      ? item.conversation
                      : initialConversation,
                  score: result.overall_score || 90,
                  metrics: {
                    clarity: result.clarity || 90,
                    specificity: result.specificity || 90,
                    context: result.context || 90,
                    structure: result.structure || 90,
                    actionability: result.actionability || 90,
                  },
                }
              : item
          ),
        }))
      );

      setHomeView("result");
      if (!currentUser) {
        fetchRateLimitStatus().then((st) => setRateLimitStatus(st)).catch(() => {});
      }
    } catch (err) {
      console.error("Pipeline completion error:", err);
      const errorMsg = err.message || "Failed to continue pipeline.";
      setPipelineError(errorMsg);
      setHomeView("chat");
      setChats((prev) =>
        prev.map((group) => ({
          ...group,
          items: group.items.map((item) =>
            item.id === currentChat.id
              ? {
                  ...item,
                  isSubmitting: false,
                  status: "Synthesis error",
                  error: errorMsg,
                }
              : item
          ),
        }))
      );
    } finally {
      setIsGenerating(false);
      generationInFlightRef.current = false;
    }
  };

  /* Common generation boundary for the adaptive-question workspace.
     Every route (final step, readiness panel, Skip Questions, fast-track) passes through
     the readiness gate here, so a disabled button is never the only protection. */
  const requestGeneration = (mode, finalAnswers = null) => {
    if (!activeChat) return false;
    if (generationInFlightRef.current || isGenerating || activeChat.isSubmitting) return false;

    const gate = evaluateGenerationGate({
      featureEnabled: readinessFeatureEnabled,
      readiness,
      mode,
    });
    if (!gate.allowed) {
      setGenerationNotice({ chatId: activeChat.id, message: gate.reason });
      return false;
    }

    setGenerationNotice(null);
    handleCompleteGeneration(finalAnswers);
    return true;
  };

  /* Action: Save a gap-specific detail (merged by gap_id; answers and step untouched) */
  const handleSaveContextAddition = (entry) => {
    if (!activeChatId || !entry?.gap_id) return;
    readiness.requestImmediateRefresh();
    setChats((prev) =>
      prev.map((group) => ({
        ...group,
        items: group.items.map((item) =>
          item.id === activeChatId
            ? { ...item, contextAdditions: upsertContextAddition(item.contextAdditions, entry) }
            : item
        ),
      }))
    );
  };

  const handleRemoveContextAddition = (gapId) => {
    if (!activeChatId) return;
    readiness.requestImmediateRefresh();
    setChats((prev) =>
      prev.map((group) => ({
        ...group,
        items: group.items.map((item) =>
          item.id === activeChatId
            ? { ...item, contextAdditions: removeContextAddition(item.contextAdditions, gapId) }
            : item
        ),
      }))
    );
  };

  /* Action: Save free-form context (same field the bottom input already uses) */
  const handleSaveAdditionalContext = (value) => {
    readiness.requestImmediateRefresh();
    handleUpdateAnswers((prev) => ({ ...(prev || {}), additional_context: value }));
  };

  /* Action: Star / unstar chat */
  const handleToggleStarChat = (chatId) => {
    setChats((prev) =>
      prev.map((group) => ({
        ...group,
        items: group.items.map((item) =>
          item.id === chatId ? { ...item, isStarred: !item.isStarred } : item
        ),
      }))
    );
  };

  /* Action: Navigate directly to prompt analytics */
  const handleViewPromptAnalytics = (promptOrChat) => {
    const targetId = promptOrChat?.id || activeChat?.id;
    setSelectedAnalyticsPromptId(targetId);
    handleNavigate("analytics");
  };

  /* Action: Confirm publishing to library with category & tags from popup */
  const handleConfirmPublish = async (publishOptions) => {
    if (!activeChat?.generatedPromptData) return;
    try {
      await saveLibraryPrompt({
        title: activeChat.title,
        model: activeChat.model || "Gemini 3.5 Flash-Lite",
        folder: publishOptions?.category || activeChat.taskDomain || "general",
        tags: publishOptions?.tags?.length ? publishOptions.tags : ["Generated", "AI Scored"],
        score: activeChat.score || 92,
        sections: activeChat.generatedPromptData.sections,
      });

      setIsSaved(true);
      setChats((prev) =>
        prev.map((group) => ({
          ...group,
          items: group.items.map((item) =>
            item.id === activeChat.id ? { ...item, isSaved: true, isPublished: true } : item
          ),
        }))
      );

      setToastNotification({
        title: "Successfully Published!",
        message: `"${activeChat.title}" is now added to the Prompt Library.`,
        actionLabel: "View in Library",
        onAction: () => handleNavigate("my-prompts"),
      });

      setTimeout(() => setToastNotification(null), 6000);
    } catch (err) {
      console.warn("Saved locally:", err.message);
      setIsSaved(true);
      setChats((prev) =>
        prev.map((group) => ({
          ...group,
          items: group.items.map((item) =>
            item.id === activeChat.id ? { ...item, isSaved: true, isPublished: true } : item
          ),
        }))
      );
      setToastNotification({
        title: "Published Locally",
        message: `"${activeChat.title}" added to your personal library collection.`,
        actionLabel: "View in Library",
        onAction: () => handleNavigate("my-prompts"),
      });
      setTimeout(() => setToastNotification(null), 6000);
    }
  };

  /* Action: Export prompt in markdown, json, or text */
  const handleExport = (format) => {
    if (!activeChat?.generatedPromptData) return;
    const data = activeChat.generatedPromptData;
    const filename = `${activeChat.title.toLowerCase().replace(/\s+/g, "-")}.${format === "json" ? "json" : format === "markdown" ? "md" : "txt"}`;

    if (format === "json") {
      downloadFile(filename, JSON.stringify(data, null, 2), "application/json");
    } else if (format === "markdown") {
      downloadFile(filename, promptToMarkdown(data), "text/markdown");
    } else {
      downloadFile(filename, promptToText(data), "text/plain");
    }
  };

  /* Action: Follow-up conversational prompt refinement */
  const handleFollowUp = async (followUpText) => {
    if (!activeChat || !followUpText?.trim()) return;

    const currentChat = activeChat;
    const text = followUpText.trim();
    const timestamp = formatTimestamp();

    // Base conversation history
    const baseConv =
      currentChat.conversation && currentChat.conversation.length > 0
        ? currentChat.conversation
        : [
            {
              id: "msg_u_init",
              role: "user",
              text: currentChat.query,
              timestamp: currentChat.timestamp || timestamp,
            },
            {
              id: "msg_p_1",
              role: "assistant",
              type: "prompt",
              version: 1,
              versionLabel: "v1: Initial Synthesis",
              title: currentChat.title,
              promptData: currentChat.generatedPromptData || {},
              score: currentChat.score || 90,
              timestamp: currentChat.timestamp || timestamp,
            },
          ];

    const userMsgId = `msg_u_${Date.now()}`;
    const loadingMsgId = `msg_load_${Date.now()}`;

    const updatedConv = [
      ...baseConv,
      {
        id: userMsgId,
        role: "user",
        text,
        timestamp,
      },
      {
        id: loadingMsgId,
        role: "assistant",
        type: "loading",
        message: "Analyzing context delta & synthesizing refined prompt...",
        timestamp,
      },
    ];

    // Optimistically update conversation with user message and loading state
    setChats((prev) =>
      prev.map((group) => ({
        ...group,
        items: group.items.map((item) =>
          item.id === currentChat.id
            ? { ...item, conversation: updatedConv, isSubmitting: true }
            : item
        ),
      }))
    );

    // Advanced Model Context Reduction:
    // Extract key user directives across turns rather than sending raw verbose tokens
    const userDirectives = updatedConv
      .filter((c) => c.role === "user")
      .map((c, i) => `Turn ${i + 1}: ${c.text}`)
      .join(" | ");

    const promptCount = baseConv.filter((c) => c.type === "prompt").length;
    const nextVersion = promptCount + 1;

    try {
      const modelToUse = currentChat.model || selectedModel;
      const response = await followUpPipeline(currentChat.threadId, text, {
        model: modelToUse,
        apiKey: getKeyForModel(modelToUse),
        provider: resolveProviderForModel(modelToUse),
        currentPrompt: currentChat.generatedPromptData?.optimized_prompt,
        historySummary: userDirectives,
      });

      if (response.action === "clarify") {
        // Model chose to ask targeted clarifying questions
        const clarifyItem = {
          id: `msg_c_${Date.now()}`,
          role: "assistant",
          type: "clarification",
          questions: response.questions || [],
          reasoning:
            response.reasoning ||
            "To refine the prompt with high accuracy, please clarify these details:",
          timestamp: formatTimestamp(),
        };

        setChats((prev) =>
          prev.map((group) => ({
            ...group,
            items: group.items.map((item) =>
              item.id === currentChat.id
                ? {
                    ...item,
                    isSubmitting: false,
                    conversation: updatedConv.map((c) => (c.id === loadingMsgId ? clarifyItem : c)),
                  }
                : item
            ),
          }))
        );
      } else {
        // Model refined the prompt!
        const promptItem = {
          id: `msg_p_${nextVersion}`,
          role: "assistant",
          type: "prompt",
          version: nextVersion,
          versionLabel: response.version_label || `v${nextVersion}: Refined`,
          title: response.prompt_title || currentChat.title,
          promptData: {
            ...response,
            model: currentChat.model || selectedModel,
          },
          score: response.overall_score || currentChat.score || 92,
          timestamp: formatTimestamp(),
        };

        setChats((prev) =>
          prev.map((group) => ({
            ...group,
            items: group.items.map((item) =>
              item.id === currentChat.id
                ? {
                    ...item,
                    title: response.prompt_title || item.title,
                    isSubmitting: false,
                    generatedPromptData: promptItem.promptData,
                    score: response.overall_score || item.score,
                    metrics: {
                      clarity: response.clarity || 92,
                      specificity: response.specificity || 90,
                      context: response.context || 90,
                      structure: response.structure || 92,
                      actionability: response.actionability || 94,
                    },
                    conversation: updatedConv.map((c) => (c.id === loadingMsgId ? promptItem : c)),
                  }
                : item
            ),
          }))
        );
      }
    } catch (err) {
      console.error("Follow-up refinement error:", err);
      const errorItem = {
        id: `msg_err_${Date.now()}`,
        role: "assistant",
        type: "error",
        error: err.message || "Failed to refine prompt.",
        timestamp: formatTimestamp(),
      };

      setChats((prev) =>
        prev.map((group) => ({
          ...group,
          items: group.items.map((item) =>
            item.id === currentChat.id
              ? {
                  ...item,
                  isSubmitting: false,
                  conversation: updatedConv.map((c) => (c.id === loadingMsgId ? errorItem : c)),
                }
              : item
          ),
        }))
      );
    }
  };

  /* Render Central Content based on activeNav and homeView */
  const renderContent = () => {
    // 0. Dedicated Login Page
    if (activeNav === "login") {
      return (
        <LoginPage
          onLoginSuccess={handleLoginSuccess}
          onBack={() => handleNavigate("home")}
        />
      );
    }

    // 1. Library Page
    if (activeNav === "my-prompts" || activeNav === "library") {
      return (
        <MyPromptsPage
          chats={chats}
          user={currentUser}
          onNavigateLogin={() => handleNavigate("login")}
          onToggleSidebarCollapse={(collapsed) => setSidebarCollapsed(collapsed)}
          onFineTuneInChat={(prompt, customFields) => {
            let fineTuneQuery = `Fine-tune and optimize prompt: "${prompt.title}"\n`;
            if (customFields) {
              if (customFields.productName) fineTuneQuery += `Product/Subject: ${customFields.productName}\n`;
              if (customFields.primaryGoal) fineTuneQuery += `Goal: ${customFields.primaryGoal}\n`;
              if (customFields.targetAudience) fineTuneQuery += `Target Audience: ${customFields.targetAudience}\n`;
              if (customFields.toneStyle) fineTuneQuery += `Tone & Style: ${customFields.toneStyle}\n`;
              if (customFields.additionalDirectives?.trim()) {
                fineTuneQuery += `Fine-Tuning Directives: ${customFields.additionalDirectives.trim()}\n`;
              }
            }
            fineTuneQuery += `\nBase Prompt Reference:\n${prompt.fullPromptText || prompt.description}`;
            handleStartChatFromPrompt(fineTuneQuery);
          }}
          onUsePromptDirectly={(prompt) => {
            setIdea(prompt.fullPromptText || prompt.description);
            handleNavigate("home");
            setHomeView("landing");
          }}
          onUsePrompt={(prompt, customFields) => {
            let customizedQuery = prompt.description || prompt.title;
            if (customFields) {
              customizedQuery = `Create a ${prompt.title} for "${customFields.productName || "FocusFlow"}" targeting ${customFields.targetAudience || "remote professionals"} to ${customFields.primaryGoal || "increase user acquisition"} with a ${customFields.toneStyle || "professional and actionable"} style.`;
            }
            handleStartChatFromPrompt(customizedQuery);
          }}
        />
      );
    }

    // 2. Analytics Page
    if (activeNav === "analytics") {
      return (
        <AnalyticsPage
          chrome={chrome}
          chats={chats}
          user={currentUser}
          onNavigateLogin={() => handleNavigate("login")}
          initialSelectedPromptId={selectedAnalyticsPromptId}
          onViewAllPrompts={() => handleNavigate("my-prompts")}
          onUsePrompt={(prompt) => {
            const query = prompt.snippet || prompt.title;
            handleStartChatFromPrompt(query);
          }}
          onToggleSidebarCollapse={(collapsed) => setSidebarCollapsed(collapsed)}
        />
      );
    }

    // 3. Home View: Question UI (ChatClarificationView)
    if (activeNav === "home" && homeView === "chat" && activeChat) {
      return (
        <ChatClarificationView
          chat={activeChat}
          error={activeChat.error || pipelineError}
          onRetryStart={handleRetryPipelineStart}
          onUpdateAnswers={handleUpdateAnswers}
          onCompleteGeneration={(answers) => requestGeneration("standard", answers)}
          onSkipQuestions={() => requestGeneration("skip", activeChat.answers)}
          selectedModel={activeChat.model || selectedModel}
          onSelectModel={handleSelectModel}
          geminiApiKey={getKeyForModel(activeChat.model || selectedModel)}
          onGeminiApiKeyChange={(k, prov) =>
            handleApiKeyChange(k, prov || resolveProviderForModel(activeChat.model || selectedModel))
          }
          readiness={readinessFeatureEnabled ? readiness : null}
          contextAdditions={activeChat.contextAdditions || []}
          onSaveContextAddition={handleSaveContextAddition}
          onRemoveContextAddition={handleRemoveContextAddition}
          onSaveAdditionalContext={handleSaveAdditionalContext}
          onGenerate={() => requestGeneration("standard")}
          onGenerateAnyway={() => requestGeneration("anyway")}
          generationNotice={
            generationNotice?.chatId === activeChat.id ? generationNotice.message : null
          }
          onDismissGenerationNotice={() => setGenerationNotice(null)}
          isGenerating={isGenerating}
        />
      );
    }

    // 4. Home View: Structured Adaptive Prompt Result
    if (activeNav === "home" && homeView === "result" && activeChat) {
      if (isGenerating || activeChat.isSubmitting) {
        return (
          <div className="flex flex-1 flex-col items-center justify-center p-20">
            <div className="flex flex-col items-center gap-4 text-center">
              <span className="grid size-14 place-items-center rounded-2xl bg-blue-500/10 text-blue-400 ring-1 ring-blue-500/20">
                <Loader2 className="size-7 animate-spin" />
              </span>
              <h2 className="text-[20px] font-semibold text-white">
                Synthesizing Final Adaptive Prompt...
              </h2>
              <p className="max-w-md text-[14px] text-slate-400">
                Packaging task context, dynamic requirements, edge cases, and input attachments with {activeChat.model || selectedModel}.
              </p>
            </div>
          </div>
        );
      }

      return (
        <ErrorBoundary
          title="Unable to display generated prompt"
          onNavigateHome={() => {
            setActiveNav("home");
            setHomeView("landing");
          }}
        >
          <ChatResultView
            chat={activeChat}
            onFollowUp={handleFollowUp}
            onRegenerate={() => handleCompleteGeneration()}
            onCreateVersion={() => {
              const vCount = (activeChat.versions?.length || 1) + 1;
              alert(`Created snapshot Version ${vCount} for "${activeChat.title}".`);
            }}
            onSaveToLibrary={() => setPublishModalOpen(true)}
            onViewAnalytics={() => handleViewPromptAnalytics(activeChat)}
            onExport={(format) => handleExport(format)}
            isSaved={Boolean(activeChat.isSaved || isSaved)}
          />
        </ErrorBoundary>
      );
    }

    // 5. Default: Home Landing Composer
    return (
      <HomePage
        idea={idea}
        onIdeaChange={setIdea}
        onSubmitIdea={(promptVal, att) => handleStartChatFromPrompt(promptVal || idea, att)}
        isGenerating={isGenerating}
        onViewAnalytics={() => handleNavigate("analytics")}
        onViewAllExamples={() => handleNavigate("my-prompts")}
        selectedModel={selectedModel}
        onSelectModel={setSelectedModel}
        chats={chats}
        user={currentUser}
        rateLimitStatus={rateLimitStatus}
        onNavigateLogin={() => handleNavigate("login")}
      />
    );
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#070b14] text-slate-100 antialiased selection:bg-blue-600/30">
      {/* ── LEFT SIDEBAR (Completely intact & stationary with independent scroller) ── */}
      <ChatSidebar
        chats={chats}
        activeChatId={activeChatId}
        onSelectChat={handleSelectChat}
        onNewChat={handleNewChat}
        isOpen={sidebarOpen}
        isCollapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed((prev) => !prev)}
        onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
        onToggleStarChat={handleToggleStarChat}
      />

      {/* ── MAIN VIEWPORT (Independent vertical scroll container) ── */}
      <div className="flex min-w-0 flex-1 flex-col h-screen overflow-hidden relative">
        {/* Sticky Top Header */}
        <div className="shrink-0 z-20">
          {activeNav === "home" &&
          (homeView === "chat" || homeView === "result") &&
          activeChat ? (
            <ChatHeader
              title={activeChat.title}
              onRenameTitle={handleRenameActiveChat}
              modelName={activeChat.model || selectedModel || "gemini-3.5-flash-lite"}
              createdTime={activeChat.timestamp ? `Created today at ${activeChat.timestamp}` : "Created just now"}
              theme={theme}
              onThemeChange={setTheme}
              notifications={1}
              isCollapsed={sidebarCollapsed}
              onToggleCollapse={() => setSidebarCollapsed((prev) => !prev)}
              onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
              onUpgrade={() => console.log("Upgrade clicked")}
              isStarred={Boolean(activeChat.isStarred)}
              onToggleStar={() => handleToggleStarChat(activeChat.id)}
              user={currentUser}
              onLoginClick={() => handleNavigate("login")}
              onSignOut={handleSignOut}
              rateLimitStatus={rateLimitStatus}
            />
          ) : (
            <TopNavHeader
              theme={theme}
              onThemeChange={setTheme}
              notifications={1}
              isCollapsed={sidebarCollapsed}
              onToggleCollapse={() => setSidebarCollapsed((prev) => !prev)}
              onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
              onUpgrade={() => console.log("Upgrade clicked")}
              user={currentUser}
              onLoginClick={() => handleNavigate("login")}
              onSignOut={handleSignOut}
              rateLimitStatus={rateLimitStatus}
            />
          )}
        </div>

        {/* Scrollable Main Area (Independent scroller from sidebar) */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden relative">
          <ErrorBoundary
            onNavigateHome={() => {
              setActiveNav("home");
              setHomeView("landing");
            }}
          >
            <PageSlideTransition currentKey={activeNav}>
              {renderContent()}
            </PageSlideTransition>
          </ErrorBoundary>
        </main>

        {/* Floating Bottom Navigation Dock */}
        <BottomNavDock
          active={activeNav}
          onNavigate={handleNavigate}
        />

        {/* ── Guest Rate Limit Lock Modal ── */}
        <GuestLimitLockModal
          isOpen={guestLockModalOpen}
          onClose={() => setGuestLockModalOpen(false)}
          onNavigateLogin={() => {
            setGuestLockModalOpen(false);
            handleNavigate("login");
          }}
          onGoogleSignIn={() => {
            setGuestLockModalOpen(false);
            handleNavigate("login");
          }}
        />

        {/* ── Publish Confirmation Modal ── */}
        <PublishConfirmationModal
          isOpen={publishModalOpen}
          onClose={() => setPublishModalOpen(false)}
          onConfirm={handleConfirmPublish}
          promptTitle={activeChat?.title || "Structured Prompt"}
          promptScore={activeChat?.score || 92}
          initialCategory={activeChat?.taskDomain || "General"}
        />

        {/* ── Sign Out Pop Loader Modal ── */}
        <SignOutLoaderModal isOpen={isSigningOut} />

        {/* ── In-App Toast Notification ── */}
        {toastNotification && (
          <div className="fixed bottom-22 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 rounded-2xl border border-emerald-500/30 bg-[#07131e]/95 py-3 px-5 shadow-2xl backdrop-blur-xl animate-in fade-in slide-in-from-bottom-5 duration-300">
            <div className="grid size-7 place-items-center rounded-xl bg-emerald-500/20 text-emerald-400">
              <Check className="size-4 stroke-[2.5]" />
            </div>
            <div className="text-xs">
              <p className="font-semibold text-white">{toastNotification.title}</p>
              <p className="text-slate-400">{toastNotification.message}</p>
            </div>
            {toastNotification.actionLabel && (
              <button
                type="button"
                onClick={toastNotification.onAction}
                className="ml-2 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-500 transition-colors"
              >
                {toastNotification.actionLabel}
              </button>
            )}
            <button
              type="button"
              onClick={() => setToastNotification(null)}
              className="text-slate-500 hover:text-white p-1 ml-1"
            >
              <X className="size-3.5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
