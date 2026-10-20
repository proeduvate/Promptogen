import { useId, useState } from "react";
import { Contact, Plus, Pencil, Trash2, Check, X } from "lucide-react";
import SettingsCard from "./SettingsCard";
import Dialog from "../Dialog";
import ConfirmDialog from "../ConfirmDialog";
import { FIELD_SUGGESTIONS } from "../../data/contextProfiles";
import { btn } from "../../lib/ui";

const INPUT =
  "w-full rounded-lg border border-line bg-surface-2 px-3 py-2.5 text-[14px] text-text outline-none placeholder:text-faint focus:border-brand/60";

function ProfileEditor({ profile, onSave, onClose }) {
  const id = useId();
  const [name, setName] = useState(profile?.name ?? "");
  const [fields, setFields] = useState(
    profile?.fields.length ? profile.fields : [{ label: "Company Name", value: "" }, { label: "Target Audience", value: "" }],
  );

  const setField = (index, key, value) =>
    setFields((list) => list.map((field, i) => (i === index ? { ...field, [key]: value } : field)));

  const cleaned = fields.filter((field) => field.label.trim() && field.value.trim());
  const canSave = name.trim().length > 0 && cleaned.length > 0;

  const save = () => {
    onSave({
      id: profile?.id ?? `profile-${Date.now()}`,
      name: name.trim(),
      fields: cleaned.map((field) => ({ label: field.label.trim(), value: field.value.trim() })),
    });
    onClose();
  };

  return (
    <Dialog
      open
      onClose={onClose}
      icon={Contact}
      tone="cyan"
      size="lg"
      title={profile ? `Edit “${profile.name}”` : "New context profile"}
      description="Promptogen uses the relevant fields automatically when this profile is selected."
      footer={
        <>
          <button type="button" onClick={onClose} className={btn("secondary")}>
            Cancel
          </button>
          <button type="button" onClick={save} disabled={!canSave} className={btn("primary")}>
            <Check className="size-4" />
            Save profile
          </button>
        </>
      }
    >
      <label htmlFor={`${id}-name`} className="mb-2 block text-[13px] font-medium">
        Profile name
      </label>
      <input
        id={`${id}-name`}
        data-autofocus
        value={name}
        maxLength={60}
        onChange={(event) => setName(event.target.value)}
        placeholder="e.g., My Client: ABC"
        className={INPUT}
      />

      <p className="mb-2 mt-5 text-[13px] font-medium">Fields</p>
      <datalist id={`${id}-labels`}>
        {FIELD_SUGGESTIONS.map((label) => (
          <option key={label} value={label} />
        ))}
      </datalist>
      <ul className="space-y-2.5">
        {fields.map((field, index) => (
          <li key={index} className="grid grid-cols-[minmax(0,1fr)_auto] gap-2 sm:grid-cols-[200px_minmax(0,1fr)_auto]">
            <input
              aria-label={`Field ${index + 1} name`}
              list={`${id}-labels`}
              value={field.label}
              onChange={(event) => setField(index, "label", event.target.value)}
              placeholder="Field"
              className={`${INPUT} col-span-1`}
            />
            <input
              aria-label={`${field.label || `Field ${index + 1}`} value`}
              value={field.value}
              onChange={(event) => setField(index, "value", event.target.value)}
              placeholder="Value"
              className={`${INPUT} col-span-2 row-start-2 sm:col-span-1 sm:row-start-auto`}
            />
            <button
              type="button"
              onClick={() => setFields((list) => list.filter((_, i) => i !== index))}
              aria-label={`Remove ${field.label || "field"}`}
              className="col-start-2 row-start-1 grid size-10 place-items-center rounded-lg text-muted transition-colors hover:bg-surface-2 hover:text-bad sm:col-start-auto sm:row-start-auto"
            >
              <X className="size-4" />
            </button>
          </li>
        ))}
      </ul>
      <button
        type="button"
        onClick={() => setFields((list) => [...list, { label: "", value: "" }])}
        className={`${btn("ghost", "sm")} mt-3`}
      >
        <Plus className="size-4" />
        Add field
      </button>
    </Dialog>
  );
}

/* Manage reusable Context Profiles (spec §20–21). */
export default function ContextProfilesCard({ profiles, activeId, onSave, onDelete, onSetActive }) {
  const [editing, setEditing] = useState(null); // profile, "new", or null
  const [deleting, setDeleting] = useState(null);

  return (
    <SettingsCard
      icon={Contact}
      title="Context Profiles"
      description="Save details you repeat and reuse them in any prompt without typing them again."
    >
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-[13px] text-muted">
          {profiles.length} {profiles.length === 1 ? "profile" : "profiles"}. Pick one on Home with “Use context”.
        </p>
        <button type="button" onClick={() => setEditing("new")} className={btn("primary", "sm")}>
          <Plus className="size-4" />
          New profile
        </button>
      </div>

      {profiles.length === 0 ? (
        <p className="rounded-xl border border-dashed border-line px-4 py-10 text-center text-[13px] text-muted">
          No profiles yet. Create one for your company, a client or a project.
        </p>
      ) : (
        <ul className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {profiles.map((profile) => {
            const isActive = profile.id === activeId;
            return (
              <li
                key={profile.id}
                className={`flex flex-col rounded-xl border p-4 ${isActive ? "border-brand/40 bg-brand/5" : "border-line bg-surface-2"}`}
              >
                <div className="flex items-center gap-2">
                  <h3 className="min-w-0 flex-1 truncate text-[15px] font-semibold">{profile.name}</h3>
                  {isActive && (
                    <span className="rounded-full bg-brand/10 px-2 py-0.5 text-[11px] font-medium text-brand">In use</span>
                  )}
                </div>
                <dl className="mt-2 flex-1 space-y-0.5 text-[13px]">
                  {profile.fields.slice(0, 3).map((field) => (
                    <div key={field.label} className="flex gap-1.5">
                      <dt className="shrink-0 text-muted">{field.label}:</dt>
                      <dd className="min-w-0 truncate">{field.value}</dd>
                    </div>
                  ))}
                  {profile.fields.length > 3 && (
                    <p className="text-[12px] text-faint">+{profile.fields.length - 3} more</p>
                  )}
                </dl>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => onSetActive(isActive ? null : profile.id)}
                    aria-pressed={isActive}
                    className={btn(isActive ? "brandSoft" : "secondary", "sm")}
                  >
                    {isActive ? <Check className="size-4" /> : null}
                    {isActive ? "In use" : "Use"}
                  </button>
                  <button type="button" onClick={() => setEditing(profile)} className={btn("ghost", "sm")} aria-label={`Edit ${profile.name}`}>
                    <Pencil className="size-4" />
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleting(profile)}
                    className={`${btn("ghost", "sm")} hover:text-bad`}
                    aria-label={`Delete ${profile.name}`}
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {editing && (
        <ProfileEditor profile={editing === "new" ? null : editing} onSave={onSave} onClose={() => setEditing(null)} />
      )}
      <ConfirmDialog
        open={deleting !== null}
        title={`Delete “${deleting?.name}”?`}
        body="Prompts you already generated keep their content. This profile won't be offered any more."
        confirmLabel="Delete profile"
        onConfirm={() => onDelete(deleting.id)}
        onClose={() => setDeleting(null)}
      />
    </SettingsCard>
  );
}
