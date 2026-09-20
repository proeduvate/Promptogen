import { useEffect, useState } from "react";
import {
  FileText,
  Copy,
  Check,
  Pencil,
  MoreHorizontal,
  RefreshCw,
  Sparkles,
  Lightbulb,
  X,
} from "lucide-react";
import Menu from "../Menu";
import SectionBody, { SectionLabel } from "./SectionBody";
import { copyText, parseSectionBody, promptToText, sectionBody } from "../../lib/promptText";
import { CARD, ICON_TILE, btn } from "../../lib/ui";

/* Rough row count so long single-line sections open fully expanded. */
const rowsFor = (value) =>
  Math.max(2, value.split("\n").reduce((rows, line) => rows + 1 + Math.floor(line.length / 90), 0));

export default function GeneratedPromptCard({
  sections,
  onChange,
  tip,
  moreItems,
  onRegenerate,
  onImprove,
}) {
  const [editing, setEditing] = useState(false);
  const [drafts, setDrafts] = useState({});
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return undefined;
    const timer = setTimeout(() => setCopied(false), 1800);
    return () => clearTimeout(timer);
  }, [copied]);

  const handleCopy = async () => setCopied(await copyText(promptToText(sections)));

  const startEditing = () => {
    setDrafts(Object.fromEntries(sections.map((section) => [section.id, sectionBody(section)])));
    setEditing(true);
  };

  const saveEdits = () => {
    onChange(sections.map((section) => parseSectionBody(section, drafts[section.id] ?? "")));
    setEditing(false);
  };

  return (
    <section className={`${CARD} p-7`}>
      <div className="flex items-start gap-4">
        <span className={`${ICON_TILE} size-12 bg-brand/10 ring-brand/20`}>
          <FileText className="size-6 text-brand" strokeWidth={1.75} />
        </span>
        <div className="min-w-0 flex-1">
          <h1 className="text-[24px] font-semibold leading-tight">Your Generated Prompt</h1>
          <p className="mt-1 text-[14px] text-muted">Ready to use. Copy, refine or export.</p>
        </div>
      </div>

      <div className="mt-6 space-y-3">
        {sections.map((section) => (
          <div
            key={section.id}
            className={`rounded-xl border bg-surface-2 px-5 py-4 ${editing ? "border-brand/30" : "border-line"}`}
          >
            <SectionLabel section={section} />
            {editing ? (
              <textarea
                value={drafts[section.id]}
                rows={rowsFor(drafts[section.id])}
                aria-label={`Edit ${section.label}`}
                onChange={(event) =>
                  setDrafts((prev) => ({ ...prev, [section.id]: event.target.value }))
                }
                className="mt-2.5 w-full resize-y rounded-lg border border-line bg-surface px-3 py-2 text-[14px] leading-7 text-text outline-none focus:border-brand/60"
              />
            ) : (
              <div className="mt-2.5">
                <SectionBody section={section} />
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Actions */}
      <div className="mt-6 flex flex-wrap items-center gap-2">
        {editing ? (
          <>
            <button type="button" onClick={saveEdits} className={btn("primary")}>
              <Check className="size-4" />
              Save Changes
            </button>
            <button type="button" onClick={() => setEditing(false)} className={btn()}>
              <X className="size-4" />
              Cancel
            </button>
          </>
        ) : (
          <>
            <button type="button" onClick={handleCopy} className={btn("primary")}>
              {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
              {copied ? "Copied!" : "Copy Prompt"}
            </button>
            <button type="button" onClick={startEditing} className={btn()}>
              <Pencil className="size-4" />
              Edit Prompt
            </button>
            <Menu
              items={moreItems}
              align="start"
              renderTrigger={({ open, toggle }) => (
                <button
                  type="button"
                  onClick={toggle}
                  aria-label="More actions"
                  aria-haspopup="menu"
                  aria-expanded={open}
                  className={btn("secondary", "icon")}
                >
                  <MoreHorizontal className="size-4" />
                </button>
              )}
            />
          </>
        )}

        <div className="flex-1" />

        <button type="button" onClick={onRegenerate} disabled={editing} className={btn()}>
          <RefreshCw className="size-4" />
          Regenerate
        </button>
        <button type="button" onClick={onImprove} disabled={editing} className={btn("purpleSoft")}>
          <Sparkles className="size-4" />
          Improve Prompt
        </button>
      </div>

      <div className="mt-5 flex items-center gap-3 rounded-lg border border-brand/25 bg-brand/5 px-4 py-3 text-[13px] text-muted">
        <Lightbulb className="size-[18px] shrink-0 text-amber" strokeWidth={1.75} />
        <span>
          <span className="font-medium text-text">Tip:</span> {tip}
        </span>
      </div>
    </section>
  );
}
