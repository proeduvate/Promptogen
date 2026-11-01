import { useState, useMemo, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { Search, SlidersHorizontal, ChevronDown, ChevronLeft, ChevronRight, X, Sparkles, Loader2, FolderKanban } from "lucide-react";
import CommunityPromptCard from "../components/library/CommunityPromptCard";
import CommunityPromptDetailPanel from "../components/library/CommunityPromptDetailPanel";
import ErrorMessageBanner from "../components/common/ErrorMessageBanner";
import { fetchLibraryPrompts, fetchLibraryFolders, toggleFavoritePrompt } from "../lib/api";

export default function MyPromptsPage({
  chats = [],
  onFineTuneInChat,
  onUsePromptDirectly,
  onUsePrompt,
  onToggleSidebarCollapse,
  user = null,
  onNavigateLogin = null,
}) {
  const [selectedPromptId, setSelectedPromptId] = useState(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("all"); // "all" | "my-generated" | "trending" | "favorites"
  const [categoryFilter, setCategoryFilter] = useState("All Categories");
  const [modelFilter, setModelFilter] = useState("All Models");
  const [levelFilter, setLevelFilter] = useState("All Levels");
  const [sortBy, setSortBy] = useState("Prompt Strength");
  const [currentPage, setCurrentPage] = useState(1);
  const [savedPromptIds, setSavedPromptIds] = useState(() => {
    try {
      const stored = localStorage.getItem("promptogen_bookmarked_prompt_ids");
      if (stored) return new Set(JSON.parse(stored));
    } catch {}
    return new Set();
  });

  // Backend library data state
  const [backendPrompts, setBackendPrompts] = useState([]);
  const [folders, setFolders] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [apiError, setApiError] = useState(null);

  // Fetch actual data from backend
  const loadLibraryData = useCallback(async () => {
    if (!user) {
      setBackendPrompts([]);
      setFolders([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setApiError(null);
    try {
      const [promptsRes, foldersRes] = await Promise.all([
        fetchLibraryPrompts({ page: 1, pageSize: 50 }),
        fetchLibraryFolders().catch(() => []),
      ]);

      const rawList = promptsRes?.prompts || promptsRes?.items || [];
      if (Array.isArray(rawList)) {
        const mapped = rawList.map((item) => ({
          id: item.id,
          title: item.title,
          description:
            item.description ||
            (item.sections?.[0]?.content) ||
            item.title,
          score: item.score || 85,
          strengthLabel:
            (item.score || 85) >= 90
              ? "Excellent"
              : (item.score || 85) >= 80
              ? "Strong"
              : "Good",
          category: item.folder
            ? item.folder.charAt(0).toUpperCase() + item.folder.slice(1)
            : "General",
          model: item.model || "Gemini 2.5 Flash",
          level: "Advanced",
          tags: item.tags || ["Generated", "AI Scored"],
          author: {
            name: item.createdBy === "you" ? "You" : "Promptogen",
            role: "Prompt Architect",
            avatar:
              "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80",
          },
          rating: 4.9,
          reviewsCount: 1,
          uses: "Active",
          saves: item.favorite ? "Saved" : "Save",
          isBookmarked: Boolean(item.favorite),
          isUserGenerated: item.createdBy === "you",
          fullPromptText:
            item.prompt_text ||
            (item.sections || [])
              .map(
                (s) =>
                  `${s.label || s.title || "SECTION"}:\n${
                    s.content ||
                    (s.items || []).map((i) => `- ${i.text || i}`).join("\n")
                  }`
              )
              .join("\n\n") ||
            item.description ||
            item.title,
          defaultCustomization: {
            productName: item.title,
            primaryGoal: "Refinement & targeted generation",
            targetAudience: "Target domain audience",
            toneStyle: "Professional & actionable",
            additionalDirectives: "",
          },
          communityQuality: {
            rating: "4.9/5",
            successfulUses: "Verified",
            positiveFeedback: "98%",
            verified: true,
          },
          whyPrompt:
            "Synthesized through multi-step analytical gap-filling and verified prompt rubric standards.",
          bestFor: [
            "Direct production use",
            "Fine-tuning in chat",
            "Workflow automation",
          ],
        }));

        setBackendPrompts(mapped);

        // Preload bookmarked IDs merged with saved local storage
        const bookmarked = new Set(
          mapped.filter((p) => p.isBookmarked).map((p) => p.id)
        );
        setSavedPromptIds((prev) => {
          const merged = new Set([...prev, ...bookmarked]);
          try {
            localStorage.setItem("promptogen_bookmarked_prompt_ids", JSON.stringify(Array.from(merged)));
          } catch {}
          return merged;
        });
      }

      if (Array.isArray(foldersRes) && foldersRes.length > 0) {
        setFolders(foldersRes);
      }
    } catch (err) {
      console.error("Library fetch error:", err);
      setApiError(err.message || "Failed to load library prompts from backend.");
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadLibraryData();
  }, [loadLibraryData]);

  // Extract published user-generated prompts from chats (only when explicitly published)
  const userGeneratedPrompts = useMemo(() => {
    if (!user || !chats || chats.length === 0) return [];
    return chats
      .flatMap((g) => g.items || [])
      .filter((item) => (item.isPublished || item.isSaved) && (item.score || item.generatedPromptData || item.fullPrompt))
      .map((item) => ({
        id: item.id,
        title: item.title,
        description:
          item.snippet ||
          item.fullPrompt ||
          item.query ||
          "Structured prompt generated with quality scoring.",
        score: item.score || 91,
        strengthLabel:
          (item.score || 91) >= 90
            ? "Excellent"
            : (item.score || 91) >= 80
            ? "Strong"
            : "Good",
        category: item.taskDomain
          ? item.taskDomain.charAt(0).toUpperCase() + item.taskDomain.slice(1)
          : "Marketing",
        model: item.model || "Gemini 2.5 Flash",
        level: "Advanced",
        tags: ["Generated", "AI Scored"],
        author: {
          name: "You",
          role: "Prompt Creator",
          avatar:
            "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80",
        },
        rating: 5.0,
        reviewsCount: 1,
        uses: "Active",
        saves: "Saved",
        isBookmarked: Boolean(item.isSaved),
        isUserGenerated: true,
        icon: "BarChart2",
        whyPrompt:
          "Synthesized through comprehensive multi-step loophole analysis and quality scoring.",
        bestFor: [
          "Direct production use",
          "Fine-tuning in chat",
          "Workflow automation",
        ],
        defaultCustomization: {
          productName: item.title,
          primaryGoal: "Further optimization and refinement",
          targetAudience: "Target domain audience",
          toneStyle: "Professional and actionable",
          additionalDirectives: "",
        },
        fullPromptText: item.generatedPromptData
          ? typeof item.generatedPromptData === "string"
            ? item.generatedPromptData
            : (item.generatedPromptData.sections || [])
                .map(
                  (s) =>
                    `${s.label || s.title || "SECTION"}:\n${(s.items || [])
                      .map((i) => `- ${i.text || i}`)
                      .join("\n")}`
                )
                .join("\n\n")
          : item.fullPrompt || item.query || item.title,
      }));
  }, [chats]);

  // Combine user-generated prompts with backend-provided prompts (no static files)
  const allPrompts = useMemo(() => {
    if (!user) return [];
    const userIds = new Set(userGeneratedPrompts.map((p) => p.id));
    const uniqueBackend = backendPrompts.filter((p) => !userIds.has(p.id));
    return [...userGeneratedPrompts, ...uniqueBackend];
  }, [user, userGeneratedPrompts, backendPrompts]);

  // Handle escape key to close drawer
  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === "Escape") {
        setIsDrawerOpen(false);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Available filter options
  const categories = useMemo(() => {
    const set = new Set(["All Categories"]);
    folders.forEach((f) => {
      if (f.label && f.id !== "all") set.add(f.label);
    });
    allPrompts.forEach((p) => {
      if (p.category) set.add(p.category);
    });
    return Array.from(set);
  }, [folders, allPrompts]);

  const models = [
    "All Models",
    "Gemini 2.5 Flash",
    "Gemini 2.5 Pro",
    "Gemini 2.0 Flash",
    "GPT-4o",
    "Claude 3.5 Sonnet",
  ];

  const levels = ["All Levels", "Beginner", "Intermediate", "Advanced"];
  const sortOptions = ["Prompt Strength", "Highest Rated", "Most Popular", "Newest"];

  // Filter & Search logic
  const filteredPrompts = useMemo(() => {
    let list = [...allPrompts];

    // Tab filter
    if (activeTab === "my-generated") {
      list = list.filter((p) => p.isUserGenerated);
    } else if (activeTab === "favorites") {
      list = list.filter((p) => savedPromptIds.has(p.id) || p.isBookmarked);
    }

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (p) =>
          p.title.toLowerCase().includes(q) ||
          p.description.toLowerCase().includes(q) ||
          p.tags?.some((t) => t.toLowerCase().includes(q)) ||
          p.author?.name?.toLowerCase().includes(q)
      );
    }

    // Category filter
    if (categoryFilter !== "All Categories") {
      list = list.filter(
        (p) => (p.category || "").toLowerCase() === categoryFilter.toLowerCase()
      );
    }

    // Model filter
    if (modelFilter !== "All Models") {
      list = list.filter((p) =>
        (p.model || "").toLowerCase().includes(modelFilter.toLowerCase())
      );
    }

    // Level filter
    if (levelFilter !== "All Levels") {
      list = list.filter(
        (p) => (p.level || "").toLowerCase() === levelFilter.toLowerCase()
      );
    }

    // Sort logic
    if (sortBy === "Prompt Strength") {
      list.sort((a, b) => (b.score || 0) - (a.score || 0));
    } else if (sortBy === "Highest Rated") {
      list.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    } else if (sortBy === "Newest") {
      list.reverse();
    }

    return list;
  }, [
    allPrompts,
    activeTab,
    searchQuery,
    categoryFilter,
    modelFilter,
    levelFilter,
    sortBy,
    savedPromptIds,
  ]);

  // Pagination
  const pageSize = 9;
  const totalPages = Math.max(1, Math.ceil(filteredPrompts.length / pageSize));
  const paginatedPrompts = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredPrompts.slice(start, start + pageSize);
  }, [filteredPrompts, currentPage, pageSize]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, activeTab, categoryFilter, modelFilter, levelFilter, sortBy]);

  // Selected prompt for detail overview drawer
  const selectedPrompt = useMemo(() => {
    return allPrompts.find((p) => p.id === selectedPromptId) || null;
  }, [allPrompts, selectedPromptId]);

  const handleSelectPrompt = (prompt) => {
    setSelectedPromptId(prompt.id);
    setIsDrawerOpen(true);
    onToggleSidebarCollapse?.(true);
  };

  const handleCloseDrawer = () => {
    setIsDrawerOpen(false);
    setSelectedPromptId(null);
    onToggleSidebarCollapse?.(false);
  };

  const handleToggleBookmark = async (promptId, e) => {
    e?.stopPropagation();
    const next = new Set(savedPromptIds);
    const willSave = !next.has(promptId);
    if (willSave) {
      next.add(promptId);
    } else {
      next.delete(promptId);
    }
    setSavedPromptIds(next);
    try {
      localStorage.setItem("promptogen_bookmarked_prompt_ids", JSON.stringify(Array.from(next)));
    } catch {}

    // Call backend API
    try {
      await toggleFavoritePrompt(promptId);
    } catch (err) {
      console.warn("Could not sync favorite to backend:", err.message);
    }
  };

  return (
    <div className="relative min-h-[calc(100vh-80px)] px-6 pb-28 pt-4 transition-all duration-300">
      <div className="mx-auto max-w-7xl">
        {/* Error Message Banner */}
        {apiError && (
          <ErrorMessageBanner
            error={apiError}
            onRetry={loadLibraryData}
            onDismiss={() => setApiError(null)}
            className="mb-6"
          />
        )}

        {/* Hero Header */}
        <div className="flex flex-col gap-2 pb-6">
          <div className="flex items-center gap-2">
            <span className="text-[12px] font-bold uppercase tracking-wider text-blue-400">
              Community & Saved Prompts
            </span>
            <span className="text-slate-500">•</span>
            <span className="inline-flex items-center gap-1 text-[12px] text-slate-400">
              <Sparkles className="size-3.5 text-blue-400" />
              Quality Scored Library
            </span>
          </div>
          <h1 className="text-[28px] sm:text-[32px] font-extrabold tracking-tight text-white">
            Prompt Library
          </h1>
          <p className="max-w-2xl text-[14px] leading-relaxed text-slate-400">
            Explore and deploy verified prompts engineered with explicit scoring rubrics.
            Take any prompt, adapt its fields, or continue into chat to fine-tune it.
          </p>
        </div>

        {!user ? (
          <div className="mt-8 flex flex-col items-center justify-center text-center p-8 max-w-lg mx-auto rounded-3xl border border-[#1b2740] bg-[#0c1426]/70 shadow-2xl backdrop-blur-md">
            <div className="grid size-16 place-items-center rounded-2xl bg-blue-500/10 text-blue-400 ring-1 ring-blue-500/20 mb-4">
              <FolderKanban className="size-8" />
            </div>
            <h2 className="text-xl font-bold text-white">Prompt Library Locked</h2>
            <p className="mt-2 text-sm text-slate-400 leading-relaxed">
              All prompt templates, saved favorites, and generated prompts are strictly wired to user accounts. When logged out, library data is null.
            </p>
            <div className="mt-6 flex flex-col sm:flex-row items-center gap-3 w-full justify-center">
              <button
                type="button"
                onClick={onNavigateLogin}
                className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-blue-600 font-semibold text-sm text-white hover:bg-blue-500 transition-colors shadow-lg shadow-blue-600/30"
              >
                Log In to Access Library
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Tab Switcher & Search Bar */}
        <div className="flex flex-col gap-4 border-b border-[#141f33] pb-4 lg:flex-row lg:items-center lg:justify-between">
          {/* Tabs */}
          <div className="flex items-center gap-1 overflow-x-auto rounded-xl border border-[#172339] bg-[#090e1a] p-1 text-[13px]">
            <button
              type="button"
              onClick={() => setActiveTab("all")}
              className={`rounded-lg px-3.5 py-1.5 font-medium transition-all ${
                activeTab === "all"
                  ? "bg-blue-600 text-white shadow"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              All Prompts ({allPrompts.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("my-generated")}
              className={`rounded-lg px-3.5 py-1.5 font-medium transition-all ${
                activeTab === "my-generated"
                  ? "bg-blue-600 text-white shadow"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              My Generated ({userGeneratedPrompts.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("favorites")}
              className={`rounded-lg px-3.5 py-1.5 font-medium transition-all ${
                activeTab === "favorites"
                  ? "bg-blue-600 text-white shadow"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Favorites ({savedPromptIds.size})
            </button>
          </div>

          {/* Search Box */}
          <div className="relative flex-1 max-w-md">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-slate-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search prompts by keyword, domain, or role..."
              className="w-full rounded-xl border border-[#17243c] bg-[#0c1426] py-2 pl-9 pr-8 text-[13px] text-slate-100 placeholder:text-slate-500 outline-none transition-colors focus:border-blue-500/80 focus:ring-1 focus:ring-blue-500/40"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
              >
                <X className="size-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Filter Dropdowns Row */}
        <div className="flex flex-wrap items-center justify-between gap-3 py-4">
          <div className="flex flex-wrap items-center gap-2">
            {/* Category Filter */}
            <div className="relative">
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="appearance-none rounded-xl border border-[#172339] bg-[#0c1426] py-1.5 pl-3 pr-8 text-[12px] font-medium text-slate-300 outline-none hover:border-slate-600 focus:border-blue-500"
              >
                {categories.map((c) => (
                  <option key={c} value={c} className="bg-[#0c1322] text-slate-200">
                    {c}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 size-3 text-slate-400" />
            </div>

            {/* Model Filter */}
            <div className="relative">
              <select
                value={modelFilter}
                onChange={(e) => setModelFilter(e.target.value)}
                className="appearance-none rounded-xl border border-[#172339] bg-[#0c1426] py-1.5 pl-3 pr-8 text-[12px] font-medium text-slate-300 outline-none hover:border-slate-600 focus:border-blue-500"
              >
                {models.map((m) => (
                  <option key={m} value={m} className="bg-[#0c1322] text-slate-200">
                    {m}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 size-3 text-slate-400" />
            </div>

            {/* Level Filter */}
            <div className="relative">
              <select
                value={levelFilter}
                onChange={(e) => setLevelFilter(e.target.value)}
                className="appearance-none rounded-xl border border-[#172339] bg-[#0c1426] py-1.5 pl-3 pr-8 text-[12px] font-medium text-slate-300 outline-none hover:border-slate-600 focus:border-blue-500"
              >
                {levels.map((l) => (
                  <option key={l} value={l} className="bg-[#0c1322] text-slate-200">
                    {l}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 size-3 text-slate-400" />
            </div>
          </div>

          {/* Sort By Dropdown */}
          <div className="flex items-center gap-2">
            <span className="text-[12px] text-slate-400">Sort:</span>
            <div className="relative">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="appearance-none rounded-xl border border-[#172339] bg-[#0c1426] py-1.5 pl-3 pr-8 text-[12px] font-medium text-slate-200 outline-none hover:border-slate-600 focus:border-blue-500"
              >
                {sortOptions.map((s) => (
                  <option key={s} value={s} className="bg-[#0c1322] text-slate-200">
                    {s}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 size-3 text-slate-400" />
            </div>
          </div>
        </div>

        {/* Loading Spinner */}
        {isLoading && (
          <div className="flex flex-col items-center justify-center py-24 gap-3">
            <Loader2 className="size-8 text-blue-500 animate-spin" />
            <span className="text-[13px] text-slate-400">Loading prompts from backend...</span>
          </div>
        )}

        {/* Prompts Cards Grid */}
        {!isLoading && paginatedPrompts.length > 0 && (
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
            {paginatedPrompts.map((prompt) => (
              <CommunityPromptCard
                key={prompt.id}
                prompt={prompt}
                isSelected={selectedPromptId === prompt.id && isDrawerOpen}
                isBookmarked={savedPromptIds.has(prompt.id) || prompt.isBookmarked}
                onSelect={() => handleSelectPrompt(prompt)}
                onToggleBookmark={(e) => handleToggleBookmark(prompt.id, e)}
              />
            ))}
          </div>
        )}

        {/* Empty State */}
        {!isLoading && paginatedPrompts.length === 0 && (
          <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-[#1c2942] py-20 px-6 text-center">
            <div className="grid size-12 place-items-center rounded-2xl bg-blue-600/10 text-blue-400 mb-3">
              <FolderKanban className="size-6" />
            </div>
            <h3 className="text-[16px] font-bold text-white">
              {!user && (activeTab === "my-generated" || activeTab === "favorites")
                ? "Guest Mode: No Saved Prompts"
                : "No Prompts Found"}
            </h3>
            <p className="mt-1 max-w-sm text-[13px] text-slate-400">
              {!user && (activeTab === "my-generated" || activeTab === "favorites")
                ? "You are browsing in guest mode. Generated prompts in guest mode are temporary. Log in to permanently save, bookmark, and organize your prompts."
                : searchQuery || categoryFilter !== "All Categories"
                ? "No prompts match your active search or filters. Try adjusting your query."
                : "You haven't generated or saved any prompts yet. Head back to Home to create one!"}
            </p>
            {!user && (
              <button
                type="button"
                onClick={onNavigateLogin}
                className="mt-4 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-5 py-2.5 text-xs font-semibold text-white shadow-md shadow-blue-500/20 hover:brightness-110 transition-all"
              >
                <span>Log In to PromptoGen</span>
              </button>
            )}
          </div>
        )}

        {/* Pagination Bar */}
        {!isLoading && totalPages > 1 && (
          <div className="mt-8 flex items-center justify-between border-t border-[#141f33] pt-4">
            <span className="text-[12px] text-slate-400">
              Showing {(currentPage - 1) * pageSize + 1}-
              {Math.min(currentPage * pageSize, filteredPrompts.length)} of{" "}
              {filteredPrompts.length} prompts
            </span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="grid size-8 place-items-center rounded-lg border border-[#172339] bg-[#0c1426] text-slate-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="size-4" />
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                <button
                  key={page}
                  type="button"
                  onClick={() => setCurrentPage(page)}
                  className={`size-8 rounded-lg text-[12px] font-medium transition-all ${
                    currentPage === page
                      ? "bg-blue-600 text-white font-bold"
                      : "border border-[#172339] bg-[#0c1426] text-slate-400 hover:text-white"
                  }`}
                >
                  {page}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="grid size-8 place-items-center rounded-lg border border-[#172339] bg-[#0c1426] text-slate-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ChevronRight className="size-4" />
              </button>
            </div>
          </div>
        )}
          </>
        )}
      </div>

      {/* Backdrop overlay & Slide-over Right Detail Drawer rendered into body portal (eliminating header overlap) */}
      {isDrawerOpen &&
        selectedPrompt &&
        createPortal(
          <div className="fixed inset-0 z-50 overflow-hidden pointer-events-auto">
            {/* Backdrop */}
            <div
              onClick={handleCloseDrawer}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
            />

            {/* Slide-over Right Detail Drawer */}
            <aside
              className="fixed inset-y-0 right-0 z-50 w-full sm:w-[540px] md:w-[600px] border-l border-[#141f33] bg-[#070d18] shadow-[0_0_60px_rgba(0,0,0,0.8)] flex flex-col h-full transform transition-transform duration-300 ease-in-out overflow-y-auto translate-x-0"
            >
              <CommunityPromptDetailPanel
                isOpen={isDrawerOpen}
                prompt={selectedPrompt}
                onClose={handleCloseDrawer}
                isBookmarked={savedPromptIds.has(selectedPrompt.id) || selectedPrompt.isBookmarked}
                onToggleBookmark={(e) => handleToggleBookmark(selectedPrompt.id, e)}
                onFineTuneInChat={(prompt, customFields) => {
                  handleCloseDrawer();
                  onFineTuneInChat?.(prompt, customFields);
                }}
                onUsePromptDirectly={(prompt) => {
                  handleCloseDrawer();
                  onUsePromptDirectly?.(prompt);
                }}
                onUsePrompt={(prompt, customFields) => {
                  handleCloseDrawer();
                  onUsePrompt?.(prompt, customFields);
                }}
              />
            </aside>
          </div>,
          document.body
        )}
    </div>
  );
}
