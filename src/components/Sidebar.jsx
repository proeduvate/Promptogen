import { Rocket, Crown, ArrowRight, ChevronDown } from "lucide-react";
import { NAV_ITEMS, USER } from "../data/content";

export default function Sidebar({ active, onNavigate, onUpgrade }) {
  return (
    <aside className="hidden lg:flex w-[256px] shrink-0 flex-col border-r border-line bg-sidebar">
      {/* Brand */}
      <div className="flex items-center gap-2.5 px-5 pt-6 pb-7">
        <Rocket className="size-8 -rotate-12 text-brand" strokeWidth={1.75} />
        <div className="leading-none">
          <div className="text-[21px] font-bold tracking-tight">
            Pro<span className="text-brand">Eduvate</span>
          </div>
          <div className="mt-1 text-[10px] tracking-wide text-faint">
            people, projects and potential
          </div>
        </div>
      </div>

      {/* Primary navigation */}
      <nav className="flex flex-col gap-1 px-3">
        {NAV_ITEMS.map(({ id, label, icon: Icon }) => {
          const isActive = id === active;
          return (
            <button
              key={id}
              type="button"
              onClick={() => onNavigate(id)}
              aria-current={isActive ? "page" : undefined}
              className={[
                "group flex items-center gap-3 rounded-xl px-4 py-3 text-[15px] transition-colors",
                isActive
                  ? "border border-brand/40 bg-brand/10 font-medium text-brand"
                  : "border border-transparent text-muted hover:bg-surface-2 hover:text-text",
              ].join(" ")}
            >
              <Icon className="size-[19px]" strokeWidth={1.75} />
              {label}
            </button>
          );
        })}
      </nav>

      <div className="flex-1" />

      {/* Upsell */}
      <div className="mx-3 rounded-2xl border border-brand/35 bg-gradient-to-b from-brand/15 to-brand/5 p-4">
        <div className="flex items-center gap-2">
          <Crown className="size-[18px] text-brand" strokeWidth={2} />
          <span className="text-[15px] font-semibold">Unlock Pro</span>
        </div>
        <p className="mt-2 text-[13px] leading-relaxed text-muted">
          Get unlimited generations, advanced analytics and more.
        </p>
        <button
          type="button"
          onClick={onUpgrade}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-brand-strong py-2.5 text-[14px] font-medium text-white transition-colors hover:bg-brand"
        >
          Upgrade Now
          <ArrowRight className="size-4" />
        </button>
      </div>

      {/* Account switcher */}
      <button
        type="button"
        className="mx-3 mt-4 mb-5 flex items-center gap-3 rounded-xl border border-line bg-surface px-3 py-3 text-left transition-colors hover:bg-surface-2"
      >
        <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-good/15 text-[15px] font-semibold text-good">
          {USER.initial}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[14px] font-medium">{USER.name}</span>
          <span className="block truncate text-[12px] text-muted">{USER.role}</span>
        </span>
        <ChevronDown className="size-4 shrink-0 text-muted" />
      </button>
    </aside>
  );
}
