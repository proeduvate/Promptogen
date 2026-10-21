import { Check, Lightbulb, Sparkles } from "lucide-react";
import { CARD, LINK_BUTTON, btn } from "../../lib/ui";

/* Personal Prompt Insights (spec §36) and learned preferences (spec §54).
   Insights come from the user's prompts and feedback; every suggested
   default can be inspected and changed in Settings → Prompt Defaults. */
export default function InsightsCard({ insights, preferences, settings, onEnable, onApplyPreferences, onOpenDefaults }) {
  const applied = preferences.every(({ setting, value }) => settings[setting] === value);

  return (
    <section aria-labelledby="pg-insights-title" className={`${CARD} p-6`}>
      <h2 id="pg-insights-title" className="flex items-center gap-2 text-[17px] font-semibold">
        <Lightbulb className="size-[18px] text-amber" strokeWidth={1.75} />
        Personal Insights
      </h2>
      <ul className="mt-4 space-y-3">
        {insights.map((insight) => {
          const enabled = insight.setting && settings[insight.setting];
          return (
            <li key={insight.id} className="rounded-xl border border-line bg-surface-2 p-4">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-faint">Prompt insight</p>
              <p className="mt-1 text-[13px] leading-5">{insight.text}</p>
              {insight.basis && <p className="mt-1 text-[12px] text-faint">{insight.basis}</p>}
              {insight.setting && (
                <button
                  type="button"
                  disabled={enabled}
                  onClick={() => onEnable(insight.setting)}
                  className={`${btn(enabled ? "ghost" : "brandSoft", "sm")} mt-3`}
                >
                  {enabled && <Check className="size-4" />}
                  {enabled ? "Enabled" : insight.action}
                </button>
              )}
            </li>
          );
        })}
      </ul>

      {preferences.length > 0 && (
        <div className="mt-5 rounded-xl border border-brand/30 bg-brand/5 p-4">
          <p className="flex items-center gap-2 text-[13px] font-semibold">
            <Sparkles className="size-4 text-brand" />
            You frequently prefer:
          </p>
          <ul className="mt-2 space-y-1 text-[13px]">
            {preferences.map((preference) => (
              <li key={preference.label} className="flex items-center gap-2">
                <span aria-hidden className="size-1.5 rounded-full bg-brand" />
                {preference.label}
                <span className="text-[12px] text-faint">({preference.evidence})</span>
              </li>
            ))}
          </ul>
          {applied ? (
            <p className="mt-3 text-[13px] text-muted">
              These are your defaults now.{" "}
              <button type="button" onClick={onOpenDefaults} className={`${LINK_BUTTON} inline-flex`}>
                Review in Prompt Defaults
              </button>
            </p>
          ) : (
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <span className="text-[13px]">Use these as defaults?</span>
              <button type="button" onClick={onApplyPreferences} className={btn("primary", "sm")}>
                Yes
              </button>
              <button type="button" onClick={onOpenDefaults} className={LINK_BUTTON}>
                Choose in Prompt Defaults
              </button>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
