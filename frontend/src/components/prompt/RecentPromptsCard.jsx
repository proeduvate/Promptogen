import { FileText } from "lucide-react";
import { RECENT_PROMPTS } from "../../data/generated";
import { ScoreValue } from "../ScoreBadge";
import { CARD, ICON_TILE } from "../../lib/ui";

export default function RecentPromptsCard({ onOpen }) {
  return (
    <section className={`${CARD} p-6`}>
      <h2 className="text-[19px] font-semibold">Recent Prompts</h2>
      <ul className="mt-4 space-y-2">
        {RECENT_PROMPTS.map(({ id, title, when, score }) => (
          <li key={id}>
            <button
              type="button"
              onClick={() => onOpen(id)}
              className="flex w-full items-center gap-3 rounded-xl border border-line bg-surface-2 p-3 text-left transition-colors hover:bg-surface-3"
            >
              <span className={`${ICON_TILE} size-9 bg-brand/10 ring-brand/20`}>
                <FileText className="size-[18px] text-brand" strokeWidth={1.75} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[14px] font-medium leading-5">{title}</span>
                <span className="mt-0.5 block text-[12px] text-faint">{when}</span>
              </span>
              <span className="shrink-0 text-right">
                <span className="block text-[11px] text-faint">Score</span>
                <ScoreValue score={score} />
              </span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
