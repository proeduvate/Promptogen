import { Sun, Moon } from "lucide-react";
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

      {/* Segmented light/dark switch — the whole control is one radio group */}
      <div
        role="radiogroup"
        aria-label="Color theme"
        className="flex items-center gap-1 rounded-full border border-line bg-surface p-1"
      >
        {[
          { value: "light", Icon: Sun, label: "Light" },
          { value: "dark", Icon: Moon, label: "Dark" },
        ].map(({ value, Icon, label }) => (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={theme === value}
            aria-label={`${label} theme`}
            onClick={() => onThemeChange(value)}
            className={[
              "grid size-8 place-items-center rounded-full transition-colors",
              theme === value ? "bg-surface-3 text-text" : "text-muted hover:text-text",
            ].join(" ")}
          >
            <Icon className="size-[17px]" strokeWidth={1.75} />
          </button>
        ))}
      </div>

      <NotificationsPanel
        items={notifications}
        onMarkRead={onMarkRead}
        onMarkAllRead={onMarkAllRead}
      />
    </header>
  );
}
