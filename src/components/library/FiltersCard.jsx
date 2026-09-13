import { ChevronDown, SlidersHorizontal } from "lucide-react";
import { FILTERS } from "../../data/library";
import { CARD, btn } from "../../lib/ui";

/* Selects edit a draft; nothing filters until Apply Filters is pressed. */
export default function FiltersCard({ values, onChange, onClear, onApply }) {
  return (
    <section className={`${CARD} p-5`}>
      <h2 className="flex items-center gap-2 text-[15px] font-semibold">
        <SlidersHorizontal className="size-4 text-muted" strokeWidth={1.75} />
        Filters
      </h2>

      <div className="mt-4 space-y-3.5">
        {FILTERS.map(({ id, label, options }) => (
          <label key={id} className="block">
            <span className="mb-1.5 block text-[12px] text-muted">{label}</span>
            <span className="relative block">
              <select
                value={values[id]}
                onChange={(event) => onChange(id, event.target.value)}
                className="w-full appearance-none rounded-lg border border-line bg-surface-2 py-2.5 pl-3 pr-9 text-[13px] text-text outline-none focus:border-brand/60"
              >
                {options.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
            </span>
          </label>
        ))}
      </div>

      <div className="mt-5 flex items-center gap-2">
        <button type="button" onClick={onClear} className={`${btn("ghost", "sm")} flex-1`}>
          Clear all
        </button>
        <button type="button" onClick={onApply} className={`${btn("primary", "sm")} flex-1`}>
          Apply Filters
        </button>
      </div>
    </section>
  );
}
