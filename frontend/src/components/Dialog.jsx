import { useEffect, useId, useRef } from "react";
import { X } from "lucide-react";

const SIZES = { md: "max-w-[560px]", lg: "max-w-[720px]", xl: "max-w-[960px]" };
const TONES = {
  brand: "bg-brand/10 ring-brand/20 text-brand",
  good: "bg-good/10 ring-good/20 text-good",
  amber: "bg-amber/10 ring-amber/20 text-amber",
  purple: "bg-purple/10 ring-purple/20 text-purple",
  cyan: "bg-cyan/10 ring-cyan/20 text-cyan",
  bad: "bg-bad/10 ring-bad/20 text-bad",
};

const FOCUSABLE = "button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex='-1'])";

/* Shared modal shell: header (icon, title, description, close), an optional
   fixed subheader, a scrolling body and an optional footer. Escape and the
   backdrop close it, Tab stays inside, and focus returns to whatever opened it. */
export default function Dialog({ open, onClose, title, description, icon: Icon, tone = "brand", size = "md", subheader, footer, children }) {
  const titleId = useId();
  const descriptionId = useId();
  const panelRef = useRef(null);
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  });

  /* Remember the opener during render, before anything inside takes focus. */
  const openerRef = useRef(null);
  if (open && !openerRef.current) openerRef.current = document.activeElement;
  useEffect(() => {
    if (open) return;
    openerRef.current?.focus?.();
    openerRef.current = null;
  }, [open]);
  /* Dialogs that are only mounted while open hand focus back on unmount.
     (Not cleared here: React's dev double-mount runs this cleanup once early.) */
  useEffect(() => () => openerRef.current?.focus?.(), []);

  useEffect(() => {
    if (!open) return undefined;
    const panel = panelRef.current;
    if (!panel.contains(document.activeElement)) {
      (panel.querySelector("[data-autofocus]") ?? panel.querySelector(FOCUSABLE))?.focus();
    }
    const onKeyDown = (event) => {
      if (event.key === "Escape" && !event.defaultPrevented) onCloseRef.current?.();
      if (event.key !== "Tab") return;
      const nodes = [...panel.querySelectorAll(FOCUSABLE)].filter((node) => node.offsetParent !== null);
      if (nodes.length === 0) return;
      const index = nodes.indexOf(document.activeElement);
      if (index === -1 || (event.shiftKey && index === 0) || (!event.shiftKey && index === nodes.length - 1)) {
        event.preventDefault();
        (event.shiftKey ? nodes[nodes.length - 1] : nodes[0]).focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  if (!open) return null;

  return (
    <div className="pg-fade-in fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/65 backdrop-blur-[2px]" onClick={onClose} aria-hidden />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
        className={`pg-pop-in relative flex max-h-[90vh] w-full ${SIZES[size]} flex-col overflow-hidden rounded-2xl border border-line bg-surface shadow-2xl`}
      >
        <div className="flex items-start gap-4 border-b border-line px-6 py-5">
          {Icon && (
            <span className={`grid size-11 shrink-0 place-items-center rounded-xl ring-1 ${TONES[tone]}`}>
              <Icon className="size-[22px]" strokeWidth={1.75} />
            </span>
          )}
          <div className="min-w-0 flex-1">
            <h2 id={titleId} className="text-[19px] font-semibold leading-7">
              {title}
            </h2>
            {description && (
              <p id={descriptionId} className="mt-0.5 text-[13px] text-muted">
                {description}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="-mr-1 grid size-9 shrink-0 place-items-center rounded-lg text-muted transition-colors hover:bg-surface-2 hover:text-text"
          >
            <X className="size-5" />
          </button>
        </div>
        {subheader && <div className="border-b border-line px-6 py-4">{subheader}</div>}
        <div data-dialog-body className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
          {children}
        </div>
        {footer && <div className="flex flex-wrap items-center justify-end gap-3 border-t border-line px-6 py-4">{footer}</div>}
      </div>
    </div>
  );
}
