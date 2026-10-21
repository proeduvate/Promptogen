import { useEffect, useId, useRef } from "react";
import { TriangleAlert } from "lucide-react";
import { btn } from "../lib/ui";

/* Small "are you sure?" dialog for destructive actions. Focus starts on
   Cancel; Escape or the backdrop cancels; focus returns to the opener. */
export default function ConfirmDialog({ open, title, body, confirmLabel, onConfirm, onClose }) {
  const titleId = useId();
  const bodyId = useId();
  const cancelRef = useRef(null);
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  });

  /* Remember what opened the dialog (read before focus moves) so focus can
     go back there once it closes. */
  const openerRef = useRef(null);
  if (open && !openerRef.current) openerRef.current = document.activeElement;
  useEffect(() => {
    if (open) return;
    openerRef.current?.focus?.();
    openerRef.current = null;
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    cancelRef.current?.focus();
    const onKeyDown = (event) => {
      if (event.key === "Escape") onCloseRef.current?.();
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
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={bodyId}
        className="pg-pop-in relative w-full max-w-[440px] rounded-2xl border border-line bg-surface p-6 shadow-2xl"
      >
        <div className="flex items-start gap-4">
          <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-bad/10 ring-1 ring-bad/20">
            <TriangleAlert className="size-5 text-bad" strokeWidth={1.75} />
          </span>
          <div className="min-w-0">
            <h2 id={titleId} className="text-[17px] font-semibold">
              {title}
            </h2>
            <p id={bodyId} className="mt-1.5 text-[14px] leading-6 text-muted">
              {body}
            </p>
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <button ref={cancelRef} type="button" onClick={onClose} className={btn("secondary")}>
            Cancel
          </button>
          <button
            type="button"
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className={btn("danger")}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
