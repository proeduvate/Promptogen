import { useEffect, useRef, useState } from "react";
import { X, Lightbulb, Send, CheckCircle2 } from "lucide-react";
import { btn } from "../lib/ui";

const AREAS = [
  { id: "generation", label: "Prompt generation" },
  { id: "templates", label: "Templates" },
  { id: "analytics", label: "Analytics" },
  { id: "library", label: "My Prompts" },
  { id: "other", label: "Other" },
];

const TITLE_MAX = 80;
const DETAILS_MAX = 1000;

const FIELD = "rounded-lg border border-line bg-surface-2 focus-within:border-brand/60";

export default function FeatureRequestModal({ open, onClose, onSubmit }) {
  const [title, setTitle] = useState("");
  const [details, setDetails] = useState("");
  const [area, setArea] = useState("");
  const [sent, setSent] = useState(false);

  /* Remember what opened the dialog (read before autoFocus moves focus) so
     focus can go back there once it closes. */
  const openerRef = useRef(null);
  if (open && !openerRef.current) openerRef.current = document.activeElement;
  useEffect(() => {
    if (open) return;
    openerRef.current?.focus?.();
    openerRef.current = null;
  }, [open]);

  /* Each opening starts a blank request. */
  useEffect(() => {
    if (!open) return;
    setTitle("");
    setDetails("");
    setArea("");
    setSent(false);
  }, [open]);

  /* Escape to close, and lock background scroll while the dialog is up. */
  useEffect(() => {
    if (!open) return undefined;
    const onKeyDown = (event) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, onClose]);

  if (!open) return null;

  const canSubmit = title.trim().length > 0 && details.trim().length > 0;

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!canSubmit) return;
    onSubmit({ title: title.trim(), details: details.trim(), area: area || "other" });
    setSent(true);
  };

  return (
    <div className="pg-fade-in fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/65 backdrop-blur-[2px]" onClick={onClose} aria-hidden />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="pg-feature-title"
        className="pg-pop-in relative flex max-h-[88vh] w-full max-w-[560px] flex-col overflow-hidden rounded-2xl border border-line bg-surface shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-start gap-4 border-b border-line px-7 py-6">
          <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-amber/10 ring-1 ring-amber/20">
            <Lightbulb className="size-6 text-amber" strokeWidth={1.75} />
          </span>
          <div className="flex-1">
            <h2 id="pg-feature-title" className="text-[22px] font-semibold">
              Request a Feature
            </h2>
            <p className="mt-1 text-[14px] text-muted">Tell us what would make Promptogen better for you.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="-mr-1 grid size-9 place-items-center rounded-lg text-muted transition-colors hover:bg-surface-2 hover:text-text"
          >
            <X className="size-5" />
          </button>
        </div>

        {sent ? (
          <>
            <div className="flex flex-col items-center px-7 py-12 text-center" role="status">
              <span className="grid size-14 place-items-center rounded-xl bg-good/10 ring-1 ring-good/20">
                <CheckCircle2 className="size-7 text-good" strokeWidth={1.75} />
              </span>
              <h3 className="mt-5 text-[17px] font-semibold">Thanks for the idea!</h3>
              <p className="mt-2 max-w-[380px] text-[14px] leading-6 text-muted">
                We read every request. “{title.trim()}” is now on our list.
              </p>
            </div>
            <div className="flex justify-end border-t border-line px-7 py-5">
              <button type="button" onClick={onClose} autoFocus className={btn("primary")}>
                Done
              </button>
            </div>
          </>
        ) : (
          <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
            <div className="flex-1 space-y-6 overflow-y-auto px-7 py-6">
              <div>
                <label htmlFor="pg-feature-name" className="mb-2 block text-[15px] font-semibold">
                  Feature title
                </label>
                <div className={FIELD}>
                  <input
                    id="pg-feature-name"
                    autoFocus
                    required
                    value={title}
                    maxLength={TITLE_MAX}
                    onChange={(event) => setTitle(event.target.value)}
                    placeholder="e.g., Share templates with my team"
                    className="w-full bg-transparent px-4 py-3 text-[14px] text-text outline-none placeholder:text-faint"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="pg-feature-details" className="mb-2 block text-[15px] font-semibold">
                  What should it do?
                </label>
                <div className={`relative ${FIELD}`}>
                  <textarea
                    id="pg-feature-details"
                    required
                    rows={4}
                    value={details}
                    maxLength={DETAILS_MAX}
                    onChange={(event) => setDetails(event.target.value)}
                    placeholder="Describe the problem it solves and how you'd use it."
                    className="w-full resize-none bg-transparent px-4 pb-7 pt-3 text-[14px] leading-6 text-text outline-none placeholder:text-faint"
                  />
                  <span className="pointer-events-none absolute bottom-2.5 right-4 text-[12px] text-faint">
                    {details.length}/{DETAILS_MAX}
                  </span>
                </div>
              </div>

              <div>
                <p id="pg-feature-area" className="mb-2 text-[15px] font-semibold">
                  Which area is it for? <span className="text-[13px] font-normal text-faint">(optional)</span>
                </p>
                <div role="radiogroup" aria-labelledby="pg-feature-area" className="flex flex-wrap gap-2">
                  {AREAS.map(({ id, label }) => {
                    const isOn = area === id;
                    return (
                      <button
                        key={id}
                        type="button"
                        role="radio"
                        aria-checked={isOn}
                        onClick={() => setArea(isOn ? "" : id)}
                        className={[
                          "rounded-full border px-3.5 py-1.5 text-[13px] transition-colors",
                          isOn
                            ? "border-brand/40 bg-brand/10 font-medium text-brand"
                            : "border-line bg-surface-2 text-muted hover:bg-surface-3 hover:text-text",
                        ].join(" ")}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between border-t border-line px-7 py-5">
              <button type="button" onClick={onClose} className={btn("secondary")}>
                Cancel
              </button>
              <button type="submit" disabled={!canSubmit} className={btn("primary")}>
                Submit request
                <Send className="size-4" />
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
