import { useEffect, useRef, useState } from "react";

/* Small dropdown menu. `renderTrigger` receives { open, toggle } so each
   caller keeps its own button styling. Closes on outside click / Escape. */
export default function Menu({ renderTrigger, items, align = "end", placement = "bottom" }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const onPointerDown = (event) => {
      if (!rootRef.current?.contains(event.target)) setOpen(false);
    };
    const onKeyDown = (event) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      {renderTrigger({ open, toggle: () => setOpen((value) => !value) })}

      {open && (
        <div
          role="menu"
          className={[
            "pg-fade-in absolute z-30 min-w-[200px] rounded-xl border border-line bg-surface p-1.5 shadow-2xl",
            align === "end" ? "right-0" : "left-0",
            placement === "top" ? "bottom-full mb-2" : "top-full mt-2",
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
      )}
    </div>
  );
}
