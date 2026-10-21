import { useState } from "react";
import { Check, Lightbulb, Pencil, X } from "lucide-react";
import { IMPACT } from "../../lib/quality";
import { CARD, LINK_BUTTON, btn } from "../../lib/ui";

/* Improvement suggestions ranked by impact (spec §7): Apply, Edit (change
   the suggested text first), Ignore, or Apply All. */
export default function SuggestionsCard({ suggestions, ignoredCount, onApply, onApplyAll, onIgnore, onRestoreIgnored, onOpenEditor }) {
  const [editing, setEditing] = useState(null);
  const [value, setValue] = useState("");
  const applicable = suggestions.filter((suggestion) => !suggestion.manual);

  return (
    <section aria-labelledby="pg-suggestions-title" className={`${CARD} p-5`}>
      <div className="flex items-center justify-between gap-2">
        <h2 id="pg-suggestions-title" className="flex items-center gap-2 text-[17px] font-semibold">
          <Lightbulb className="size-[18px] text-amber" strokeWidth={1.75} />
          Suggestions
          {suggestions.length > 0 && <span className="rounded-full bg-surface-3 px-2 text-[12px] font-medium text-muted">{suggestions.length}</span>}
        </h2>
        {applicable.length > 1 && (
          <button type="button" onClick={() => onApplyAll(applicable)} className={btn("brandSoft", "sm")}>
            Apply All
          </button>
        )}
      </div>

      {suggestions.length === 0 ? (
        <p className="mt-3 flex items-center gap-2 text-[13px] text-muted">
          <Check className="size-4 text-good" />
          No suggestions. The prompt covers the essentials.
        </p>
      ) : (
        <ul className="mt-3 space-y-2">
          {suggestions.map((suggestion) => {
            const impact = IMPACT[suggestion.impact];
            const isEditing = editing === suggestion.id;
            const inputId = `pg-suggest-${suggestion.id}`;
            return (
              <li key={suggestion.id} className="rounded-lg border border-line bg-surface-2 p-3">
                <div className="flex items-start gap-2">
                  <span className={`mt-0.5 shrink-0 rounded-full px-1.5 py-px text-[10px] font-semibold uppercase tracking-wide ring-1 ${impact.pill}`}>
                    {impact.label}
                    <span className="sr-only"> impact</span>
                  </span>
                  <p className="min-w-0 text-[13px] leading-5">{suggestion.text}</p>
                </div>
                {isEditing && (
                  <div className="mt-2.5">
                    <label htmlFor={inputId} className="text-[12px] text-muted">
                      {suggestion.field.label}
                    </label>
                    <textarea
                      id={inputId}
                      rows={2}
                      value={value}
                      onChange={(event) => setValue(event.target.value)}
                      className="mt-1 w-full resize-y rounded-lg border border-line bg-surface px-3 py-2 text-[13px] leading-5 outline-none focus:border-brand/60"
                    />
                  </div>
                )}
                <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                  {suggestion.manual ? (
                    <button type="button" onClick={onOpenEditor} className={btn("secondary", "sm")}>
                      <Pencil className="size-3.5" />
                      Resolve in editor
                    </button>
                  ) : isEditing ? (
                    <>
                      <button
                        type="button"
                        disabled={!value.trim()}
                        onClick={() => {
                          onApply(suggestion, value.trim());
                          setEditing(null);
                        }}
                        className={btn("primary", "sm")}
                      >
                        Apply
                      </button>
                      <button type="button" onClick={() => setEditing(null)} className={btn("ghost", "sm")}>
                        Cancel
                      </button>
                    </>
                  ) : (
                    <>
                      <button type="button" onClick={() => onApply(suggestion)} className={btn("brandSoft", "sm")}>
                        Apply
                      </button>
                      {suggestion.field && (
                        <button
                          type="button"
                          onClick={() => {
                            setEditing(suggestion.id);
                            setValue(suggestion.field.value);
                          }}
                          className={btn("secondary", "sm")}
                        >
                          Edit
                        </button>
                      )}
                    </>
                  )}
                  {!isEditing && (
                    <button type="button" onClick={() => onIgnore(suggestion.id)} className={btn("ghost", "sm")} aria-label={`Ignore: ${suggestion.text}`}>
                      <X className="size-3.5" />
                      Ignore
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
      {ignoredCount > 0 && (
        <button type="button" onClick={onRestoreIgnored} className={`${LINK_BUTTON} mt-3`}>
          Show {ignoredCount} ignored suggestion{ignoredCount === 1 ? "" : "s"}
        </button>
      )}
    </section>
  );
}
