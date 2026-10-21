import { useState } from "react";
import {
  ChevronDown,
  CopyPlus,
  GitCompare,
  History,
  MoreHorizontal,
  NotebookPen,
  Pencil,
  RotateCcw,
  Save,
  Star,
  Trash2,
} from "lucide-react";
import Menu from "../Menu";
import ConfirmDialog from "../ConfirmDialog";
import { ratingFor } from "../../lib/score";
import { timeAgo } from "../../lib/time";
import { CARD, LINK_BUTTON, btn } from "../../lib/ui";

const INPUT = "w-full rounded-lg border border-line bg-surface px-3 py-1.5 text-[13px] outline-none focus:border-brand/60";

function InlineForm({ label, initial, multiline, onSave, onCancel }) {
  const [value, setValue] = useState(initial);
  const Field = multiline ? "textarea" : "input";
  return (
    <form
      className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-start"
      onSubmit={(event) => {
        event.preventDefault();
        onSave(value.trim());
      }}
    >
      <Field
        aria-label={label}
        autoFocus
        rows={multiline ? 2 : undefined}
        value={value}
        maxLength={multiline ? 280 : 60}
        onChange={(event) => setValue(event.target.value)}
        onKeyDown={(event) => event.key === "Escape" && (event.stopPropagation(), onCancel())}
        className={`${INPUT} ${multiline ? "resize-y" : ""}`}
      />
      <div className="flex shrink-0 gap-1.5">
        <button type="submit" className={btn("primary", "sm")}>
          Save
        </button>
        <button type="button" onClick={onCancel} className={btn("ghost", "sm")}>
          Cancel
        </button>
      </div>
    </form>
  );
}

/* Version control (spec §11): save the draft as a version, then rename,
   annotate, restore, duplicate, delete, compare or mark one as preferred. */
export default function VersionsCard({
  versions,
  baseId,
  dirty,
  defaultName,
  qualityOf,
  collapsible,
  recommendation,
  onSave,
  onRestore,
  onDuplicate,
  onDelete,
  onRename,
  onNote,
  onTogglePreferred,
  onCompare,
}) {
  const [expanded, setExpanded] = useState(!collapsible);
  const [name, setName] = useState("");
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const newest = [...versions].reverse();
  const nextNumber = Math.max(...versions.map((version) => version.number)) + 1;
  const base = versions.find((version) => version.id === baseId);

  return (
    <section aria-labelledby="pg-versions-title" className={`${CARD} p-6`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="pg-versions-title" className="flex items-center gap-2 text-[17px] font-semibold">
          <History className="size-[18px] text-brand" strokeWidth={1.75} />
          Versions
          <span className="rounded-full bg-surface-3 px-2 text-[12px] font-medium text-muted">{versions.length}</span>
        </h2>
        <div className="flex items-center gap-2">
          {versions.length > 1 && (
            <button type="button" onClick={() => onCompare(newest[0].id, newest[1].id)} className={btn("secondary", "sm")}>
              <GitCompare className="size-4" />
              Compare Versions
            </button>
          )}
          {collapsible && (
            <button type="button" aria-expanded={expanded} onClick={() => setExpanded((value) => !value)} className={btn("ghost", "sm")}>
              {expanded ? "Hide history" : "Show history"}
              <ChevronDown className={`size-4 transition-transform ${expanded ? "rotate-180" : ""}`} />
            </button>
          )}
        </div>
      </div>

      {dirty && (
        <form
          className="mt-4 rounded-xl border border-amber/40 bg-amber/5 p-3.5"
          onSubmit={(event) => {
            event.preventDefault();
            onSave(name.trim() || defaultName);
            setName("");
          }}
        >
          <label htmlFor="pg-version-name" className="text-[13px] font-medium">
            You have unsaved changes on {base?.label ?? "the draft"}. Save them as V{nextNumber}?
          </label>
          <div className="mt-2 flex flex-col gap-2 sm:flex-row">
            <input id="pg-version-name" value={name} maxLength={60} placeholder={defaultName} onChange={(event) => setName(event.target.value)} className={INPUT} />
            <button type="submit" className={`${btn("primary", "sm")} shrink-0`}>
              <Save className="size-4" />
              Save as V{nextNumber}
            </button>
          </div>
        </form>
      )}

      {recommendation && (
        <div className="mt-4 rounded-xl border border-good/35 bg-good/5 p-3.5 text-[13px]">
          <p className="font-semibold">
            Recommended version: <span className="text-good">{recommendation.version.label}</span>
          </p>
          <dl className="mt-1.5 grid grid-cols-2 gap-x-4 gap-y-0.5 text-[12px] text-muted sm:grid-cols-4">
            {recommendation.facts.map(([label, value]) => (
              <div key={label}>
                <dt>{label}</dt>
                <dd className="font-medium text-text">{value}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-1.5 text-[12px] text-muted">{recommendation.why}</p>
        </div>
      )}

      {expanded ? (
        <ol className="mt-4 divide-y divide-line rounded-xl border border-line">
          {newest.map((version) => {
            const score = qualityOf(version);
            const isBase = version.id === baseId;
            const items = [
              { id: "restore", label: isBase ? "Reload this version" : "Restore", icon: RotateCcw, onSelect: () => onRestore(version.id) },
              { id: "duplicate", label: "Duplicate", icon: CopyPlus, onSelect: () => onDuplicate(version.id) },
              ...(versions.length > 1 && !isBase ? [{ id: "compare", label: `Compare with ${base?.label}`, icon: GitCompare, onSelect: () => onCompare(baseId, version.id) }] : []),
              { id: "rename", label: "Rename", icon: Pencil, onSelect: () => setEditing({ id: version.id, field: "name" }) },
              { id: "note", label: version.note ? "Edit note" : "Add note", icon: NotebookPen, onSelect: () => setEditing({ id: version.id, field: "note" }) },
              { id: "preferred", label: version.preferred ? "Unmark preferred" : "Mark as preferred", icon: Star, tone: "text-amber", onSelect: () => onTogglePreferred(version.id) },
              ...(versions.length > 1 ? [{ id: "delete", label: "Delete", icon: Trash2, tone: "text-bad", onSelect: () => setDeleting(version) }] : []),
            ];
            return (
              <li key={version.id} className={`px-4 py-3 ${isBase ? "bg-brand/5" : ""}`}>
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 grid h-6 min-w-9 place-items-center rounded-md bg-surface-3 px-1.5 text-[12px] font-semibold">{version.label}</span>
                  <div className="min-w-0 flex-1">
                    <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[14px] font-medium">
                      {version.name}
                      {version.preferred && (
                        <span className="flex items-center gap-1 text-[12px] font-medium text-amber">
                          <Star className="size-3.5" fill="currentColor" />
                          Preferred
                        </span>
                      )}
                      {isBase && <span className="rounded-full bg-brand/10 px-2 py-px text-[11px] font-medium text-brand ring-1 ring-brand/25">In editor</span>}
                    </p>
                    <p className="mt-0.5 flex flex-wrap gap-x-3 text-[12px] text-muted">
                      <span>{timeAgo(version.createdAt)}</span>
                      <span>
                        Quality <span className={`font-medium ${ratingFor(score).tone}`}>{score}</span>
                      </span>
                      {version.test && (
                        <span>
                          Tests <span className="font-medium text-text">{version.test.passed}/{version.test.total}</span>
                        </span>
                      )}
                    </p>
                    {version.note && editing?.id !== version.id && <p className="mt-1 text-[12px] italic text-muted">“{version.note}”</p>}
                    {editing?.id === version.id && (
                      <InlineForm
                        label={editing.field === "name" ? `Name for ${version.label}` : `Note for ${version.label}`}
                        initial={editing.field === "name" ? version.name : version.note}
                        multiline={editing.field === "note"}
                        onCancel={() => setEditing(null)}
                        onSave={(value) => {
                          if (editing.field === "name") onRename(version.id, value || version.name);
                          else onNote(version.id, value);
                          setEditing(null);
                        }}
                      />
                    )}
                  </div>
                  <Menu
                    items={items}
                    renderTrigger={({ open, toggle }) => (
                      <button type="button" onClick={toggle} aria-haspopup="menu" aria-expanded={open} aria-label={`Actions for ${version.label}`} className={btn("ghost", "icon")}>
                        <MoreHorizontal className="size-4" />
                      </button>
                    )}
                  />
                </div>
              </li>
            );
          })}
        </ol>
      ) : (
        <p className="mt-3 text-[13px] text-muted">
          Editing {base?.label}: {base?.name}.{" "}
          <button type="button" onClick={() => setExpanded(true)} className={`${LINK_BUTTON} inline-flex`}>
            View all versions
          </button>
        </p>
      )}

      <ConfirmDialog
        open={Boolean(deleting)}
        title={`Delete ${deleting?.label}?`}
        body={`“${deleting?.name}” will be removed from this prompt's history. This can't be undone.`}
        confirmLabel="Delete version"
        onConfirm={() => {
          onDelete(deleting.id);
          setDeleting(null);
        }}
        onClose={() => setDeleting(null)}
      />
    </section>
  );
}
