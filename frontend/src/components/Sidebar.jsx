import { useEffect, useRef } from "react";
import { Rocket, Crown, ArrowRight, X, CircleCheck, Sparkles } from "lucide-react";
import { NAV_ITEMS } from "../data/content";
import ProfileMenu from "./ProfileMenu";

/* Keeps Tab / Shift+Tab cycling inside the open drawer. */
function trapFocus(event, container) {
  const nodes = [...container.querySelectorAll("button:not([disabled]), a[href], input")].filter(
    (node) => node.tabIndex >= 0 && node.offsetParent !== null,
  );
  if (nodes.length === 0) return;
  const index = nodes.indexOf(document.activeElement);
  const first = nodes[0];
  const last = nodes[nodes.length - 1];
  if (index === -1 || (event.shiftKey && index === 0) || (!event.shiftKey && index === nodes.length - 1)) {
    event.preventDefault();
    (event.shiftKey ? last : first).focus();
  }
}

/* Desktop (lg+): pinned beside the content at full viewport height, and
   scrolls on its own when taller than the screen. Below lg: an off-canvas
   drawer opened from the top bar's menu button; Escape, the backdrop, ✕
   or picking a page closes it. */
export default function Sidebar({
  active,
  onNavigate,
  onUpgrade,
  onProfileAction,
  open = false,
  onClose,
}) {
  const asideRef = useRef(null);
  const closeButtonRef = useRef(null);
  /* Latest onClose without re-running the drawer effect on every render. */
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    if (!open) return undefined;
    const opener = document.activeElement;
    closeButtonRef.current?.focus();

    const close = () => onCloseRef.current?.();
    const onKeyDown = (event) => {
      /* Menus inside the drawer handle their own Escape first. */
      if (event.key === "Escape" && !event.defaultPrevented) close();
      if (event.key === "Tab") trapFocus(event, asideRef.current);
    };
    const desktop = window.matchMedia("(min-width: 64rem)");
    const onBreakpoint = (event) => {
      if (event.matches) close();
    };
    document.addEventListener("keydown", onKeyDown);
    desktop.addEventListener("change", onBreakpoint);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      desktop.removeEventListener("change", onBreakpoint);
      document.body.style.overflow = previousOverflow;
      /* Picking a page swaps the top bar, so fall back to the new menu button. */
      (opener?.isConnected ? opener : document.getElementById("pg-nav-toggle"))?.focus();
    };
  }, [open]);

  return (
    <>
      {open && (
        <div
          aria-hidden
          onClick={onClose}
          className="pg-fade-in fixed inset-0 z-30 bg-black/65 backdrop-blur-[2px] lg:hidden"
        />
      )}

      <aside
        ref={asideRef}
        id="pg-sidebar"
        aria-label="Main navigation"
        role={open ? "dialog" : undefined}
        aria-modal={open ? true : undefined}
        className={[
          "fixed inset-y-0 left-0 z-40 flex w-[300px] max-w-[85vw] flex-col overflow-y-auto border-r border-line bg-sidebar duration-300 ease-[cubic-bezier(0.2,0.8,0.3,1)] motion-reduce:transition-none",
          "lg:visible lg:sticky lg:top-0 lg:bottom-auto lg:z-auto lg:h-screen lg:w-[256px] lg:max-w-none lg:shrink-0 lg:translate-x-0 lg:transition-none",
          /* Visible at once when opening (so focus can move in); hidden only
             after the slide-out finishes when closing. */
          open
            ? "translate-x-0 shadow-2xl transition-[translate]"
            : "invisible -translate-x-full transition-[translate,visibility]",
        ].join(" ")}
      >
        {/* Brand */}
        <div className="flex items-center gap-2.5 px-5 pt-6 pb-6">
          <Rocket className="size-8 shrink-0 -rotate-12 text-brand" strokeWidth={1.75} />
          <div className="leading-none">
            <div className="text-[21px] font-bold tracking-tight">
              Pro<span className="text-brand">Eduvate</span>
            </div>
            <div className="mt-1 text-[10px] tracking-wide text-faint">
              people, projects and potential
            </div>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            aria-label="Close navigation"
            className="-mr-1 ml-auto grid size-9 shrink-0 place-items-center rounded-lg text-muted transition-colors hover:bg-surface-2 hover:text-text lg:hidden"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Current product */}
        <div className="mx-3 mb-5 flex items-center gap-3 px-3">
          <CircleCheck className="size-7 shrink-0 text-text" strokeWidth={1.5} />
          <div className="min-w-0 leading-tight">
            <div className="flex items-center gap-1.5 text-[16px] font-semibold">
              Promptogen
              <Sparkles className="size-4 text-brand" strokeWidth={2} />
            </div>
            <div className="mt-0.5 text-[12px] text-muted">AI Prompt Engineering</div>
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
                onClick={() => {
                  onNavigate(id);
                  onClose?.();
                }}
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

        {/* Account menu: Profile, Settings, Request a feature, Log out */}
        <div className="mx-3 mt-4 mb-5">
          <ProfileMenu
            active={active === "profile" || active === "settings"}
            onSelect={(id) => {
              onClose?.();
              onProfileAction?.(id);
            }}
          />
        </div>
      </aside>
    </>
  );
}
