import { useState } from "react";
import { LayoutTemplate } from "lucide-react";
import Dialog from "../Dialog";
import SelectInput from "../SelectInput";
import { TEMPLATE_CATEGORIES } from "../../data/templates";
import { promptToText } from "../../lib/promptText";
import { findKind } from "../../lib/sections";
import { btn } from "../../lib/ui";

const toVariable = (key) => key.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");

/* Context values become {{variables}}; the user picks which. */
export function detectVariables(sections) {
  return (findKind(sections, "context")?.items ?? [])
    .filter((item) => item.key && item.text)
    .map((item) => ({ name: toVariable(item.key), label: item.key, value: item.text, include: true }));
}

/* Replace each included value with its {{variable}} across every section. */
export function templatize(sections, variables) {
  const swap = (text) =>
    variables.filter((variable) => variable.include && variable.value).reduce((current, variable) => current.split(variable.value).join(`{{${variable.name}}}`), text);
  return sections.map((section) =>
    section.type === "text" ? { ...section, content: swap(section.content) } : { ...section, items: section.items.map((item) => ({ ...item, text: swap(item.text) })) },
  );
}

/* Convert to Template (spec §28–30): detected values become variables,
   and the template is saved to the user's personal templates. */
export default function TemplateDialog({ title, domain, sections, onClose, onSave }) {
  const [name, setName] = useState(`${title} template`);
  const [category, setCategory] = useState(TEMPLATE_CATEGORIES.some(({ id }) => id === domain) ? domain : "business");
  const [description, setDescription] = useState("");
  const [variables, setVariables] = useState(() => detectVariables(sections));
  const included = variables.filter((variable) => variable.include);
  const templated = templatize(sections, variables);

  const update = (index, patch) => setVariables((list) => list.map((variable, at) => (at === index ? { ...variable, ...patch } : variable)));

  const save = () =>
    onSave({
      id: `personal-${Date.now()}`,
      title: name.trim() || title,
      description: description.trim() || `Reusable version of “${title}”.`,
      category,
      tags: ["Personal", ...included.slice(0, 2).map((variable) => variable.label)],
      personal: true,
      sections: templated,
      variables: included.map(({ name: variableName, label, value }) => ({ name: variableName, label, example: value })),
    });

  const footer = (
    <>
      <button type="button" onClick={onClose} className={`${btn()} mr-auto`}>
        Cancel
      </button>
      <button type="button" onClick={save} className={btn("primary")}>
        Save template
      </button>
    </>
  );

  return (
    <Dialog open onClose={onClose} title="Convert to Template" description="Turn the specifics into variables so you can reuse this prompt." icon={LayoutTemplate} tone="brand" size="lg" footer={footer}>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="text-[13px] font-medium">
          Template name
          <input value={name} maxLength={80} onChange={(event) => setName(event.target.value)} className="mt-1.5 w-full rounded-lg border border-line bg-surface-2 px-3.5 py-2.5 text-[14px] outline-none focus:border-brand/60" />
        </label>
        <label className="text-[13px] font-medium">
          Category
          <SelectInput value={category} onChange={setCategory} options={TEMPLATE_CATEGORIES.map(({ id, label }) => ({ value: id, label }))} className="mt-1.5" />
        </label>
      </div>
      <label className="mt-3 block text-[13px] font-medium">
        Description <span className="font-normal text-faint">(optional)</span>
        <input value={description} maxLength={140} onChange={(event) => setDescription(event.target.value)} className="mt-1.5 w-full rounded-lg border border-line bg-surface-2 px-3.5 py-2.5 text-[14px] outline-none focus:border-brand/60" />
      </label>

      <fieldset className="mt-5">
        <legend className="text-[13px] font-medium">
          {variables.length} variable{variables.length === 1 ? "" : "s"} detected
        </legend>
        {variables.length === 0 ? (
          <p className="mt-1 text-[13px] text-muted">No context details to turn into variables. You can still save it as a personal template.</p>
        ) : (
          <ul className="mt-2 space-y-2">
            {variables.map((variable, index) => (
              <li key={variable.label} className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-lg border border-line bg-surface-2 px-3 py-2 text-[13px]">
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={variable.include} onChange={(event) => update(index, { include: event.target.checked })} className="accent-brand" />
                  <span className="text-muted">{variable.label}</span>
                </label>
                <span className="min-w-0 flex-1 truncate text-faint">“{variable.value}”</span>
                <span className="flex items-center gap-1 font-mono text-[12px]">
                  {"{{"}
                  <input
                    aria-label={`Variable name for ${variable.label}`}
                    value={variable.name}
                    onChange={(event) => update(index, { name: toVariable(event.target.value) || variable.name })}
                    className="w-36 rounded border border-line bg-surface px-1.5 py-0.5 outline-none focus:border-brand/60"
                  />
                  {"}}"}
                </span>
              </li>
            ))}
          </ul>
        )}
      </fieldset>

      <details className="mt-4 rounded-xl border border-line" open>
        <summary className="cursor-pointer px-4 py-2.5 text-[13px] font-semibold">Preview</summary>
        <pre className="max-h-56 overflow-auto whitespace-pre-wrap border-t border-line px-4 py-3 text-[12px] leading-5 text-muted">{promptToText(templated)}</pre>
      </details>
    </Dialog>
  );
}
