import { Clock, Star, LayoutTemplate, ArrowRight, History } from "lucide-react";
import { ScoreValue } from "../ScoreBadge";
import { TEMPLATES } from "../../data/templates";
import { CARD, LINK_BUTTON } from "../../lib/ui";

const ROW =
  "flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left transition-colors hover:bg-surface-2";

function Column({ title, icon: Icon, tone, children, empty }) {
  return (
    <div className="min-w-0">
      <h3 className="mb-2 flex items-center gap-2 text-[13px] font-semibold text-muted">
        <Icon className={`size-4 ${tone}`} strokeWidth={1.75} />
        {title}
      </h3>
      {children.length ? <ul className="space-y-0.5">{children}</ul> : <p className="px-2.5 py-2 text-[13px] text-faint">{empty}</p>}
    </div>
  );
}

/* Recent prompts, quick access to saved prompts and templates (spec §2). */
export default function QuickAccess({ prompts, onOpenPrompt, onUseTemplate, onOpenHistory, onOpenTemplates }) {
  const recent = [...prompts].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 3);
  const favorites = prompts.filter((prompt) => prompt.favorite).slice(0, 3);
  const templates = TEMPLATES.slice(0, 3);

  return (
    <section className={`${CARD} p-6`} aria-labelledby="pg-quick-access">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="pg-quick-access" className="text-[17px] font-semibold">
          Pick up where you left off
        </h2>
        <button type="button" onClick={onOpenHistory} className={LINK_BUTTON}>
          <History className="size-4" />
          Prompt history
        </button>
      </div>
      <div className="mt-4 grid grid-cols-1 gap-5 md:grid-cols-3">
        <Column title="Recent prompts" icon={Clock} tone="text-brand" empty="No prompts yet.">
          {recent.map((prompt) => (
            <li key={prompt.id}>
              <button type="button" onClick={() => onOpenPrompt(prompt.id)} className={ROW}>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13px] font-medium">{prompt.title}</span>
                  <span className="block text-[12px] text-faint">{prompt.created}</span>
                </span>
                <ScoreValue score={prompt.score} className="text-[13px]" />
              </button>
            </li>
          ))}
        </Column>
        <Column title="Saved favorites" icon={Star} tone="text-amber" empty="Star a prompt to see it here.">
          {favorites.map((prompt) => (
            <li key={prompt.id}>
              <button type="button" onClick={() => onOpenPrompt(prompt.id)} className={ROW}>
                <span className="min-w-0 flex-1 truncate text-[13px] font-medium">{prompt.title}</span>
              </button>
            </li>
          ))}
        </Column>
        <Column title="Start from a template" icon={LayoutTemplate} tone="text-purple" empty="">
          {[
            ...templates.map((template) => (
              <li key={template.id}>
                <button type="button" onClick={() => onUseTemplate(template)} className={ROW}>
                  <span className="min-w-0 flex-1 truncate text-[13px] font-medium">{template.title}</span>
                </button>
              </li>
            )),
            <li key="all">
              <button type="button" onClick={onOpenTemplates} className={`${LINK_BUTTON} px-2.5 py-2`}>
                All templates
                <ArrowRight className="size-4" />
              </button>
            </li>,
          ]}
        </Column>
      </div>
    </section>
  );
}
