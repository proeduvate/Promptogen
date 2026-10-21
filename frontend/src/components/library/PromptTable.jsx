import {
  Archive,
  ArchiveRestore,
  Copy,
  Download,
  FlaskConical,
  FolderInput,
  GitCompare,
  MoreHorizontal,
  PencilLine,
  Share2,
  SquarePen,
  Star,
  Trash2,
} from "lucide-react";
import Menu from "../Menu";
import ModelChip from "../ModelChip";
import TagList from "./TagList";
import { RatingPill, ScoreValue } from "../ScoreBadge";
import { FOLDERS } from "../../data/library";
import { ratingFor } from "../../lib/score";
import { timeAgo } from "../../lib/time";
import { CARD, btn } from "../../lib/ui";

const COLUMNS = [
  { label: "Prompt" },
  { label: "Last modified" },
  { label: "Model" },
  { label: "Version" },
  { label: "Tags" },
  { label: "Quality", center: true },
  { label: "Tested", center: true },
  { label: "Actions", sr: true },
];

/* Library rows with the spec §24 details and actions. */
export default function PromptTable({ prompts, selectedId, onSelect, onToggleFavorite, onAction, footer }) {
  return (
    <section className={`${CARD} min-w-0 overflow-hidden`}>
      {/* relative: keeps the visually hidden header label inside the scroll area */}
      <div className="relative overflow-x-auto">
        <table className="w-full min-w-[980px] text-left">
          <thead>
            <tr className="border-b border-line bg-surface-2 text-[12px] text-muted">
              {COLUMNS.map(({ label, center, sr }) => (
                <th key={label} scope="col" className={`whitespace-nowrap px-3 py-3 font-medium first:pl-5 last:pr-5 ${center ? "text-center" : ""}`}>
                  {sr ? <span className="sr-only">{label}</span> : label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {prompts.map((prompt) => {
              const isSelected = prompt.id === selectedId;
              const folder = FOLDERS.find(({ id }) => id === prompt.folder);
              const archived = prompt.folder === "archived";
              const items = [
                { id: "open", label: "Open in workspace", icon: SquarePen, onSelect: () => onAction("open", prompt) },
                { id: "test", label: "Test", icon: FlaskConical, onSelect: () => onAction("test", prompt) },
                ...((prompt.versions?.length ?? 0) > 1 ? [{ id: "compare", label: "Compare versions", icon: GitCompare, onSelect: () => onAction("compare", prompt) }] : []),
                { id: "rename", label: "Rename", icon: PencilLine, onSelect: () => onAction("rename", prompt) },
                { id: "duplicate", label: "Duplicate", icon: Copy, onSelect: () => onAction("duplicate", prompt) },
                { id: "move", label: "Move to folder", icon: FolderInput, onSelect: () => onAction("move", prompt) },
                { id: "share", label: "Share", icon: Share2, onSelect: () => onAction("share", prompt) },
                { id: "export", label: "Export as Markdown", icon: Download, onSelect: () => onAction("export", prompt) },
                archived
                  ? { id: "unarchive", label: "Restore from archive", icon: ArchiveRestore, onSelect: () => onAction("unarchive", prompt) }
                  : { id: "archive", label: "Archive", icon: Archive, onSelect: () => onAction("archive", prompt) },
                { id: "delete", label: "Delete", icon: Trash2, tone: "text-bad", onSelect: () => onAction("delete", prompt) },
              ];
              return (
                <tr
                  key={prompt.id}
                  tabIndex={0}
                  data-selected={isSelected || undefined}
                  onClick={() => onSelect(prompt.id)}
                  onKeyDown={(event) => {
                    if (event.target === event.currentTarget && (event.key === "Enter" || event.key === " ")) {
                      event.preventDefault();
                      onSelect(prompt.id);
                    }
                  }}
                  className={[
                    "cursor-pointer border-b border-line-soft outline-none transition-colors last:border-0 focus-visible:bg-surface-2",
                    isSelected ? "bg-brand/10 shadow-[inset_3px_0_0_var(--color-brand)]" : "hover:bg-surface-2",
                  ].join(" ")}
                >
                  <td className="py-3.5 pl-5 pr-3">
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        aria-label={prompt.favorite ? `Remove ${prompt.title} from favorites` : `Add ${prompt.title} to favorites`}
                        aria-pressed={prompt.favorite}
                        onClick={(event) => {
                          event.stopPropagation();
                          onToggleFavorite(prompt.id);
                        }}
                        className={`shrink-0 transition-colors ${prompt.favorite ? "text-amber" : "text-faint hover:text-amber"}`}
                      >
                        <Star className="size-4" fill={prompt.favorite ? "currentColor" : "none"} strokeWidth={1.75} />
                      </button>
                      <span className="min-w-0">
                        <span className="block text-[14px] font-medium">{prompt.title}</span>
                        <span className="block text-[12px] text-faint">
                          {folder?.label ?? "Personal"} · {prompt.createdBy === "you" ? "You" : "Teammate"}
                        </span>
                      </span>
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-3 py-3.5 text-[12px] text-muted">{prompt.modifiedAt ? timeAgo(prompt.modifiedAt) : prompt.created}</td>
                  <td className="px-3 py-3.5">
                    <ModelChip model={prompt.model} />
                  </td>
                  <td className="whitespace-nowrap px-3 py-3.5 text-[12px] text-muted">{prompt.currentVersion ? prompt.currentVersion.toUpperCase() : "V1"}</td>
                  <td className="max-w-[210px] px-3 py-3.5">
                    <TagList tags={prompt.tags} moreTags={prompt.moreTags} />
                  </td>
                  <td className="px-3 py-3.5 text-center">
                    <span className="flex flex-col items-center gap-1">
                      <ScoreValue score={prompt.score} />
                      <RatingPill score={prompt.score} />
                    </span>
                  </td>
                  <td className="px-3 py-3.5 text-center text-[12px]">
                    {prompt.tested ? (
                      <span className="flex flex-col items-center">
                        <span className={`text-[14px] font-semibold ${ratingFor(prompt.tested.score).tone}`}>{prompt.tested.score}</span>
                        <span className="text-faint">
                          {prompt.tested.passed}/{prompt.tested.total} passed
                        </span>
                      </span>
                    ) : (
                      <span className="text-faint">Not tested</span>
                    )}
                  </td>
                  <td className="py-3.5 pl-3 pr-5" onClick={(event) => event.stopPropagation()}>
                    <Menu
                      portal
                      items={items}
                      renderTrigger={({ open, toggle }) => (
                        <button type="button" onClick={toggle} aria-haspopup="menu" aria-expanded={open} aria-label={`Actions for ${prompt.title}`} className={btn("ghost", "icon")}>
                          <MoreHorizontal className="size-4" />
                        </button>
                      )}
                    />
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
