import { Star } from "lucide-react";
import ModelChip from "../ModelChip";
import TagList from "./TagList";
import { RatingPill, ScoreValue } from "../ScoreBadge";
import { CARD } from "../../lib/ui";

const COLUMNS = [
  { label: "Prompt" },
  { label: "Created" },
  { label: "Model" },
  { label: "Tags" },
  { label: "Score", center: true },
  { label: "Rating" },
];

export default function PromptTable({ prompts, selectedId, onSelect, onToggleFavorite, footer }) {
  return (
    <section className={`${CARD} min-w-0 overflow-hidden`}>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[820px] text-left">
          <thead>
            <tr className="border-b border-line bg-surface-2 text-[12px] text-muted">
              {COLUMNS.map(({ label, center }) => (
                <th
                  key={label}
                  scope="col"
                  className={`whitespace-nowrap px-3 py-3 font-medium first:pl-5 last:pr-5 ${center ? "text-center" : ""}`}
                >
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {prompts.map((prompt) => {
              const isSelected = prompt.id === selectedId;
              return (
                <tr
                  key={prompt.id}
                  tabIndex={0}
                  data-selected={isSelected || undefined}
                  onClick={() => onSelect(prompt.id)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      onSelect(prompt.id);
                    }
                  }}
                  className={[
                    "cursor-pointer border-b border-line-soft outline-none transition-colors last:border-0 focus-visible:bg-surface-2",
                    isSelected
                      ? "bg-brand/10 shadow-[inset_3px_0_0_var(--color-brand)]"
                      : "hover:bg-surface-2",
                  ].join(" ")}
                >
                  <td className="py-3.5 pl-5 pr-3">
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        aria-label={prompt.favorite ? "Remove from favorites" : "Add to favorites"}
                        aria-pressed={prompt.favorite}
                        onClick={(event) => {
                          event.stopPropagation();
                          onToggleFavorite(prompt.id);
                        }}
                        className={`shrink-0 transition-colors ${prompt.favorite ? "text-amber" : "text-faint hover:text-amber"}`}
                      >
                        <Star className="size-4" fill={prompt.favorite ? "currentColor" : "none"} strokeWidth={1.75} />
                      </button>
                      <span className="text-[14px] font-medium">{prompt.title}</span>
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-3 py-3.5 text-[12px] text-muted">
                    Created by {prompt.createdBy === "you" ? "you" : "a teammate"} · {prompt.created}
                  </td>
                  <td className="px-3 py-3.5">
                    <ModelChip model={prompt.model} />
                  </td>
                  <td className="max-w-[230px] px-3 py-3.5">
                    <TagList tags={prompt.tags} moreTags={prompt.moreTags} />
                  </td>
                  <td className="px-3 py-3.5 text-center">
                    <ScoreValue score={prompt.score} />
                  </td>
                  <td className="py-3.5 pl-3 pr-5">
                    <RatingPill score={prompt.score} />
                  </td>
                </tr>
              );
            })}

            {prompts.length === 0 && (
              <tr>
                <td colSpan={COLUMNS.length} className="px-5 py-14 text-center text-[14px] text-muted">
                  No prompts match your search or filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {footer}
    </section>
  );
}
