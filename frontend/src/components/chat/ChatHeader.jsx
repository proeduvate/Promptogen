import { useState, useRef, useEffect } from "react";
import {
  Pencil,
  Check,
  Star,
  Share2,
  MoreVertical,
  Sun,
  Moon,
  Bell,
  ChevronDown,
  Menu,
  PanelLeft,
  LogIn,
} from "lucide-react";
import UserMenuDropdown from "../UserMenuDropdown";

export default function ChatHeader({
  title,
  onRenameTitle,
  modelName = "GPT-4o",
  createdTime = "Created just now",
  theme,
  onThemeChange,
  notifications = 1,
  onToggleSidebar,
  isCollapsed = false,
  onToggleCollapse,
  onUpgrade,
  isStarred = false,
  onToggleStar,
  user = null,
  onLoginClick = null,
  onSignOut = null,
  rateLimitStatus = null,
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(title);
  const [menuOpen, setMenuOpen] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const displayName = user?.name || "User";
  const initial = displayName.charAt(0).toUpperCase() || "U";

  const handleSaveTitle = () => {
    setIsEditing(false);
    if (editTitle.trim() && editTitle !== title) {
      onRenameTitle(editTitle.trim());
    }
  };

  return (
    <header className="relative z-20 flex items-center justify-between border-b border-[#141f33] bg-[#070b14]/90 px-6 py-3.5 backdrop-blur-md">
      {/* Left: Mobile hamburger (no duplicate desktop minimize button) & Chat Title */}
      <div className="flex items-center gap-3 min-w-0">
        <button
          type="button"
          onClick={onToggleSidebar}
          title="Toggle Navigation"
          className="grid size-8 place-items-center rounded-xl border border-[#1b2740] bg-[#0c1426] text-slate-300 hover:text-white hover:border-blue-500/50 transition-all shrink-0 lg:hidden"
        >
          <Menu className="size-4" />
        </button>

        <div className="min-w-0">
          <div className="flex items-center gap-2">
            {isEditing ? (
              <div className="flex items-center gap-1.5">
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSaveTitle();
                    if (e.key === "Escape") {
                      setEditTitle(title);
                      setIsEditing(false);
                    }
                  }}
                  autoFocus
                  className="rounded-lg border border-blue-500 bg-[#0c1426] px-2.5 py-1 text-[16px] font-bold text-white outline-none"
                />
                <button
                  type="button"
                  onClick={handleSaveTitle}
                  className="grid size-7 place-items-center rounded-md bg-blue-600 text-white hover:bg-blue-500"
                >
                  <Check className="size-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2 group">
                <h1 className="truncate text-[18px] font-bold text-slate-100">
                  {title}
                </h1>
                <button
                  type="button"
                  onClick={() => {
                    setEditTitle(title);
                    setIsEditing(true);
                  }}
                  title="Rename chat"
                  className="text-slate-500 hover:text-slate-300 transition-colors"
                >
                  <Pencil className="size-3.5" />
                </button>
              </div>
            )}
          </div>

          <div className="text-[12px] text-slate-400 font-normal">
            {createdTime} • {modelName}
          </div>
        </div>
      </div>

      {/* Right: Actions + Global Header Controls */}
      <div className="flex items-center gap-2">
        {/* Chat action icons: Favorite, Share, More */}
        <button
          type="button"
          onClick={onToggleStar}
          title={isStarred ? "Remove star" : "Star chat"}
          className={`grid size-8 place-items-center rounded-lg transition-colors hover:bg-white/5 ${
            isStarred ? "text-amber-400" : "text-slate-400 hover:text-white"
          }`}
        >
          <Star className="size-4" fill={isStarred ? "currentColor" : "none"} />
        </button>

        <button
          type="button"
          title="Share prompt"
          onClick={() => {
            if (navigator.clipboard) {
              navigator.clipboard.writeText(window.location.href);
            }
          }}
          className="grid size-8 place-items-center rounded-lg text-slate-400 transition-colors hover:bg-white/5 hover:text-white"
        >
          <Share2 className="size-4" />
        </button>

        <button
          type="button"
          title="More options"
          className="grid size-8 place-items-center rounded-lg text-slate-400 transition-colors hover:bg-white/5 hover:text-white"
        >
          <MoreVertical className="size-4" />
        </button>

        <div className="mx-1 h-5 w-px bg-[#172339]" />

        {/* Theme toggle */}
        <button
          type="button"
          onClick={() => onThemeChange(theme === "dark" ? "light" : "dark")}
          className="grid size-8 place-items-center rounded-full text-slate-400 transition-colors hover:bg-white/5 hover:text-white"
        >
          {theme === "dark" ? (
            <Sun className="size-4" />
          ) : (
            <Moon className="size-4" />
          )}
        </button>

        {/* Notifications */}
        <button
          type="button"
          className="relative grid size-8 place-items-center rounded-full text-slate-400 transition-colors hover:bg-white/5 hover:text-white"
        >
          <Bell className="size-4" />
          {notifications > 0 && (
            <span className="absolute right-1.5 top-1.5 size-1.5 rounded-full bg-blue-500 ring-2 ring-[#070b14]" />
          )}
        </button>

        {/* Guest Rate Limit Indicator (when not logged in) */}
        {!user && rateLimitStatus && (
          <div
            className={`hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] border transition-colors ${
              rateLimitStatus.locked || rateLimitStatus.remaining === 0
                ? "bg-amber-500/10 border-amber-500/30 text-amber-300"
                : "bg-blue-500/10 border-blue-500/20 text-blue-300"
            }`}
          >
            <span
              className={`size-1.5 rounded-full ${
                rateLimitStatus.locked || rateLimitStatus.remaining === 0
                  ? "bg-amber-400"
                  : "bg-blue-400 animate-pulse"
              }`}
            />
            <span>
              Guest:{" "}
              <strong>
                {rateLimitStatus.locked || rateLimitStatus.remaining === 0
                  ? "0 left"
                  : `${rateLimitStatus.remaining ?? rateLimitStatus.remaining_generations ?? (2 - (rateLimitStatus.used || 0))} left`}
              </strong>
            </span>
          </div>
        )}

        {/* User profile dropdown or Login button */}
        {user ? (
          <div ref={containerRef} className="relative">
            <button
              type="button"
              onClick={() => setMenuOpen(!menuOpen)}
              className="flex items-center gap-1 rounded-full p-1 pl-1.5 text-slate-200 hover:bg-white/5 transition-colors"
            >
              {user.avatar_url ? (
                <img
                  src={user.avatar_url}
                  alt={displayName}
                  className="size-7 rounded-full object-cover ring-1 ring-white/10"
                />
              ) : (
                <div className="grid size-7 place-items-center rounded-full bg-gradient-to-br from-blue-600 to-indigo-600 text-[12px] font-semibold text-white ring-1 ring-white/10 shadow-sm">
                  {initial}
                </div>
              )}
              <ChevronDown className="size-3 text-slate-400" />
            </button>

            <UserMenuDropdown
              isOpen={menuOpen}
              onClose={() => setMenuOpen(false)}
              user={user}
              onUpgrade={onUpgrade}
              onSignOut={onSignOut}
            />
          </div>
        ) : (
          <button
            type="button"
            onClick={onLoginClick}
            className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-md shadow-blue-500/25 transition-all hover:brightness-110 active:scale-95"
          >
            <LogIn className="size-3.5" />
            <span>Log In</span>
          </button>
        )}
      </div>
    </header>
  );
}
