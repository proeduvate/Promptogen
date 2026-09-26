import ThemeSwitch from "./ThemeSwitch";
import NotificationsPanel from "./NotificationsPanel";

export default function TopBar({
  theme,
  onThemeChange,
  notifications = [],
  onMarkRead,
  onMarkAllRead,
  children,
}) {
  return (
    <header className="flex items-center gap-3 px-6 py-4">
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
