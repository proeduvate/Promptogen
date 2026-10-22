import { useState, useRef, useEffect } from "react";
import { Sun, Moon, Bell, ChevronDown, Menu, LogIn, Lock } from "lucide-react";
import UserMenuDropdown from "./UserMenuDropdown";

export default function TopNavHeader({
  theme,
  onThemeChange,
  notifications = 1,
  onToggleSidebar,
  isCollapsed = false,
  onToggleCollapse,
  onUpgrade,
  user,
  onLoginClick,
  onSignOut,
  rateLimitStatus,
}) {
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

  return (
    <header className="relative z-20 flex items-center justify-between px-6 py-3.5 border-b border-[#141f33] bg-[#070b14]/90 backdrop-blur-md">
      {/* Mobile-only toggle */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onToggleSidebar}
          title="Toggle Navigation"
          className="flex lg:hidden items-center justify-center size-9 rounded-xl border border-[#1b2740] bg-[#0c1426] text-slate-300 hover:text-white hover:border-blue-500/50"
        >
          <Menu className="size-4 text-blue-400" />
        </button>
      </div>

      {/* Right controls */}
      <div className="flex items-center gap-3">
        {/* Guest rate-limit status indicator if logged out */}
        {!user && rateLimitStatus && (
          <div
            className={`hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] border transition-colors ${
              rateLimitStatus.locked || rateLimitStatus.remaining === 0
                ? "bg-amber-500/10 border-amber-500/30 text-amber-300"
                : "bg-blue-500/10 border-blue-500/20 text-blue-300"
            }`}
          >
            <Lock className={`size-3 ${rateLimitStatus.locked || rateLimitStatus.remaining === 0 ? "text-amber-400" : "text-blue-400"}`} />
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

        {/* Sun / Theme toggle */}
        <button
          type="button"
          onClick={() => onThemeChange(theme === "dark" ? "light" : "dark")}
          aria-label="Toggle theme"
          className="grid size-9 place-items-center rounded-full text-slate-300 transition-colors hover:bg-white/5 hover:text-white"
        >
          {theme === "dark" ? (
            <Sun className="size-[18px]" strokeWidth={1.75} />
          ) : (
            <Moon className="size-[18px]" strokeWidth={1.75} />
          )}
        </button>

        {/* Bell with notification dot */}
        <button
          type="button"
          aria-label="Notifications"
          className="relative grid size-9 place-items-center rounded-full text-slate-300 transition-colors hover:bg-white/5 hover:text-white"
        >
          <Bell className="size-[18px]" strokeWidth={1.75} />
          {notifications > 0 && (
            <span className="absolute right-2 top-2 size-2 rounded-full bg-blue-500 ring-2 ring-[#070b14]" />
          )}
        </button>

        {/* User profile dropdown or Login button */}
        {user ? (
          <div ref={containerRef} className="relative">
            <button
              type="button"
              onClick={() => setMenuOpen(!menuOpen)}
              className="flex items-center gap-1.5 rounded-full p-1 pl-1.5 text-slate-200 transition-colors hover:bg-white/5"
            >
              {user.avatar_url ? (
                <img
                  src={user.avatar_url}
                  alt={displayName}
                  className="size-8 rounded-full object-cover ring-1 ring-white/10"
                />
              ) : (
                <div className="grid size-8 place-items-center rounded-full bg-gradient-to-br from-blue-600 to-indigo-600 text-[13px] font-semibold text-white ring-1 ring-white/10 shadow-sm">
                  {initial}
                </div>
              )}
              <ChevronDown className="size-3.5 text-slate-400" />
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
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-md shadow-blue-500/25 transition-all hover:brightness-110 hover:shadow-blue-500/35 active:scale-95"
          >
            <LogIn className="size-3.5" />
            <span>Log In</span>
          </button>
        )}
      </div>
    </header>
  );
}
