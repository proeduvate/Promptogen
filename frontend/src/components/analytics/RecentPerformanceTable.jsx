import { ArrowRight } from "lucide-react";
import { RECENT_PERFORMANCE } from "../../data/analytics";
import ModelChip from "../ModelChip";
import { ScoreValue } from "../ScoreBadge";
import { ratingFor } from "../../lib/score";
import { CARD, LINK_BUTTON } from "../../lib/ui";

const COLUMNS = [
  { label: "Prompt" },
  { label: "Model" },
  { label: "Strength Score", center: true },
  { label: "Clarity", center: true },
  { label: "Specificity", center: true },
  { label: "Actionability", center: true },
  { label: "Created At" },
];

export default function RecentPerformanceTable({ onViewAll, prompts = RECENT_PERFORMANCE }) {
  const items = prompts && prompts.length > 0 ? prompts : RECENT_PERFORMANCE;
  return (
    <section className={`${CARD} overflow-hidden`}>
      <div className="flex items-center justify-between gap-3 px-6 pb-4 pt-6">
        <h2 className="text-[17px] font-semibold">Recent Prompts Performance</h2>
        <button type="button" onClick={onViewAll} className={LINK_BUTTON}>
          View all
          <ArrowRight className="size-4" />
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[780px] text-left text-[13px]">
          <thead>
            <tr className="border-y border-line bg-surface-2 text-[12px] text-muted">
              {COLUMNS.map(({ label, center }) => (
                <th
                  key={label}
                  scope="col"
                  className={`whitespace-nowrap px-4 py-3 font-medium first:pl-6 last:pr-6 ${center ? "text-center" : ""}`}
                >
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {items.map((row) => {
              const displayTitle = row.prompt_title || row.title || row.original_query;
              const displayScore = row.overall_score ?? row.score ?? 80;
              const displayModel = row.model || "GPT-4o";
              const displayCreated = row.createdAt || row.completed_at || "Recent";
              return (
                <tr
                  key={row.id}
                  className="border-b border-line-soft transition-colors last:border-0 hover:bg-surface-2"
                >
                  <td className="py-3.5 pl-6 pr-4 font-medium">{displayTitle}</td>
                  <td className="px-4 py-3.5">
                    <ModelChip model={displayModel} />
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center justify-center gap-2.5">
                      <ScoreValue score={displayScore} />
                      <span className="h-1 w-12 overflow-hidden rounded-full bg-surface-3">
                        <span
                          className={`block h-full rounded-full ${ratingFor(displayScore).bar}`}
                          style={{ width: `${displayScore}%` }}
                        />
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3.5 text-center text-muted">{row.clarity ?? 80}</td>
                  <td className="px-4 py-3.5 text-center text-muted">{row.specificity ?? 80}</td>
                  <td className="px-4 py-3.5 text-center text-muted">{row.actionability ?? 80}</td>
                  <td className="whitespace-nowrap py-3.5 pl-4 pr-6 text-muted">{displayCreated}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
