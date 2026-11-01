import { useState, useMemo } from "react";
import {
  Search,
  SlidersHorizontal,
  ChevronLeft,
  ChevronRight,
  MoreHorizontal,
  ArrowUpRight,
  BarChart2,
  Code,
  FileText,
  GraduationCap,
  Image as ImageIcon,
  Check,
  Sparkles,
  Share2,
  Copy,
  Star,
} from "lucide-react";

const ICON_MAP = {
  chart: BarChart2,
  code: Code,
  file: FileText,
  graduation: GraduationCap,
  image: ImageIcon,
};

export default function AnalyticsPromptsTable({
  prompts = [],
  selectedPromptId = null,
  onSelectPrompt,
  onUsePrompt,
}) {
  const [activeTab, setActiveTab] = useState("all"); // "all" | "favorites" | "improved" | "templates"
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const [menuOpenId, setMenuOpenId] = useState(null);
  const [copiedId, setCopiedId] = useState(null);

  const pageSize = 5;

  // Filter based on active tab and search query
  const filteredPrompts = useMemo(() => {
    let list = [...prompts];

    if (activeTab === "favorites") {
      list = list.filter((p) => p.isFavorite);
    } else if (activeTab === "improved") {
      list = list.filter((p) => p.isImproved);
    } else if (activeTab === "templates") {
      list = list.filter((p) => p.isTemplate);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (p) =>
          p.title.toLowerCase().includes(q) ||
          p.snippet.toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q) ||
          p.model.toLowerCase().includes(q)
      );
    }

    return list;
  }, [prompts, activeTab, searchQuery]);

  // Pagination calculation
  const totalItems = filteredPrompts.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const startIndex = (currentPage - 1) * pageSize;
  const pagePrompts = filteredPrompts.slice(startIndex, startIndex + pageSize);

  // Tab counts
  const counts = useMemo(() => {
    return {
      all: prompts.length,
      favorites: prompts.filter((p) => p.isFavorite).length || 12,
      improved: prompts.filter((p) => p.isImproved).length || 30,
      templates: prompts.filter((p) => p.isTemplate).length || 8,
    };
  }, [prompts]);

  // Checkbox management
  const handleToggleSelectAll = () => {
    if (selectedIds.size === pagePrompts.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(pagePrompts.map((p) => p.id)));
    }
  };

  const handleToggleRow = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleCopyPrompt = (p) => {
    navigator.clipboard?.writeText(p.snippet || p.title);
    setCopiedId(p.id);
    setTimeout(() => setCopiedId(null), 2000);
    setMenuOpenId(null);
  };

  return (
    <div className="rounded-2xl border border-[#16233b] bg-[#0b1222]/90 p-5 shadow-sm">
      {/* Table Section Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        {/* Title and Tabs */}
        <div className="flex flex-wrap items-center gap-6">
          <h2 className="text-base font-bold tracking-tight text-white">Your Prompts</h2>

          <nav className="flex items-center gap-1">
            {[
              { id: "all", label: `All Prompts (${counts.all})` },
              { id: "favorites", label: `Favorites (${counts.favorites})` },
              { id: "improved", label: `Improved (${counts.improved})` },
              { id: "templates", label: `Templates (${counts.templates})` },
            ].map(({ id, label }) => {
              const isActive = activeTab === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => {
                    setActiveTab(id);
                    setCurrentPage(1);
                  }}
                  className={`relative py-1.5 px-3 text-xs font-medium transition-colors ${
                    isActive
                      ? "text-blue-400 font-semibold"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  {label}
                  {isActive && (
                    <span className="absolute inset-x-3 -bottom-1 h-0.5 rounded-full bg-blue-500" />
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Search & Filter Controls */}
        <div className="flex items-center gap-2.5">
          <div className="relative flex items-center">
            <Search className="pointer-events-none absolute left-3 size-3.5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Search your prompts..."
              className="w-48 sm:w-60 rounded-xl border border-[#1b2740] bg-[#0a101d] py-1.5 pl-8 pr-3 text-xs text-slate-200 placeholder:text-slate-400 outline-none transition-colors focus:border-blue-500/80 focus:ring-1 focus:ring-blue-500/40"
            />
          </div>

          <button
            type="button"
            className="grid size-8 place-items-center rounded-xl border border-[#1b2740] bg-[#0a101d] text-slate-400 transition-colors hover:border-blue-500/40 hover:text-white"
            title="Filter options"
          >
            <SlidersHorizontal className="size-3.5" />
          </button>
        </div>
      </div>

      {/* Prompts Table */}
      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[800px] border-collapse text-left text-xs">
          <thead>
            <tr className="border-b border-[#141f33] text-[11px] font-medium text-slate-400">
              <th className="py-3 pl-2 pr-3 w-8">
                <input
                  type="checkbox"
                  checked={
                    pagePrompts.length > 0 && selectedIds.size === pagePrompts.length
                  }
                  onChange={handleToggleSelectAll}
                  className="size-3.5 rounded border-[#243552] bg-[#080e1a] text-blue-600 focus:ring-0 focus:ring-offset-0 cursor-pointer"
                />
              </th>
              <th className="py-3 px-3 font-medium">Title</th>
              <th className="py-3 px-3 font-medium">Category</th>
              <th className="py-3 px-3 font-medium">Model</th>
              <th className="py-3 px-3 font-medium text-center">Strength</th>
              <th className="py-3 px-3 font-medium text-center">Executions</th>
              <th className="py-3 px-3 font-medium">Last Used</th>
              <th className="py-3 px-3 font-medium">Improvement</th>
              <th className="py-3 pr-2 pl-3 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#141f33]">
            {pagePrompts.length === 0 ? (
              <tr>
                <td colSpan={9} className="py-12 text-center text-slate-500">
                  No prompts found matching your criteria.
                </td>
              </tr>
            ) : (
              pagePrompts.map((prompt) => {
                const isSelected = selectedIds.has(prompt.id);
                const isCurrentActive = selectedPromptId === prompt.id;
                const IconComponent = ICON_MAP[prompt.icon] || BarChart2;

                return (
                  <tr
                    key={prompt.id}
                    onClick={() => onSelectPrompt?.(prompt)}
                    className={`group transition-all cursor-pointer ${
                      isCurrentActive
                        ? "bg-[#0d1a2f] ring-1 ring-blue-500/60 shadow-md"
                        : isSelected
                        ? "bg-blue-950/20"
                        : "hover:bg-[#0c1426]/70"
                    }`}
                  >
                    {/* Checkbox */}
                    <td
                      className="py-3 pl-2 pr-3"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleToggleRow(prompt.id)}
                        className="size-3.5 rounded border-[#243552] bg-[#080e1a] text-blue-600 focus:ring-0 focus:ring-offset-0 cursor-pointer"
                      />
                    </td>

                    {/* Title with Category Icon */}
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-3">
                        <div
                          className={`grid size-8 place-items-center rounded-lg border transition-colors shrink-0 ${
                            isCurrentActive
                              ? "border-blue-400 bg-blue-600/25 text-blue-300"
                              : "border-blue-500/20 bg-blue-600/10 text-blue-400"
                          }`}
                        >
                          <IconComponent className="size-4" />
                        </div>
                        <div className="min-w-0 max-w-[240px] sm:max-w-xs">
                          <div
                            className={`truncate text-xs font-semibold transition-colors ${
                              isCurrentActive
                                ? "text-blue-300"
                                : "text-white group-hover:text-blue-400"
                            }`}
                          >
                            {prompt.title}
                          </div>
                          <div className="truncate text-[11px] text-slate-400">
                            {prompt.snippet}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Category */}
                    <td className="py-3 px-3">
                      <span className="inline-block rounded-lg border border-blue-900/40 bg-[#0d1c33] px-2.5 py-1 text-[11px] font-medium text-blue-400">
                        {prompt.category}
                      </span>
                    </td>

                    {/* Model */}
                    <td className="py-3 px-3 text-slate-300 font-medium">
                      {prompt.model}
                    </td>

                    {/* Strength (Circular Score Badge) */}
                    <td className="py-3 px-3 text-center">
                      <div className="inline-flex size-7 items-center justify-center rounded-full border-2 border-emerald-500/80 bg-emerald-500/10 text-[11px] font-bold text-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.2)]">
                        {prompt.strength}
                      </div>
                    </td>

                    {/* Executions */}
                    <td className="py-3 px-3 text-center text-slate-300 font-medium">
                      {prompt.executions}
                    </td>

                    {/* Last Used */}
                    <td className="py-3 px-3 text-slate-400 whitespace-nowrap">
                      {prompt.lastUsed}
                    </td>

                    {/* Improvement */}
                    <td className="py-3 px-3">
                      <span className="inline-flex items-center gap-0.5 font-semibold text-emerald-400">
                        <ArrowUpRight className="size-3.5 stroke-[2.5]" />
                        {prompt.improvement}
                      </span>
                    </td>

                    {/* Actions Menu */}
                    <td className="py-3 pr-2 pl-3 text-right relative">
                      <button
                        type="button"
                        onClick={() =>
                          setMenuOpenId(menuOpenId === prompt.id ? null : prompt.id)
                        }
                        className="grid size-7 place-items-center rounded-lg text-slate-400 hover:bg-slate-800/60 hover:text-white transition-colors ml-auto"
                      >
                        <MoreHorizontal className="size-4" />
                      </button>

                      {/* Dropdown popup */}
                      {menuOpenId === prompt.id && (
                        <div className="absolute right-2 top-11 z-30 w-44 rounded-xl border border-[#1b2740] bg-[#0c1426] p-1.5 shadow-2xl backdrop-blur-md">
                          <button
                            type="button"
                            onClick={() => {
                              setMenuOpenId(null);
                              onUsePrompt?.(prompt);
                            }}
                            className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs text-slate-300 hover:bg-blue-600/20 hover:text-blue-400 transition-colors"
                          >
                            <Sparkles className="size-3.5" />
                            <span>Use in Composer</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleCopyPrompt(prompt)}
                            className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs text-slate-300 hover:bg-white/5 hover:text-white transition-colors"
                          >
                            {copiedId === prompt.id ? (
                              <Check className="size-3.5 text-emerald-400" />
                            ) : (
                              <Copy className="size-3.5" />
                            )}
                            <span>{copiedId === prompt.id ? "Copied!" : "Copy Snippet"}</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              prompt.isFavorite = !prompt.isFavorite;
                              setMenuOpenId(null);
                            }}
                            className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs text-slate-300 hover:bg-white/5 hover:text-white transition-colors"
                          >
                            <Star className={`size-3.5 ${prompt.isFavorite ? "fill-amber-400 text-amber-400" : ""}`} />
                            <span>{prompt.isFavorite ? "Unfavorite" : "Favorite"}</span>
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Table Pagination Footer */}
      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-t border-[#141f33] pt-4 text-xs">
        <div className="text-slate-400">
          Showing <span className="font-semibold text-slate-200">{Math.min(startIndex + 1, totalItems)}</span> to{" "}
          <span className="font-semibold text-slate-200">
            {Math.min(startIndex + pageSize, totalItems)}
          </span>{" "}
          of <span className="font-semibold text-slate-200">{totalItems}</span> prompts
        </div>

        <div className="flex items-center gap-1.5 self-end sm:self-auto">
          <button
            type="button"
            onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
            disabled={currentPage === 1}
            className="grid size-7 place-items-center rounded-lg border border-[#1b2740] bg-[#0a101d] text-slate-400 transition-colors hover:text-white hover:border-slate-600 disabled:opacity-40 disabled:pointer-events-none"
          >
            <ChevronLeft className="size-3.5" />
          </button>

          {[1, 2, 3, 4, 5].map((pageNum) => (
            <button
              key={pageNum}
              type="button"
              onClick={() => setCurrentPage(pageNum)}
              className={`grid size-7 place-items-center rounded-lg text-xs font-semibold transition-colors ${
                currentPage === pageNum
                  ? "bg-blue-600 text-white shadow-md shadow-blue-600/30"
                  : "border border-[#1b2740] bg-[#0a101d] text-slate-400 hover:text-white hover:border-slate-600"
              }`}
            >
              {pageNum}
            </button>
          ))}

          <span className="px-1 text-slate-600">...</span>

          <button
            type="button"
            onClick={() => setCurrentPage(10)}
            className={`grid size-7 place-items-center rounded-lg border border-[#1b2740] bg-[#0a101d] text-xs font-medium transition-colors ${
              currentPage === 10
                ? "bg-blue-600 text-white"
                : "text-slate-400 hover:text-white hover:border-slate-600"
            }`}
          >
            10
          </button>

          <button
            type="button"
            onClick={() => setCurrentPage((p) => Math.min(p + 1, 10))}
            disabled={currentPage === 10}
            className="grid size-7 place-items-center rounded-lg border border-[#1b2740] bg-[#0a101d] text-slate-400 transition-colors hover:text-white hover:border-slate-600 disabled:opacity-40 disabled:pointer-events-none"
          >
            <ChevronRight className="size-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
