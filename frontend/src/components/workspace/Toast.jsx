import { useEffect, useRef } from "react";
import { CheckCircle2, X } from "lucide-react";

/* Short confirmation at the bottom of the screen with an optional action
   (usually Undo). Announced politely to screen readers. */
export default function Toast({ toast, onDismiss }) {
  const dismissRef = useRef(onDismiss);
  useEffect(() => {
    dismissRef.current = onDismiss;
  });
  useEffect(() => {
    if (!toast) return undefined;
    const timer = setTimeout(() => dismissRef.current(), toast.action ? 6000 : 3500);
    return () => clearTimeout(timer);
  }, [toast]);

  return (
    <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-5 z-40 flex justify-center px-4">
      {toast && (
        <div className="pg-pop-in pointer-events-auto flex max-w-[560px] items-center gap-3 rounded-xl border border-line bg-surface px-4 py-3 text-[13px] shadow-2xl">
          <CheckCircle2 className="size-[18px] shrink-0 text-good" />
          <span className="min-w-0 flex-1">{toast.message}</span>
          {toast.action && (
            <button
              type="button"
              onClick={() => {
                toast.action.onClick();
                onDismiss();
              }}
              className="shrink-0 rounded-md px-2 py-1 font-medium text-brand hover:bg-brand/10"
            >
              {toast.action.label}
            </button>
          )}
          <button type="button" onClick={onDismiss} aria-label="Dismiss" className="grid size-7 shrink-0 place-items-center rounded-md text-muted hover:bg-surface-2 hover:text-text">
            <X className="size-4" />
          </button>
        </div>
      )}
    </div>
  );
}
