import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { X, Trash2 } from "lucide-react";

const FOCUSABLE = 'button:not([disabled]), textarea:not([disabled]), input:not([disabled]), [href], [tabindex]:not([tabindex="-1"])';

/**
 * Non-destructive input for one backend-reported context gap (or general context).
 * The draft is local. Nothing is committed until Save, and Cancel or Escape changes nothing.
 *
 * @param {{
 *   open: boolean,
 *   title: string,
 *   description?: string|null,
 *   inputHint?: string|null,
 *   initialValue?: string,
 *   maxLength?: number,
 *   onSave: (value: string) => void,
 *   onCancel: () => void,
 *   onRemove?: () => void,
 * }} props
 */
export default function AddContextDetailsDialog({
  open,
  title,
  description = null,
  inputHint = null,
  initialValue = "",
  maxLength = 1000,
  onSave,
  onCancel,
  onRemove,
}) {
  const [draft, setDraft] = useState(initialValue || "");
  const dialogRef = useRef(null);
  const textareaRef = useRef(null);
  const restoreFocusRef = useRef(null);
  const titleId = useId();
  const descriptionId = useId();
  const fieldId = useId();

  // Reset the draft to the saved value every time the dialog opens.
  useEffect(() => {
    if (open) setDraft(initialValue || "");
  }, [open, initialValue]);

  // Move focus into the dialog, and back to the trigger when it closes.
  useEffect(() => {
    if (!open) return undefined;
    restoreFocusRef.current = typeof document !== "undefined" ? document.activeElement : null;
    const raf = requestAnimationFrame(() => textareaRef.current?.focus());
    return () => {
      cancelAnimationFrame(raf);
      const el = restoreFocusRef.current;
      if (el && typeof el.focus === "function" && document.contains(el)) el.focus();
    };
  }, [open]);

  if (!open || typeof document === "undefined") return null;

  const trimmed = draft.trim();
  const hasExisting = Boolean((initialValue || "").trim());

  const handleKeyDown = (event) => {
    if (event.key === "Escape") {
      event.stopPropagation();
      onCancel?.();
      return;
    }
    if (event.key === "Tab" && dialogRef.current) {
      const focusable = Array.from(dialogRef.current.querySelectorAll(FOCUSABLE));
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!trimmed) return;
    onSave?.(trimmed);
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center bg-black/60 p-4 backdrop-blur-sm sm:items-center"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onCancel?.();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
        onKeyDown={handleKeyDown}
        className="w-full max-w-lg rounded-2xl border border-[#1b2740] bg-[#0c1322] p-5 text-slate-100 shadow-2xl"
      >
        <div className="flex items-start justify-between gap-3">
          <h2 id={titleId} className="break-words text-[15px] font-semibold text-white">
            {title}
          </h2>
          <button
            type="button"
            onClick={onCancel}
            aria-label="Close"
            className="grid size-7 shrink-0 place-items-center rounded-lg text-slate-400 transition-colors hover:bg-white/5 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50"
          >
            <X className="size-4" aria-hidden="true" />
          </button>
        </div>

        {description && (
          <p id={descriptionId} className="mt-1.5 text-[12.5px] leading-relaxed text-slate-400">
            {description}
          </p>
        )}

        <form onSubmit={handleSubmit} className="mt-4">
          <label htmlFor={fieldId} className="mb-1.5 block text-[12px] font-medium text-slate-300">
            Your details
          </label>
          <div className="relative rounded-xl border border-[#1a253c] bg-[#0c1426] focus-within:border-blue-500/80 focus-within:ring-1 focus-within:ring-blue-500/30">
            <textarea
              id={fieldId}
              ref={textareaRef}
              rows={4}
              maxLength={maxLength}
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder={inputHint || "Add the details Promptogen should consider…"}
              className="w-full resize-none bg-transparent px-4 pb-7 pt-3 text-[13px] leading-relaxed text-slate-100 placeholder:text-slate-500 outline-none"
            />
            <span className="pointer-events-none absolute bottom-2 right-3 text-[11px] font-medium text-slate-500">
              {draft.length}/{maxLength}
            </span>
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
            {hasExisting && onRemove ? (
              <button
                type="button"
                onClick={onRemove}
                className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-[12px] font-medium text-rose-300 transition-colors hover:bg-rose-500/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500/50"
              >
                <Trash2 className="size-3.5" aria-hidden="true" />
                <span>Remove detail</span>
              </button>
            ) : (
              <span />
            )}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onCancel}
                className="rounded-xl border border-[#1b2740] bg-[#0c1426] px-4 py-2 text-[12.5px] font-medium text-slate-300 transition-colors hover:bg-[#121c33] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!trimmed}
                className="rounded-xl bg-[#2563eb] px-4 py-2 text-[12.5px] font-semibold text-white shadow-lg shadow-blue-600/30 transition-all hover:bg-blue-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400/60 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Save
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
