import { ArrowRight } from "lucide-react";
import { CARD, ICON_TILE, btn } from "../../lib/ui";

/* Wraps runs of matched characters in a subtle <mark>. */
function Highlight({ text, hits }) {
  if (!hits?.size) return text;
  const parts = [];
  let run = "";
  let marked = false;
  const flush = (key) => {
    if (!run) return;
    parts.push(
      marked ? (
        <mark key={key} className="rounded-[3px] bg-brand/20 text-inherit">
          {run}
        </mark>
      ) : (
        run
      ),
    );
    run = "";
  };
  text.split("").forEach((char, index) => {
    const isHit = hits.has(index);
    if (isHit !== marked) flush(index);
    marked = isHit;
    run += char;
  });
  flush(text.length);
  return parts;
}

export default function TemplateCard({ template, category, hits = {}, onUse }) {
  const { title, description, tags } = template;
  const Icon = category.icon;

  return (
    <article className={`${CARD} flex flex-col p-5 transition-colors hover:border-brand/40`}>
      <div className="flex items-start gap-3">
        <span className={`${ICON_TILE} size-11 ${category.tint}`}>
          <Icon className={`size-[22px] ${category.tone}`} strokeWidth={1.75} />
        </span>
        <div className="min-w-0">
          <h3 className="text-[16px] font-semibold leading-6">
            <Highlight text={title} hits={hits.title?.[0]} />
          </h3>
          <p className="text-[12px] text-faint">
            <Highlight text={category.label} hits={hits.categoryLabel?.[0]} />
          </p>
        </div>
      </div>

      <p className="mt-3 line-clamp-2 text-[14px] leading-6 text-muted">{description}</p>

      <ul className="mt-4 flex flex-wrap gap-1.5" aria-label="Tags">
        {tags.map((tag, index) => (
          <li
            key={tag}
            className={[
              "whitespace-nowrap rounded-md px-2 py-0.5 text-[11px]",
              hits.tags?.[index]?.size ? "bg-brand/10 text-brand" : "bg-surface-3 text-muted",
            ].join(" ")}
          >
            {tag}
          </li>
        ))}
      </ul>

      <div className="flex-1" />
      <button
        type="button"
        onClick={() => onUse(template)}
        aria-label={`Use template: ${title}`}
        className={`${btn("brandSoft", "sm")} mt-5 w-full`}
      >
        Use template
        <ArrowRight className="size-4" />
      </button>
    </article>
  );
}
