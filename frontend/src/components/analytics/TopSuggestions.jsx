import { ArrowRight, Lightbulb } from "lucide-react";
import { IMPACT_STYLE, SUGGESTIONS } from "../../data/analytics";
import { CARD, ICON_TILE, LINK_BUTTON } from "../../lib/ui";

export default function TopSuggestions({ onViewAll }) {
  return (
    <section className={`${CARD} p-6`}>
      <h2 className="text-[17px] font-semibold">Top Suggestions</h2>

      <ul className="mt-4 space-y-2.5">
        {SUGGESTIONS.map(({ id, text, impact, icon: Icon }) => (
          <li key={id} className="flex items-start gap-3 rounded-xl border border-line bg-surface-2 p-3">
            <span className={`${ICON_TILE} size-8 rounded-lg bg-surface-3 ring-line`}>
              <Icon className="size-4 text-brand" strokeWidth={1.75} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[13px] leading-5">{text}</p>
              <span
                className={`mt-1.5 inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ${IMPACT_STYLE[impact]}`}
              >
                {impact} Impact
              </span>
            </div>
          </li>
        ))}
      </ul>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-brand/25 bg-brand/5 px-3 py-2.5 text-[12px] text-muted">
        <span className="flex items-center gap-2">
          <Lightbulb className="size-4 shrink-0 text-amber" strokeWidth={1.75} />
          Apply suggestions to boost your score.
        </span>
        <button type="button" onClick={onViewAll} className={LINK_BUTTON}>
          View all
          <ArrowRight className="size-4" />
        </button>
      </div>
    </section>
  );
}
