import { useEffect, useState } from "react";
import { Star, Copy, Check, FolderOpen, Heart } from "lucide-react";
import PageShell from "../components/PageShell";
import PageHeader from "../components/PageHeader";
import EmptyState from "../components/EmptyState";
import ModelChip from "../components/ModelChip";
import TagList from "../components/library/TagList";
import { RatingPill, ScoreValue } from "../components/ScoreBadge";
import { copyText, promptToText } from "../lib/promptText";
import { CARD, ICON_TILE, btn } from "../lib/ui";

/* Copyable text for a library prompt: its current version, or the title
   when the mock has no stored sections for it. */
const textFor = (prompt) => {
  const current = prompt.versions?.find(({ id }) => id === prompt.currentVersion);
  return current ? promptToText(current.sections) : prompt.title;
};

function FavoriteCard({ prompt, onOpen, onToggleFavorite }) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return undefined;
    const timer = setTimeout(() => setCopied(false), 1800);
    return () => clearTimeout(timer);
  }, [copied]);

  return (
    <article className={`${CARD} flex flex-col p-5 transition-colors hover:border-brand/40`}>
      <div className="flex items-start gap-3">
        <span className={`${ICON_TILE} size-10 bg-amber/10 ring-amber/20`}>
          <Star className="size-5 text-amber" fill="currentColor" strokeWidth={1.75} />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="text-[15px] font-semibold leading-6">{prompt.title}</h3>
          <p className="text-[12px] text-faint">
            Created by {prompt.createdBy === "you" ? "you" : "a teammate"} · {prompt.created}
          </p>
        </div>
        <button
          type="button"
          onClick={() => onToggleFavorite(prompt.id)}
          aria-label={`Remove ${prompt.title} from favorites`}
          className="grid size-8 shrink-0 place-items-center rounded-lg text-amber transition-colors hover:bg-surface-2"
        >
          <Star className="size-4" fill="currentColor" strokeWidth={1.75} />
        </button>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <ModelChip model={prompt.model} />
        <TagList tags={prompt.tags} moreTags={prompt.moreTags} />
      </div>

      <div className="mt-4 flex items-center gap-2 text-[13px] text-muted">
        Quality <ScoreValue score={prompt.score} /> <RatingPill score={prompt.score} />
      </div>

      <div className="flex-1" />
      <div className="mt-5 flex gap-2">
        <button
          type="button"
          onClick={async () => setCopied(await copyText(textFor(prompt)))}
          className={`${btn("secondary", "sm")} flex-1`}
        >
          {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
          {copied ? "Copied!" : "Copy"}
        </button>
        <button type="button" onClick={() => onOpen(prompt.id)} className={`${btn("brandSoft", "sm")} flex-1`}>
          <FolderOpen className="size-4" />
          Open
        </button>
      </div>
    </article>
  );
}

/* Favorited prompts from the library, for quick access (spec §26). */
export default function FavoritesPage({ chrome, prompts, onToggleFavorite, onOpenPrompt, onBrowseLibrary }) {
  const favorites = prompts.filter((prompt) => prompt.favorite);

  return (
    <PageShell
      chrome={chrome}
      header={<PageHeader title="Favorites" subtitle="Your most-used prompts, one click away." />}
    >
      {favorites.length > 0 ? (
        <>
          <p className="mb-4 text-[13px] text-muted" aria-live="polite">
            {favorites.length} favorite {favorites.length === 1 ? "prompt" : "prompts"}
          </p>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {favorites.map((prompt) => (
              <FavoriteCard
                key={prompt.id}
                prompt={prompt}
                onOpen={onOpenPrompt}
                onToggleFavorite={onToggleFavorite}
              />
            ))}
          </div>
        </>
      ) : (
        <EmptyState
          icon={Heart}
          title="No favorites yet"
          body="Star a prompt in My Prompts or mark a generated prompt as a favorite to keep it here."
        >
          <button type="button" onClick={onBrowseLibrary} className={btn("secondary", "sm")}>
            <FolderOpen className="size-4" />
            Browse My Prompts
          </button>
        </EmptyState>
      )}
    </PageShell>
  );
}
