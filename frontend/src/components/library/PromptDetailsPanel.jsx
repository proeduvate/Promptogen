import { Fragment, useState } from "react";
import { Check, Copy, Plus, Star } from "lucide-react";
import Tabs from "../Tabs";
import ModelChip from "../ModelChip";
import TagList from "./TagList";
import VersionCompare from "./VersionCompare";
import SectionBody, { SectionLabel } from "../prompt/SectionBody";
import { RatingPill, ScoreValue } from "../ScoreBadge";
import { FOLDERS } from "../../data/library";
import { copyText, promptToText } from "../../lib/promptText";
import { CARD, btn } from "../../lib/ui";

const DETAIL_TABS = [
  { id: "details", label: "Prompt Details" },
  { id: "compare", label: "Version Compare", badge: "New" },
];

function PromptDetails({ prompt, onToggleFavorite }) {
  const [copied, setCopied] = useState(false);
  const current = prompt.versions?.find(({ id }) => id === prompt.currentVersion);
  const folder = FOLDERS.find(({ id }) => id === prompt.folder);

  const handleCopy = async () => {
    if (!(await copyText(promptToText(current.sections)))) return;
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  const meta = [
    { label: "Model", value: <ModelChip model={prompt.model} /> },
    { label: "Folder", value: folder?.label ?? "—" },
    { label: "Created", value: `By ${prompt.createdBy === "you" ? "you" : "a teammate"} · ${prompt.created}` },
    {
      label: "Strength",
      value: (
        <span className="flex items-center gap-2">
          <ScoreValue score={prompt.score} />
          <RatingPill score={prompt.score} />
        </span>
      ),
    },
    { label: "Version", value: current ? `${current.id} (Current) · ${current.date}` : "—" },
    { label: "Tags", value: <TagList tags={prompt.tags} moreTags={prompt.moreTags} /> },
  ];

  return (
    <div>
      <div className="flex items-start gap-3">
        <h3 className="min-w-0 flex-1 text-[17px] font-semibold leading-snug">{prompt.title}</h3>
        <button
          type="button"
          aria-label={prompt.favorite ? "Remove from favorites" : "Add to favorites"}
          aria-pressed={prompt.favorite}
          onClick={() => onToggleFavorite(prompt.id)}
          className={`mt-0.5 transition-colors ${prompt.favorite ? "text-amber" : "text-faint hover:text-amber"}`}
        >
          <Star className="size-[18px]" fill={prompt.favorite ? "currentColor" : "none"} strokeWidth={1.75} />
        </button>
      </div>

      <dl className="mt-4 grid grid-cols-[76px_minmax(0,1fr)] items-center gap-x-3 gap-y-2.5 text-[13px]">
        {meta.map(({ label, value }) => (
          <Fragment key={label}>
            <dt className="text-muted">{label}</dt>
            <dd>{value}</dd>
          </Fragment>
        ))}
      </dl>

      {current ? (
        <>
          <div className="mt-5 space-y-3 rounded-xl border border-line bg-surface-2 p-4">
            {current.sections.map((section) => (
              <div key={section.id}>
                <SectionLabel section={section} compact />
                <div className="mt-1">
                  <SectionBody section={section} compact />
                </div>
              </div>
            ))}
          </div>
          <button type="button" onClick={handleCopy} className={`${btn("primary", "sm")} mt-4`}>
            {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
            {copied ? "Copied!" : "Copy Prompt"}
          </button>
        </>
      ) : (
        <p className="mt-5 rounded-xl border border-dashed border-line px-4 py-8 text-center text-[13px] leading-6 text-muted">
          No saved versions for this prompt yet.
        </p>
      )}
    </div>
  );
}

export default function PromptDetailsPanel({ prompt, onToggleFavorite, onUseVersion, onNewVersion }) {
  const [tab, setTab] = useState((prompt.versions?.length ?? 0) > 1 ? "compare" : "details");

  return (
    <section className={`${CARD} min-w-0`}>
      <div className="flex flex-wrap items-end justify-between gap-x-3 border-b border-line px-5 pt-3">
        <Tabs tabs={DETAIL_TABS} active={tab} onChange={setTab} bordered={false} />
        <button
          type="button"
          onClick={() => onNewVersion(prompt.id)}
          className={`${btn("secondary", "sm")} mb-2.5`}
        >
          <Plus className="size-4" />
          New Version
        </button>
      </div>

      <div className="p-5">
        {tab === "details" ? (
          <PromptDetails prompt={prompt} onToggleFavorite={onToggleFavorite} />
        ) : (
          <VersionCompare prompt={prompt} onBack={() => setTab("details")} onUseVersion={onUseVersion} />
        )}
      </div>
    </section>
  );
}
