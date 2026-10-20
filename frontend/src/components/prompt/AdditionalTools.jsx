import { useId } from "react";
import Toggle from "../Toggle";
import { ADDITIONAL_TOOLS } from "../../data/generated";
import { CARD, ICON_TILE } from "../../lib/ui";

/* Workspace tools plus the Simple / Advanced switch (spec §67–68).
   Advanced reveals token and cost analysis, regression checks and full
   version history; everything stays reachable in Simple mode. */
export default function AdditionalTools({ onSelect, advanced, onAdvancedChange }) {
  const switchId = useId();
  return (
    <section className={`${CARD} p-6`} aria-labelledby={`${switchId}-title`}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id={`${switchId}-title`} className="text-[19px] font-semibold">
          Tools
        </h2>
        <span className="flex items-center gap-2.5">
          <label htmlFor={switchId} className="cursor-pointer text-[13px] text-muted">
            Advanced tools
          </label>
          <Toggle id={switchId} checked={advanced} onChange={onAdvancedChange} />
        </span>
      </div>
      <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 2xl:grid-cols-3">
        {ADDITIONAL_TOOLS.map(({ id, title, body, icon: Icon, tone, tint }) => (
          <button
            key={id}
            type="button"
            onClick={() => onSelect(id)}
            className="flex items-start gap-3 rounded-xl border border-line bg-surface-2 p-4 text-left transition-colors hover:border-brand/40 hover:bg-surface-3"
          >
            <span className={`${ICON_TILE} size-10 ${tint}`}>
              <Icon className={`size-5 ${tone}`} strokeWidth={1.75} />
            </span>
            <span className="min-w-0">
              <span className="block text-[14px] font-semibold">{title}</span>
              <span className="mt-0.5 block text-[13px] leading-5 text-muted">{body}</span>
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}
