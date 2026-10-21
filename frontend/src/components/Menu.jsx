import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

/* Small dropdown menu. `renderTrigger` receives { open, toggle } so each
   caller keeps its own button styling. Closes on outside click / Escape.
   `portal` renders the list on <body> with fixed positioning, for menus
   inside scrolling containers (e.g. table rows) that would clip it. */
export default function Menu({ renderTrigger, items, align = "end", placement = "bottom", portal = false }) {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState(null);
  const rootRef = useRef(null);
  const listRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const onPointerDown = (event) => {
      if (!rootRef.current?.contains(event.target) && !listRef.current?.contains(event.target)) setOpen(false);
    };
    const onKeyDown = (event) => {
      if (event.key === "Escape") setOpen(false);
    };
    /* A portalled list follows its trigger when anything scrolls or resizes. */
    const follow = () => place();
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    if (portal) {
      window.addEventListener("resize", follow);
      window.addEventListener("scroll", follow, true);
    }
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("resize", follow);
      window.removeEventListener("scroll", follow, true);
    };
  }, [open, portal]);

  function place() {
    const rect = rootRef.current?.getBoundingClientRect();
    if (!rect) return;
    const below = window.innerHeight - rect.bottom;
    const above = below < 320 && rect.top > below;
    setPosition({
      top: above ? undefined : rect.bottom + 8,
      bottom: above ? window.innerHeight - rect.top + 8 : undefined,
      right: align === "end" ? window.innerWidth - rect.right : undefined,
      left: align === "end" ? undefined : rect.left,
    });
  }

  const toggle = () => {
    if (!open && portal) place();
    setOpen((value) => !value);
  };

  const list = (
    <div
      ref={listRef}
      role="menu"
      style={portal ? { position: "fixed", ...position } : undefined}
      className={[
        "pg-fade-in min-w-[200px] rounded-xl border border-line bg-surface p-1.5 shadow-2xl",
        portal ? "z-[60]" : `absolute z-30 ${align === "end" ? "right-0" : "left-0"} ${placement === "top" ? "bottom-full mb-2" : "top-full mt-2"}`,
      ].join(" ")}
    >
      {items.map(({ id, label, icon: Icon, tone = "text-muted", onSelect }) => (
        <button
          key={id}
          type="button"
          role="menuitem"
          onClick={() => {
            setOpen(false);
            onSelect?.();
          }}
          className="flex w-full items-center gap-2.5 whitespace-nowrap rounded-lg px-3 py-2 text-left text-[13px] text-text transition-colors hover:bg-surface-2"
        >
          {Icon && <Icon className={`size-4 ${tone}`} strokeWidth={1.75} />}
          {label}
        </button>
      ))}
    </div>
  );

  return (
    <div ref={rootRef} className="relative">
      {renderTrigger({ open, toggle })}
      {open && (portal ? createPortal(list, document.body) : list)}
    </div>
  );
}
