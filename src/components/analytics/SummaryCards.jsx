import { ArrowUp } from "lucide-react";
import { COMPARE_PERIOD, SUMMARY_CARDS } from "../../data/analytics";
import { CARD, ICON_TILE } from "../../lib/ui";

export default function SummaryCards() {
  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
      {SUMMARY_CARDS.map(({ id, label, value, change, icon: Icon, tone, tint }) => (
        <article key={id} className={`${CARD} p-5`}>
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[13px] text-muted">{label}</p>
              <p className="mt-2.5 text-[30px] font-bold leading-none tracking-tight">{value}</p>
            </div>
            <span className={`${ICON_TILE} size-11 ${tint}`}>
              <Icon className={`size-[22px] ${tone}`} strokeWidth={1.75} />
            </span>
          </div>
          <p className="mt-4 flex items-center gap-1.5 text-[12px] text-muted">
            <span className="flex items-center gap-0.5 font-medium text-good">
              <ArrowUp className="size-3.5" strokeWidth={2.5} />
              {change}
            </span>
            {COMPARE_PERIOD}
          </p>
        </article>
      ))}
    </div>
  );
}
