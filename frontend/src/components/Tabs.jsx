export default function Tabs({ tabs, active, onChange, bordered = true, className = "" }) {
  return (
    <div
      role="tablist"
      className={[
        "flex gap-6 overflow-x-auto",
        bordered ? "border-b border-line" : "",
        className,
      ].join(" ")}
    >
      {tabs.map(({ id, label, badge, icon: Icon }) => {
        const isActive = id === active;
        return (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(id)}
            className={[
              "flex shrink-0 items-center gap-2 border-b-2 pb-3 pt-1 text-[14px] transition-colors",
              isActive
                ? "border-brand font-medium text-brand"
                : "border-transparent text-muted hover:text-text",
            ].join(" ")}
          >
            {Icon && <Icon className="size-4" strokeWidth={1.75} />}
            {label}
            {badge && (
              <span className="rounded-full bg-brand/15 px-2 py-0.5 text-[11px] font-medium text-brand">
                {badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
