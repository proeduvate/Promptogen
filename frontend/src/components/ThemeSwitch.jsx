import { Sun, Moon } from "lucide-react";

/* Day/night switch: one button, the thumb slides across the track.
   The faint icon on the track shows which mode a click switches to. */
export default function ThemeSwitch({ theme, onChange }) {
  const isDark = theme === "dark";

  return (
    <button
      type="button"
      role="switch"
      aria-checked={isDark}
      aria-label="Dark mode"
      onClick={() => onChange(isDark ? "light" : "dark")}
      className={[
        "relative flex h-9 w-16 shrink-0 items-center rounded-full border p-[3px] transition-colors duration-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand motion-reduce:transition-none",
        isDark ? "border-brand/40 bg-brand/15" : "border-line bg-surface-3",
      ].join(" ")}
    >
      <Sun aria-hidden className="absolute left-2.5 size-3.5 text-muted" strokeWidth={2} />
      <Moon aria-hidden className="absolute right-2.5 size-3.5 text-muted" strokeWidth={2} />
      <span
        aria-hidden
        className={[
          "relative grid size-7 place-items-center rounded-full text-white shadow-md transition-all duration-300 ease-[cubic-bezier(0.2,0.8,0.3,1)] motion-reduce:transition-none",
          isDark ? "translate-x-7 bg-brand-strong" : "translate-x-0 bg-amber",
        ].join(" ")}
      >
        {isDark ? (
          <Moon className="size-4" strokeWidth={2} />
        ) : (
          <Sun className="size-4" strokeWidth={2} />
        )}
      </span>
    </button>
  );
}
