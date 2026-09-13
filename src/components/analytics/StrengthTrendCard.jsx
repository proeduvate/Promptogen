import { ArrowUp } from "lucide-react";
import { COMPARE_PERIOD, STRENGTH_TREND } from "../../data/analytics";
import { CARD } from "../../lib/ui";

/* Bars are scaled from this floor so small day-to-day gains stay visible. */
const BASELINE = 60;

export default function StrengthTrendCard() {
  const { score, label, delta, bars } = STRENGTH_TREND;
  const lastIndex = bars.length - 1;

  return (
    <section className={`${CARD} p-6`}>
      <h2 className="text-[17px] font-semibold">Prompt Strength Trend</h2>

      <div className="mt-4 flex items-baseline gap-1.5">
        <span className="text-[40px] font-bold leading-none tracking-tight">{score}</span>
        <span className="text-[14px] text-muted">/100</span>
        <span className="ml-2 text-[15px] font-semibold text-good">{label}</span>
      </div>
      <p className="mt-2 flex items-center gap-1.5 text-[13px] text-muted">
        <span className="flex items-center gap-0.5 font-medium text-good">
          <ArrowUp className="size-3.5" strokeWidth={2.5} />
          {delta} points
        </span>
        {COMPARE_PERIOD}
      </p>

      <div className="mt-6 flex h-[110px] items-end gap-2.5">
        {bars.map((bar, index) => (
          <div key={bar.label} className="flex h-full flex-1 items-end" title={`${bar.label}: ${bar.value}`}>
            <div
              className={[
                "w-full rounded-t-md transition-colors",
                index === lastIndex ? "bg-brand" : "bg-brand/30 hover:bg-brand/55",
              ].join(" ")}
              style={{ height: `${Math.max(8, ((bar.value - BASELINE) / (100 - BASELINE)) * 100)}%` }}
            />
          </div>
        ))}
      </div>
      <div className="mt-2 flex gap-2.5 text-[11px] text-faint">
        {bars.map((bar, index) => (
          <span key={bar.label} className="relative h-4 flex-1">
            {index % 2 === 0 && (
              <span className="absolute left-1/2 -translate-x-1/2 whitespace-nowrap">{bar.label}</span>
            )}
          </span>
        ))}
      </div>
    </section>
  );
}
