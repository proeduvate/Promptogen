import { useState, useMemo } from "react";
import { Plus, Search, MessageSquare, PanelLeft, X, Star } from "lucide-react";
import logoWithIcon from "../assets/logo_with_icon_transparent.png";
import iconLogo from "../assets/icon_logo_clean.png";

export default function ChatSidebar({
  chats,
  activeChatId,
  onSelectChat,
  onNewChat,
  isOpen = true,
  isCollapsed = false,
  onToggleCollapse,
  onToggleSidebar,
  onToggleStarChat,
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [showStarredOnly, setShowStarredOnly] = useState(false);

  const filteredGroups = useMemo(() => {
    if (!chats || chats.length === 0) return [];
    let source = chats;

    if (showStarredOnly) {
      source = source
        .map((g) => ({
          ...g,
          items: (g.items || []).filter((item) => item.isStarred),
        }))
        .filter((g) => g.items.length > 0);
    }

    if (!searchQuery.trim()) return source;
    const q = searchQuery.toLowerCase();
    return source
      .map((group) => ({
        ...group,
        items: (group.items || []).filter(
          (item) =>
            (item.title || "").toLowerCase().includes(q) ||
            (item.snippet || "").toLowerCase().includes(q) ||
            (item.fullPrompt || item.query || "").toLowerCase().includes(q)
        ),
      }))
      .filter((group) => group.items.length > 0);
  }, [chats, searchQuery, showStarredOnly]);

  return (
    <aside
      className={`fixed inset-y-0 left-0 z-30 flex h-screen shrink-0 flex-col border-r border-[#172339] bg-[#060913] transition-all duration-300 ease-in-out lg:sticky lg:top-0 ${
        isCollapsed
          ? "w-[68px] min-w-[68px]"
          : "w-[280px] min-w-[280px]"
      } ${!isOpen && !isCollapsed ? "-translate-x-full lg:translate-x-0" : "translate-x-0"}`}
    >
      {/* ── COLLAPSED SHORT RAIL VIEW ── */}
      {isCollapsed ? (
        <div className="flex flex-col items-center py-5 px-2 gap-3.5 h-full">
          {/* 1. Company Logo Icon (Cropped & Clean) */}
          <div className="grid size-12 place-items-center rounded-2xl bg-blue-500/10 border border-blue-500/20 shadow-md p-1.5 shrink-0">
            <img
              src={iconLogo}
              alt="ProEduvate Icon"
              className="size-8.5 object-contain drop-shadow-[0_0_8px_rgba(59,130,246,0.3)]"
            />
          </div>

          {/* 2. Expand Button DIRECTLY BELOW the company logo icon */}
          <button
            type="button"
            onClick={onToggleCollapse}
            title="Expand sidebar"
            className="grid size-9 place-items-center rounded-xl border border-[#1b2740] bg-[#0c1324] text-slate-300 transition-colors hover:border-blue-500/50 hover:bg-[#121c33] hover:text-white active:scale-95 shrink-0"
          >
            <PanelLeft className="size-4 text-blue-400" />
          </button>

          {/* 3. New Chat Button */}
          <button
            type="button"
            onClick={onNewChat}
            title="New Chat"
            className="grid size-9 place-items-center rounded-xl bg-[#2563eb] text-white shadow-md shadow-blue-600/30 transition-all hover:bg-blue-500 active:scale-95 shrink-0"
          >
            <Plus className="size-4 stroke-[2.5]" />
          </button>

          {/* Star Filter Pill in Rail */}
          <button
            type="button"
            onClick={() => setShowStarredOnly(!showStarredOnly)}
            title={showStarredOnly ? "Show all chats" : "Show starred only"}
            className={`grid size-9 place-items-center rounded-xl border transition-all shrink-0 ${
              showStarredOnly
                ? "border-amber-500/50 bg-amber-500/15 text-amber-400 shadow-[0_0_12px_rgba(245,158,11,0.25)]"
                : "border-[#1b2740] bg-[#0c1324] text-slate-400 hover:text-amber-400 hover:border-amber-500/40"
            }`}
          >
            <Star className={`size-4 ${showStarredOnly ? "fill-amber-400" : ""}`} />
          </button>

          {/* 4. Mini Collapsed Chats List */}
          <div className="flex-1 w-full overflow-y-auto space-y-2 pt-2 flex flex-col items-center no-scrollbar">
            {chats
              ?.flatMap((g) => g.items || [])
              .filter((item) => (showStarredOnly ? item.isStarred : true))
              .slice(0, 12)
              .map((item) => {
                const isSelected = item.id === activeChatId;
                return (
                  <div key={item.id} className="relative group">
                    <button
                      type="button"
                      onClick={() => onSelectChat(item)}
                      title={item.title}
                      className={`grid size-9 place-items-center rounded-xl transition-all ${
                        isSelected
                          ? "border border-blue-500/50 bg-blue-500/15 text-blue-400 shadow-[0_0_12px_rgba(59,130,246,0.25)]"
                          : "border border-transparent text-slate-400 hover:bg-[#0c1426] hover:text-white"
                      }`}
                    >
                      <MessageSquare className="size-4" />
                    </button>
                    {item.isStarred && (
                      <span className="absolute -top-0.5 -right-0.5 size-2.5 rounded-full bg-amber-400 ring-2 ring-[#060913]" />
                    )}
                  </div>
                );
              })}
          </div>
        </div>
      ) : (
        /* ── EXPANDED FULL SIDEBAR VIEW ── */
        <>
          {/* Brand Header with Keyed/Transparent Logo & Single Minimize Button */}
          <div className="flex items-center justify-between px-3.5 pt-4 pb-3 shrink-0">
            <div className="flex items-center min-w-0 pr-1.5 flex-1">
              <img
                src={logoWithIcon}
                alt="ProEduvate"
                className="h-12 sm:h-14 w-auto max-w-[215px] object-contain object-left drop-shadow-[0_2px_12px_rgba(59,130,246,0.2)]"
              />
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={onToggleCollapse}
                title="Minimize sidebar"
                className="grid size-8 place-items-center rounded-xl border border-[#1b2740] bg-[#0c1324] text-slate-400 transition-colors hover:border-blue-500/50 hover:bg-[#121c33] hover:text-white"
              >
                <PanelLeft className="size-4" />
              </button>

              {onToggleSidebar && (
                <button
                  type="button"
                  onClick={onToggleSidebar}
                  className="grid size-8 place-items-center rounded-lg text-slate-400 hover:bg-slate-800/60 hover:text-white lg:hidden"
                  aria-label="Close sidebar"
                >
                  <X className="size-5" />
                </button>
              )}
            </div>
          </div>

          {/* Action Row: + New Chat */}
          <div className="flex items-center px-4 pb-3 shrink-0">
            <button
              type="button"
              onClick={onNewChat}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#2563eb] py-2.5 px-4 text-[14px] font-semibold text-white shadow-lg shadow-blue-600/30 transition-all hover:bg-blue-500 active:scale-[0.98]"
            >
              <Plus className="size-4 stroke-[2.5]" />
              <span>New Chat</span>
            </button>
          </div>

          {/* Search Input & Star Filter Toggle */}
          <div className="px-4 pb-4 shrink-0 flex items-center gap-2">
            <div className="relative flex flex-1 items-center">
              <Search className="pointer-events-none absolute left-3 size-3.5 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search chats..."
                className="w-full rounded-xl border border-[#17243c] bg-[#0a101d] py-1.5 pl-8 pr-7 text-[12.5px] text-slate-200 placeholder:text-slate-500 outline-none transition-colors focus:border-blue-500/80"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 text-slate-400 hover:text-white"
                >
                  <X className="size-3" />
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={() => setShowStarredOnly(!showStarredOnly)}
              title={showStarredOnly ? "Showing starred chats (click for all)" : "Filter starred chats"}
              className={`grid size-8 place-items-center rounded-xl border transition-all shrink-0 ${
                showStarredOnly
                  ? "border-amber-500/50 bg-amber-500/15 text-amber-400 shadow-[0_0_10px_rgba(245,158,11,0.2)]"
                  : "border-[#17243c] bg-[#0a101d] text-slate-400 hover:border-amber-500/40 hover:text-amber-400"
              }`}
            >
              <Star className={`size-3.5 ${showStarredOnly ? "fill-amber-400" : ""}`} />
            </button>
          </div>

          {/* Chat History List */}
          <div className="flex-1 overflow-y-auto px-3 pb-6 space-y-4">
            {filteredGroups.length === 0 ? (
              <div className="py-12 px-4 text-center">
                <MessageSquare className="size-6 text-slate-600 mx-auto mb-2 opacity-50" />
                <div className="text-[12.5px] font-medium text-slate-400">
                  {showStarredOnly
                    ? "No starred chats found"
                    : searchQuery
                    ? "No matching chats"
                    : "No conversations yet"}
                </div>
                <div className="text-[11px] text-slate-500 mt-1">
                  {showStarredOnly
                    ? "Star important chats to quickly access them here"
                    : searchQuery
                    ? "Try a different search term"
                    : "Type a prompt to begin your first optimization"}
                </div>
              </div>
            ) : (
              filteredGroups.map((group) => (
                <div key={group.group}>
                  <div className="px-3 pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                    {group.group}
                  </div>
                  <div className="space-y-1">
                    {group.items.map((item) => {
                      const isSelected = item.id === activeChatId;
                      return (
                        <div
                          key={item.id}
                          className={`group relative flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left transition-all ${
                            isSelected
                              ? "border border-blue-500/50 bg-blue-500/10 text-white shadow-[0_0_15px_-3px_rgba(59,130,246,0.25)]"
                              : "border border-transparent text-slate-300 hover:bg-[#0c1426] hover:text-white"
                          }`}
                        >
                          <button
                            type="button"
                            onClick={() => onSelectChat(item)}
                            className="flex flex-1 items-start gap-2.5 min-w-0 text-left"
                          >
                            <MessageSquare
                              className={`mt-0.5 size-4 shrink-0 transition-colors ${
                                isSelected ? "text-blue-400" : "text-slate-400 group-hover:text-slate-200"
                              }`}
                            />
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center justify-between gap-1">
                                <span className="truncate text-[13px] font-medium leading-snug">
                                  {item.title}
                                </span>
                                <span className="shrink-0 text-[10px] text-slate-500">
                                  {item.timestamp}
                                </span>
                              </div>
                              <div className="truncate text-[11px] text-slate-400 group-hover:text-slate-300">
                                {item.status || item.snippet}
                              </div>
                            </div>
                          </button>

                          {/* Star icon toggle button */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onToggleStarChat?.(item.id);
                            }}
                            title={item.isStarred ? "Unstar chat" : "Star chat"}
                            className="p-1 rounded-lg text-slate-500 hover:text-amber-400 transition-colors shrink-0"
                          >
                            <Star
                              className={`size-3.5 transition-all ${
                                item.isStarred
                                  ? "fill-amber-400 text-amber-400"
                                  : "opacity-0 group-hover:opacity-100 text-slate-500 hover:text-amber-400"
                              }`}
                            />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))
            )}
          </div>
        </>
      )}
    </aside>
  );
}
