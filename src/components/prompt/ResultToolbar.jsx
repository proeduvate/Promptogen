import {
  ArrowLeft,
  Cpu,
  Clock,
  Bookmark,
  BookmarkCheck,
  Heart,
  Download,
  ChevronDown,
  Plus,
} from "lucide-react";
import Menu from "../Menu";
import { btn } from "../../lib/ui";

const Divider = () => <span aria-hidden className="hidden h-5 w-px bg-line sm:block" />;

export default function ResultToolbar({
  model,
  generatedAt,
  saved,
  favorite,
  exportItems,
  onBack,
  onToggleSave,
  onToggleFavorite,
  onNewPrompt,
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[13px] text-muted">
        <button
          type="button"
          onClick={onBack}
          className="-ml-2 flex items-center gap-2 rounded-lg px-2 py-1.5 text-[14px] font-medium text-text transition-colors hover:bg-surface"
        >
          <ArrowLeft className="size-4" />
          Back to Home
        </button>
        <Divider />
        <span className="flex items-center gap-1.5">
          <Cpu className="size-4 text-faint" strokeWidth={1.75} />
          Model: <span className="font-medium text-text">{model}</span>
        </span>
        <Divider />
        <span className="flex items-center gap-1.5">
          <Clock className="size-4 text-faint" strokeWidth={1.75} />
          Generated: <span className="font-medium text-text">{generatedAt}</span>
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={onToggleSave}
          aria-pressed={saved}
          className={btn(saved ? "brandSoft" : "secondary")}
        >
          {saved ? <BookmarkCheck className="size-4" /> : <Bookmark className="size-4" />}
          {saved ? "Saved" : "Save"}
        </button>

        <button
          type="button"
          onClick={onToggleFavorite}
          aria-pressed={favorite}
          className={btn(favorite ? "pinkSoft" : "secondary")}
        >
          <Heart className="size-4" fill={favorite ? "currentColor" : "none"} />
          Favorite
        </button>

        <Menu
          items={exportItems}
          renderTrigger={({ open, toggle }) => (
            <button
              type="button"
              onClick={toggle}
              aria-haspopup="menu"
              aria-expanded={open}
              className={btn()}
            >
              <Download className="size-4" />
              Export
              <ChevronDown className={`size-4 transition-transform ${open ? "rotate-180" : ""}`} />
            </button>
          )}
        />

        <button type="button" onClick={onNewPrompt} className={btn("primary")}>
          <Plus className="size-4" />
          New Prompt
        </button>
      </div>
    </div>
  );
}
