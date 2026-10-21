import { useEffect, useId, useRef, useState } from "react";
import { ChevronDown, UserRound, Settings, Lightbulb, LogOut } from "lucide-react";
import { USER } from "../data/content";

const ITEMS = [
  { id: "profile", label: "Profile", icon: UserRound },
  { id: "settings", label: "Settings", icon: Settings },
  { id: "feature", label: "Request a feature", icon: Lightbulb },
  { id: "logout", label: "Log out", icon: LogOut, danger: true },
];

/* Account card that opens a menu above it. Arrow keys / Home / End move
   between items; Escape closes and returns focus to the card; clicking
   outside or tabbing away closes it too. */
export default function ProfileMenu({ active = false, onSelect }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);
  const triggerRef = useRef(null);
  const itemRefs = useRef([]);
  const startIndex = useRef(0);
  const menuId = useId();

  const openAt = (index) => {
    startIndex.current = index;
    setOpen(true);
  };

  const close = () => {
    setOpen(false);
    triggerRef.current?.focus();
  };

  useEffect(() => {
    if (!open) return undefined;
    itemRefs.current.at(startIndex.current)?.focus();
    const onPointerDown = (event) => {
      if (!rootRef.current?.contains(event.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [open]);

  const handleTriggerKeyDown = (event) => {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      openAt(event.key === "ArrowDown" ? 0 : -1);
    }
  };

  const handleMenuKeyDown = (event) => {
    const items = itemRefs.current;
    const current = items.indexOf(document.activeElement);
    const focusItem = (index) => {
      event.preventDefault();
      items[(index + items.length) % items.length]?.focus();
    };
    if (event.key === "ArrowDown") focusItem(current + 1);
    else if (event.key === "ArrowUp") focusItem(current - 1);
    else if (event.key === "Home") focusItem(0);
    else if (event.key === "End") focusItem(items.length - 1);
    else if (event.key === "Escape") {
      event.preventDefault();
      close();
    } else if (event.key === "Tab") setOpen(false);
  };

  return (
    <div ref={rootRef} className="relative">
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={() => (open ? setOpen(false) : openAt(0))}
        onKeyDown={handleTriggerKeyDown}
        className={[
          "flex w-full items-center gap-3 rounded-xl border bg-surface px-3 py-3 text-left transition-colors hover:bg-surface-2",
          active || open ? "border-brand/40" : "border-line",
        ].join(" ")}
      >
        <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-good/15 text-[15px] font-semibold text-good">
          {USER.initial}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[14px] font-medium">{USER.name}</span>
          <span className="block truncate text-[12px] text-muted">{USER.role}</span>
        </span>
        <ChevronDown
          className={`size-4 shrink-0 text-muted transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div
          id={menuId}
          role="menu"
          aria-label="Account"
          onKeyDown={handleMenuKeyDown}
          className="pg-fade-in absolute inset-x-0 bottom-full z-30 mb-2 rounded-2xl border border-line bg-surface p-1.5 shadow-2xl"
        >
          {ITEMS.map(({ id, label, icon: Icon, danger }, index) => (
            <div key={id}>
              {danger && <div role="separator" className="mx-2 my-1.5 h-px bg-line" />}
              <button
                ref={(node) => {
                  itemRefs.current[index] = node;
                }}
                type="button"
                role="menuitem"
                tabIndex={-1}
                onClick={() => {
                  close();
                  onSelect?.(id);
                }}
                className={[
                  "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-[14px] outline-none transition-colors hover:bg-surface-2 focus-visible:bg-surface-2 focus-visible:ring-1 focus-visible:ring-brand/40",
                  danger ? "text-bad" : "text-text",
                ].join(" ")}
              >
                <Icon className={`size-[18px] ${danger ? "text-bad" : "text-muted"}`} strokeWidth={1.75} />
                {label}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
