import { Menu as MenuIcon } from "lucide-react";
import ThemeSwitch from "./ThemeSwitch";
import NotificationsPanel from "./NotificationsPanel";

export default function TopBar({
  theme,
  onThemeChange,
  notifications = [],
  onMarkRead,
  onMarkAllRead,
  navOpen = false,
  onOpenNav,
  children,
}) {
  return (
    <header className="flex items-center gap-3 px-6 py-4">
      {/* Below lg the sidebar is a drawer; this opens it */}
      <button
        id="pg-nav-toggle"
        type="button"
        aria-label="Open navigation"
        aria-controls="pg-sidebar"
        aria-expanded={navOpen}
        onClick={onOpenNav}
        className="-ml-2 grid size-10 shrink-0 place-items-center rounded-full text-muted transition-colors hover:bg-surface hover:text-text lg:hidden"
      >
        <MenuIcon className="size-[22px]" strokeWidth={1.75} />
      </button>

      {/* Page-specific header content (title, toolbar) sits left of the global controls */}
      <div className="min-w-0 flex-1">{children}</div>

      <ThemeSwitch theme={theme} onChange={onThemeChange} />

      <NotificationsPanel
        items={notifications}
        onMarkRead={onMarkRead}
        onMarkAllRead={onMarkAllRead}
      />
    </header>
  );
}
