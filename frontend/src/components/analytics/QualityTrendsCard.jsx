import { ArrowUp, TriangleAlert } from "lucide-react";
import { QUALITY_WEEKS } from "../../data/analytics";
import { DIMENSIONS } from "../../lib/quality";
import { ratingFor } from "../../lib/score";
import { CARD } from "../../lib/ui";

/* Quality Trends (spec §35): is quality improving, and which dimensions
   improve or keep causing problems. */
export default function QualityTrendsCard() {
  const first = QUALITY_WEEKS[0];
  const last = QUALITY_WEEKS[QUALITY_WEEKS.length - 1];
  const rows = DIMENSIONS.map(({ id, label }) => {
    const values = QUALITY_WEEKS.map((week) => week.dimensions[id]);
    const delta = values[values.length - 1] - values[0];
    const problem = values.every((value) => value < 70);
    return { id, label, values, delta, problem };
  });

  return (
    <section aria-labelledby="pg-trends-title" className={`${CARD} p-6`}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="pg-trends-title" className="text-[17px] font-semibold">
          Quality Trends
        </h2>
        <p className="flex items-center gap-1 text-[13px] text-muted">
          <ArrowUp className="size-3.5 text-good" strokeWidth={2.5} />
          <span className="font-medium text-good">+{last.average - first.average}</span> over 4 weeks
        </p>
      </div>

      <table className="mt-4 w-full text-[13px]">
        <caption className="sr-only">Average prompt quality by week</caption>
        <thead>
          <tr className="text-left text-[12px] text-muted">
            <th scope="col" className="pb-2 font-medium">Period</th>
            <th scope="col" className="pb-2 font-medium">Average Prompt Quality</th>
          </tr>
        </thead>
        <tbody>
          {QUALITY_WEEKS.map((week) => (
            <tr key={week.label} className="border-t border-line-soft">
              <th scope="row" className="w-20 py-2 text-left font-normal text-muted">{week.label}</th>
              <td className="py-2">
                <span className="flex items-center gap-3">
                  <span className="h-2 flex-1 overflow-hidden rounded-full bg-surface-3">
                    <span className={`block h-full rounded-full ${ratingFor(week.average).bar}`} style={{ width: `${week.average}%` }} />
                  </span>
                  <span className="w-7 text-right font-semibold">{week.average}</span>
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <h3 className="mt-6 text-[14px] font-semibold">By dimension</h3>
      <div className="mt-2 overflow-x-auto">
        <table className="w-full min-w-[420px] text-[13px]">
          <thead>
            <tr className="text-left text-[12px] text-muted">
              <th scope="col" className="pb-2 font-medium">Dimension</th>
              {QUALITY_WEEKS.map((week) => (
                <th key={week.label} scope="col" className="pb-2 text-right font-medium">
                  {week.label.replace("Week ", "W")}
                </th>
              ))}
              <th scope="col" className="pb-2 pl-3 font-medium">Trend</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-t border-line-soft">
                <th scope="row" className="py-2 text-left font-normal">{row.label}</th>
                {row.values.map((value, index) => (
                  <td key={index} className={`py-2 text-right ${index === row.values.length - 1 ? "font-semibold" : "text-muted"}`}>
                    {value}
                  </td>
                ))}
                <td className="py-2 pl-3 text-[12px]">
                  {row.problem ? (
                    <span className="flex items-center gap-1 font-medium text-bad">
                      <TriangleAlert className="size-3.5" />
                      Recurring problem
                    </span>
                  ) : row.delta >= 8 ? (
                    <span className="font-medium text-good">Improving +{row.delta}</span>
                  ) : (
                    <span className="text-muted">Steady</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
