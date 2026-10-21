import { useState } from "react";
import { Braces } from "lucide-react";
import Dialog from "../Dialog";
import { fillVariables, variableLabel, variablesOf } from "../../data/templates";
import { promptToText } from "../../lib/promptText";
import { btn } from "../../lib/ui";

/* Smart template variables (spec §29): ask for each {{variable}} before
   generating, with a live preview of the filled prompt. */
export default function VariablesDialog({ template, onClose, onSubmit }) {
  const text = template.personal ? promptToText(template.sections) : template.prompt;
  const variables = template.personal
    ? template.variables.map(({ name, label, example }) => ({ name, label, example }))
    : variablesOf(text).map((name) => ({ name, label: variableLabel(name), example: "" }));
  const [values, setValues] = useState(() => Object.fromEntries(variables.map(({ name, example }) => [name, example ?? ""])));
  const missing = variables.filter(({ name }) => !values[name]?.trim()).length;
  const preview = fillVariables(text, values);

  const footer = (
    <>
      <button type="button" onClick={onClose} className={`${btn()} mr-auto`}>
        Cancel
      </button>
      <button type="submit" form="pg-template-vars" disabled={missing > 0} className={btn("primary")}>
        {template.personal ? "Open prompt" : "Continue"}
      </button>
    </>
  );

  return (
    <Dialog
      open
      onClose={onClose}
      title={template.title}
      description={variables.length ? "Fill in the details for this template." : "This template has no variables."}
      icon={Braces}
      tone="brand"
      size="lg"
      footer={footer}
    >
      <form
        id="pg-template-vars"
        onSubmit={(event) => {
          event.preventDefault();
          if (missing === 0) onSubmit(values);
        }}
        className="grid grid-cols-1 gap-3 sm:grid-cols-2"
      >
        {variables.map(({ name, label }, index) => (
          <label key={name} className="text-[13px] font-medium">
            {label}
            <input
              data-autofocus={index === 0 ? true : undefined}
              value={values[name]}
              maxLength={template.personal ? 200 : 80}
              placeholder={`{{${name}}}`}
              onChange={(event) => setValues((current) => ({ ...current, [name]: event.target.value }))}
              className="mt-1.5 w-full rounded-lg border border-line bg-surface-2 px-3.5 py-2.5 text-[14px] font-normal outline-none placeholder:font-mono placeholder:text-faint focus:border-brand/60"
            />
          </label>
        ))}
      </form>
      <div className="mt-5">
        <p className="text-[13px] font-medium">Preview</p>
        <p className="mt-1.5 max-h-60 overflow-auto whitespace-pre-wrap rounded-xl border border-line bg-surface-2 px-4 py-3 text-[13px] leading-6 text-muted">
          {preview.split(/(\{\{\w+\}\})/g).map((part, index) =>
            /^\{\{\w+\}\}$/.test(part) ? (
              <mark key={index} className="rounded bg-amber/20 px-1 font-mono text-[12px] text-text">
                {part}
              </mark>
            ) : (
              <span key={index}>{part}</span>
            ),
          )}
        </p>
        {missing > 0 && <p className="mt-2 text-[12px] text-muted">{missing} detail{missing === 1 ? "" : "s"} left to fill in.</p>}
      </div>
    </Dialog>
  );
}
