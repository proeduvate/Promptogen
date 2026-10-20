import { useRef } from "react";
import { Check, Paperclip, X } from "lucide-react";
import SelectInput from "../SelectInput";

/* Inputs for every adaptive question type (spec §4). Grouped choices use
   native radios / checkboxes so keyboard and screen readers work as usual. */
const INPUT =
  "w-full rounded-lg border border-line bg-surface px-3.5 py-2.5 text-[14px] text-text outline-none transition-colors placeholder:text-faint focus:border-brand/60";

const CHIP =
  "relative flex cursor-pointer items-center gap-2 rounded-lg border border-line bg-surface px-3 py-2 text-[13px] transition-colors hover:bg-surface-3 has-[:checked]:border-brand has-[:checked]:bg-brand/10 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-brand";

/* Question types rendered as a <fieldset> with a <legend>, not a <label>. */
export const GROUP_TYPES = new Set(["single", "multi", "yesno", "daterange"]);

function Choices({ id, question, value, onChange, multiple }) {
  const selected = multiple ? value : [value];
  const toggle = (option) => {
    if (!multiple) return onChange(option);
    return onChange(value.includes(option) ? value.filter((item) => item !== option) : [...value, option]);
  };
  return (
    <div className="flex flex-wrap gap-2">
      {question.options.map((option) => {
        const isOn = selected.includes(option.value);
        return (
          <label key={option.value} className={CHIP}>
            <input
              type={multiple ? "checkbox" : "radio"}
              name={id}
              value={option.value}
              checked={isOn}
              onChange={() => toggle(option.value)}
              className="sr-only"
            />
            <span
              aria-hidden
              className={[
                "grid size-4 shrink-0 place-items-center border transition-colors",
                multiple ? "rounded-[4px]" : "rounded-full",
                isOn ? "border-brand bg-brand text-white" : "border-line",
              ].join(" ")}
            >
              {isOn && <Check className="size-3" strokeWidth={3} />}
            </span>
            {option.label}
          </label>
        );
      })}
    </div>
  );
}

const YES_NO = [
  { value: "yes", label: "Yes" },
  { value: "no", label: "No" },
];

function Slider({ id, question, value, onChange }) {
  const current = value === "" ? Math.round((question.min + question.max) / 2) : Number(value);
  const display = question.labels ? question.labels[current - question.min] : current;
  return (
    <div>
      <div className="flex items-center gap-4">
        <input
          id={id}
          type="range"
          min={question.min}
          max={question.max}
          value={current}
          aria-valuetext={String(display)}
          onChange={(event) => onChange(Number(event.target.value))}
          className="h-2 flex-1 cursor-pointer accent-brand"
        />
        <span className={`min-w-[84px] text-right text-[13px] font-medium ${value === "" ? "text-faint" : "text-text"}`}>
          {value === "" ? "Not set" : display}
        </span>
      </div>
      {question.labels && (
        <div className="mt-1 flex justify-between pr-[100px] text-[12px] text-faint" aria-hidden>
          {question.labels.map((label) => (
            <span key={label}>{label}</span>
          ))}
        </div>
      )}
    </div>
  );
}

function FileField({ id, value, onChange }) {
  const inputRef = useRef(null);
  if (value) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-line bg-surface px-3 py-2 text-[13px]">
        <Paperclip className="size-4 shrink-0 text-muted" />
        <span className="min-w-0 flex-1 truncate">{value.name}</span>
        <button
          type="button"
          onClick={() => onChange(null)}
          aria-label={`Remove ${value.name}`}
          className="grid size-7 place-items-center rounded-md text-muted hover:bg-surface-3 hover:text-text"
        >
          <X className="size-4" />
        </button>
      </div>
    );
  }
  return (
    <input
      ref={inputRef}
      id={id}
      type="file"
      // Hand-off point: upload the file with the request once the API accepts files.
      onChange={(event) => {
        const file = event.target.files?.[0];
        if (file) onChange({ name: file.name, size: file.size });
      }}
      className="block w-full text-[13px] text-muted file:mr-3 file:cursor-pointer file:rounded-lg file:border file:border-line file:bg-surface-2 file:px-3 file:py-2 file:text-[13px] file:font-medium file:text-text hover:file:bg-surface-3"
    />
  );
}

export default function QuestionField({ id, question, value, onChange, describedBy }) {
  const shared = { id, "aria-describedby": describedBy };
  switch (question.type) {
    case "textarea":
      return (
        <div className="relative">
          <textarea
            {...shared}
            rows={question.name === "goal" ? 3 : 2}
            value={value}
            maxLength={question.maxLength}
            placeholder={question.placeholder}
            onChange={(event) => onChange(event.target.value)}
            className={`${INPUT} resize-y pb-6 leading-6`}
          />
          {question.maxLength && (
            <span className="pointer-events-none absolute bottom-2 right-3 text-[12px] text-faint">
              {value.length}/{question.maxLength}
            </span>
          )}
        </div>
      );
    case "number":
      return (
        <input
          {...shared}
          type="number"
          inputMode="numeric"
          min={question.min}
          max={question.max}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className={`${INPUT} max-w-[180px]`}
        />
      );
    case "select":
      return (
        <SelectInput
          {...shared}
          value={value}
          onChange={onChange}
          options={[{ value: "", label: "Select…" }, ...question.options]}
          className="max-w-[320px]"
        />
      );
    case "single":
      return <Choices id={id} question={question} value={value} onChange={onChange} />;
    case "multi":
      return <Choices id={id} question={question} value={value} onChange={onChange} multiple />;
    case "yesno":
      return <Choices id={id} question={{ ...question, options: YES_NO }} value={value} onChange={onChange} />;
    case "slider":
      return <Slider id={id} question={question} value={value} onChange={onChange} />;
    case "date":
      return <input {...shared} type="date" value={value} onChange={(event) => onChange(event.target.value)} className={`${INPUT} max-w-[220px]`} />;
    case "daterange":
      return (
        <div className="flex flex-wrap items-center gap-3">
          {["from", "to"].map((end) => (
            <label key={end} className="flex items-center gap-2 text-[13px] text-muted">
              {end === "from" ? "From" : "To"}
              <input
                type="date"
                value={value[end]}
                min={end === "to" ? value.from || undefined : undefined}
                onChange={(event) => onChange({ ...value, [end]: event.target.value })}
                className={`${INPUT} w-auto`}
              />
            </label>
          ))}
        </div>
      );
    case "url": {
      const invalid = value && !/^https?:\/\/\S+\.\S+/i.test(value);
      return (
        <div>
          <input
            {...shared}
            type="url"
            value={value}
            placeholder={question.placeholder}
            aria-invalid={invalid || undefined}
            onChange={(event) => onChange(event.target.value)}
            className={INPUT}
          />
          {invalid && <p className="mt-1.5 text-[12px] text-warn">Enter a full link starting with https://</p>}
        </div>
      );
    }
    case "file":
      return <FileField id={id} value={value} onChange={onChange} />;
    default:
      return (
        <input
          {...shared}
          type="text"
          value={value}
          maxLength={question.maxLength ?? 160}
          placeholder={question.placeholder}
          onChange={(event) => onChange(event.target.value)}
          className={INPUT}
        />
      );
  }
}
