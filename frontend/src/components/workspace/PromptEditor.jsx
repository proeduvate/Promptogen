import { useEffect, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  Bot,
  Check,
  Copy,
  CopyPlus,
  FileText,
  FlaskConical,
  GripVertical,
  Lightbulb,
  Loader2,
  MoreHorizontal,
  Pencil,
  Plus,
  Redo2,
  Sparkles,
  Trash2,
  Undo2,
  Wand2,
} from "lucide-react";
import Menu from "../Menu";
import SectionBody, { SectionLabel } from "../prompt/SectionBody";
import { SECTION_ACTIONS } from "../../lib/optimizer";
import { copyText, parseSectionBody, promptToText, sectionBody } from "../../lib/promptText";
import { ADDABLE_KINDS, SECTION_TEMPLATES, insertSection, kindOf, newSection } from "../../lib/sections";
import { CARD, ICON_TILE, btn } from "../../lib/ui";

const rowsFor = (value) => Math.max(2, value.split("\n").reduce((rows, line) => rows + 1 + Math.floor(line.length / 90), 0));

const kindName = (kind) => (kind === "custom" ? "Custom section" : SECTION_TEMPLATES[kind].label.replace("SYSTEM / ", "").toLowerCase().replace(/^\w|\s\w/g, (c) => c.toUpperCase()));

function IconButton({ label, icon: Icon, onClick, disabled, tone = "" }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className={`grid size-8 place-items-center rounded-md text-muted transition-colors hover:bg-surface-3 hover:text-text disabled:cursor-not-allowed disabled:opacity-35 ${tone}`}
    >
      <Icon className="size-4" />
    </button>
  );
}

/* The generated prompt: read view plus a section editor (spec §10) with
   drag-and-drop, add / duplicate / delete, AI actions per section, undo /
   redo and draft autosave. Text edits are committed when a field loses focus. */
export default function PromptEditor({
  title,
  versionName,
  dirty,
  autosave,
  sections,
  onCommit,
  editing,
  onEditingChange,
  history,
  tip,
  moreItems,
  onImprove,
  onTest,
  onAssistant,
  onSectionAction,
}) {
  const [drafts, setDrafts] = useState({});
  const [copied, setCopied] = useState(false);
  const [drag, setDrag] = useState(null);
  const [over, setOver] = useState(null);

  useEffect(() => {
    if (!copied) return undefined;
    const timer = setTimeout(() => setCopied(false), 1800);
    return () => clearTimeout(timer);
  }, [copied]);

  /* Ctrl/Cmd+Z and Shift+Ctrl/Cmd+Z outside text fields (fields keep their own undo). */
  useEffect(() => {
    const onKeyDown = (event) => {
      if (!(event.metaKey || event.ctrlKey) || event.key.toLowerCase() !== "z") return;
      if (event.target.closest?.("input, textarea, select, [contenteditable=true], [role=dialog]")) return;
      event.preventDefault();
      if (event.shiftKey) history.redo();
      else history.undo();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [history]);

  const replace = (section, next) => sections.map((current) => (current.id === section.id ? next : current));

  const commitDraft = (section) => {
    const draft = drafts[section.id];
    if (draft == null) return;
    setDrafts((current) => {
      const rest = { ...current };
      delete rest[section.id];
      return rest;
    });
    const parsed = parseSectionBody(section, draft);
    if (JSON.stringify(parsed) !== JSON.stringify(section)) onCommit(replace(section, parsed), `Edited ${section.label}`);
  };

  const move = (from, to) => {
    if (from === to || to < 0 || to >= sections.length) return;
    const next = [...sections];
    const [section] = next.splice(from, 1);
    next.splice(to, 0, section);
    onCommit(next, `Moved ${section.label}`);
  };

  const duplicate = (section) => {
    const copy = { ...newSection(sections, kindOf(section)), label: section.label, type: section.type };
    if (section.type === "text") copy.content = section.content;
    else copy.items = section.items.map((item) => ({ ...item }));
    const index = sections.indexOf(section);
    onCommit([...sections.slice(0, index + 1), copy, ...sections.slice(index + 1)], `Duplicated ${section.label}`, null, true);
  };

  const remove = (section) => onCommit(sections.filter((current) => current !== section), `Deleted ${section.label}`, null, true);

  const add = (kind) => {
    const section = newSection(sections, kind);
    onCommit(insertSection(sections, section), `Added ${section.label}`);
    requestAnimationFrame(() => document.getElementById(`pg-edit-${section.id}`)?.focus());
  };

  const addItems = ADDABLE_KINDS.map((kind) => ({ id: kind, label: kindName(kind), onSelect: () => add(kind) }));
  const aiItems = (section) =>
    SECTION_ACTIONS.map(({ id, label }) => ({
      id,
      label,
      icon: id === "improve" ? Sparkles : Wand2,
      tone: "text-purple",
      onSelect: () => onSectionAction(id, section.id),
    }));

  return (
    <section className={`${CARD} p-6 sm:p-7`} aria-labelledby="pg-workspace-title">
      <div className="flex items-start gap-4">
        <span className={`${ICON_TILE} size-12 bg-brand/10 ring-brand/20`}>
          <FileText className="size-6 text-brand" strokeWidth={1.75} />
        </span>
        <div className="min-w-0 flex-1">
          <h1 id="pg-workspace-title" className="text-[22px] font-semibold leading-tight sm:text-[24px]">
            Your Generated Prompt
          </h1>
          <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] text-muted">
            <span className="font-medium text-text">{title}</span>
            <span aria-hidden>·</span>
            <span>
              {versionName}
              {dirty && <span className="text-amber"> · unsaved changes</span>}
            </span>
            <span aria-hidden>·</span>
            <span aria-live="polite" className="flex items-center gap-1">
              {autosave === "saving" ? <Loader2 className="size-3.5 animate-spin" /> : <Check className="size-3.5 text-good" />}
              {autosave === "saving" ? "Saving draft…" : "Draft autosaved"}
            </span>
          </p>
        </div>
      </div>

      {/* Actions */}
      <div className="mt-5 flex flex-wrap items-center gap-2">
        {editing ? (
          <>
            <button type="button" onClick={() => onEditingChange(false)} className={btn("primary")}>
              <Check className="size-4" />
              Done Editing
            </button>
            <Menu
              items={addItems}
              align="start"
              renderTrigger={({ open, toggle }) => (
                <button type="button" onClick={toggle} aria-haspopup="menu" aria-expanded={open} className={btn()}>
                  <Plus className="size-4" />
                  Add Section
                </button>
              )}
            />
          </>
        ) : (
          <>
            <button type="button" onClick={async () => setCopied(await copyText(promptToText(sections)))} className={btn("primary")}>
              {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
              {copied ? "Copied!" : "Copy Prompt"}
            </button>
            <button type="button" onClick={() => onEditingChange(true)} className={btn()}>
              <Pencil className="size-4" />
              Edit
            </button>
            <button type="button" onClick={onImprove} className={btn("purpleSoft")}>
              <Sparkles className="size-4" />
              Improve
            </button>
            <button type="button" onClick={onTest} className={btn()}>
              <FlaskConical className="size-4" />
              Test
            </button>
            <button type="button" onClick={onAssistant} className={btn("ghost")}>
              <Bot className="size-4" />
              Ask Assistant
            </button>
          </>
        )}
        <div className="flex-1" />
        <div className="flex items-center gap-1">
          <IconButton label={history.canUndo ? `Undo: ${history.undoLabel}` : "Undo"} icon={Undo2} onClick={history.undo} disabled={!history.canUndo} />
          <IconButton label={history.canRedo ? `Redo: ${history.redoLabel}` : "Redo"} icon={Redo2} onClick={history.redo} disabled={!history.canRedo} />
          {!editing && (
            <Menu
              items={moreItems}
              renderTrigger={({ open, toggle }) => (
                <button type="button" onClick={toggle} aria-label="More actions" aria-haspopup="menu" aria-expanded={open} className={btn("secondary", "icon")}>
                  <MoreHorizontal className="size-4" />
                </button>
              )}
            />
          )}
        </div>
      </div>

      {editing && <p className="mt-3 text-[12px] text-muted">Drag sections by the handle, or use the arrows. Markdown such as **bold** and `code` is supported.</p>}

      <ol className="mt-5 space-y-3">
        {sections.map((section, index) => {
          const draft = drafts[section.id] ?? sectionBody(section);
          return (
            <li
              key={section.id}
              onDragOver={(event) => {
                if (drag == null) return;
                event.preventDefault();
                setOver(index);
              }}
              onDrop={(event) => {
                event.preventDefault();
                if (drag != null) move(drag, index);
                setDrag(null);
                setOver(null);
              }}
              className={[
                "rounded-xl border bg-surface-2 px-4 py-4 transition-colors sm:px-5",
                editing ? "border-brand/30" : "border-line",
                over === index && drag !== index ? "ring-2 ring-brand/50" : "",
                drag === index ? "opacity-60" : "",
              ].join(" ")}
            >
              <div className="flex flex-wrap items-center gap-2">
                {editing && (
                  <span
                    draggable
                    onDragStart={(event) => {
                      event.dataTransfer.effectAllowed = "move";
                      event.dataTransfer.setData("text/plain", section.id);
                      setDrag(index);
                    }}
                    onDragEnd={() => {
                      setDrag(null);
                      setOver(null);
                    }}
                    aria-hidden
                    className="-ml-1 cursor-grab text-faint active:cursor-grabbing"
                  >
                    <GripVertical className="size-4" />
                  </span>
                )}
                {editing && kindOf(section) === "custom" ? (
                  <input
                    aria-label="Section name"
                    value={section.label}
                    onChange={(event) => onCommit(replace(section, { ...section, label: event.target.value.toUpperCase() }), "Renamed section", `label-${section.id}`)}
                    className="min-w-0 rounded-md border border-line bg-surface px-2 py-1 text-[12px] font-semibold tracking-wider outline-none focus:border-brand/60"
                  />
                ) : (
                  <SectionLabel section={section} />
                )}
                {editing && (
                  <div className="ml-auto flex items-center">
                    <IconButton label={`Move ${section.label} up`} icon={ArrowUp} onClick={() => move(index, index - 1)} disabled={index === 0} />
                    <IconButton label={`Move ${section.label} down`} icon={ArrowDown} onClick={() => move(index, index + 1)} disabled={index === sections.length - 1} />
                    <IconButton label={`Duplicate ${section.label}`} icon={CopyPlus} onClick={() => duplicate(section)} />
                    <Menu
                      items={aiItems(section)}
                      renderTrigger={({ open, toggle }) => (
                        <button
                          type="button"
                          onClick={toggle}
                          aria-haspopup="menu"
                          aria-expanded={open}
                          aria-label={`AI actions for ${section.label}`}
                          title="AI actions"
                          className="grid size-8 place-items-center rounded-md text-purple transition-colors hover:bg-purple/10"
                        >
                          <Sparkles className="size-4" />
                        </button>
                      )}
                    />
                    <IconButton label={`Delete ${section.label}`} icon={Trash2} onClick={() => remove(section)} tone="hover:!text-bad" />
                  </div>
                )}
              </div>
              {editing ? (
                <textarea
                  id={`pg-edit-${section.id}`}
                  value={draft}
                  rows={rowsFor(draft)}
                  aria-label={`Edit ${section.label}`}
                  onChange={(event) => setDrafts((current) => ({ ...current, [section.id]: event.target.value }))}
                  onBlur={() => commitDraft(section)}
                  className="mt-2.5 w-full resize-y rounded-lg border border-line bg-surface px-3 py-2 text-[14px] leading-7 text-text outline-none focus:border-brand/60"
                />
              ) : (
                <div className="mt-2.5">
                  <SectionBody section={section} />
                </div>
              )}
            </li>
          );
        })}
      </ol>

      {sections.length === 0 && (
        <p className="rounded-xl border border-dashed border-line px-4 py-8 text-center text-[13px] text-muted">
          This prompt has no sections. Choose Edit, then Add Section.
        </p>
      )}

      {tip && !editing && (
        <div className="mt-5 flex items-center gap-3 rounded-lg border border-brand/25 bg-brand/5 px-4 py-3 text-[13px] text-muted">
          <Lightbulb className="size-[18px] shrink-0 text-amber" strokeWidth={1.75} />
          <span>
            <span className="font-medium text-text">Tip:</span> {tip}
          </span>
        </div>
      )}
    </section>
  );
}
