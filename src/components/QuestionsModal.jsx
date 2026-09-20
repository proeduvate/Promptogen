import { useEffect, useMemo, useRef, useState } from "react";
import { X, ArrowRight, ArrowLeft, Check, HelpCircle, ChevronDown } from "lucide-react";
import { WIZARD } from "../data/wizard";
import Stepper from "./Stepper";

/* Empty value per field type, used to seed and reset the answer object. */
const emptyFor = (field) => (field.type === "cards" && field.multiple ? [] : "");

const buildInitialAnswers = () =>
  WIZARD.reduce((acc, step) => {
    step.fields.forEach((field) => {
      acc[field.name] = emptyFor(field);
    });
    return acc;
  }, {});

/* A field counts as answered when it holds a non-empty value. */
const isFilled = (value) =>
  Array.isArray(value) ? value.length > 0 : String(value ?? "").trim().length > 0;

function FieldHeading({ title, hint }) {
  return (
    <div className="mb-3">
      <h3 className="text-[17px] font-semibold">{title}</h3>
      {hint && <p className="mt-1 text-[13px] text-muted">{hint}</p>}
    </div>
  );
}

function TextareaField({ field, value, onChange, autoFocus }) {
  return (
    <div className="relative rounded-lg border border-line bg-surface-2 focus-within:border-brand/60">
      <textarea
        rows={2}
        autoFocus={autoFocus}
        value={value}
        maxLength={field.maxLength}
        placeholder={field.placeholder}
        onChange={(event) => onChange(event.target.value)}
        className="w-full resize-none bg-transparent px-4 pb-7 pt-3.5 text-[14px] leading-6 text-text outline-none placeholder:text-faint"
      />
      <span className="pointer-events-none absolute bottom-2.5 right-4 text-[12px] text-faint">
        {value.length}/{field.maxLength}
      </span>
    </div>
  );
}

function CardsField({ field, value, onChange }) {
  const selected = field.multiple ? value : [value].filter(Boolean);

  const toggle = (id) => {
    if (!field.multiple) {
      onChange(value === id ? "" : id);
      return;
    }
    onChange(value.includes(id) ? value.filter((item) => item !== id) : [...value, id]);
  };

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      {field.options.map(({ id, label, icon: Icon, tone }) => {
        const isOn = selected.includes(id);
        return (
          <button
            key={id}
            type="button"
            role={field.multiple ? "checkbox" : "radio"}
            aria-checked={isOn}
            onClick={() => toggle(id)}
            className={[
              "flex items-center gap-2.5 rounded-lg border px-3 py-3 text-left transition-colors",
              isOn
                ? "border-brand bg-brand/10"
                : "border-line bg-surface-2 hover:bg-surface-3",
            ].join(" ")}
          >
            <span className="grid size-8 shrink-0 place-items-center rounded-md bg-surface-3">
              <Icon className={`size-[17px] ${tone}`} strokeWidth={1.75} />
            </span>
            <span className="min-w-0 flex-1 text-[13px] leading-4">{label}</span>
            <span
              className={[
                "grid size-4 shrink-0 place-items-center border transition-colors",
                field.multiple ? "rounded-[4px]" : "rounded-full",
                isOn ? "border-brand bg-brand text-white" : "border-line",
              ].join(" ")}
            >
              {isOn && <Check className="size-3" strokeWidth={3} />}
            </span>
          </button>
        );
      })}
    </div>
  );
}

function SelectField({ field, value, onChange }) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={[
          "w-full appearance-none rounded-lg border border-line bg-surface-2 px-4 py-3.5 text-[14px] outline-none focus:border-brand/60",
          value ? "text-text" : "text-faint",
        ].join(" ")}
      >
        <option value="">{field.placeholder}</option>
        {field.options.map((option) => (
          <option key={option} value={option} className="text-text">
            {option}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-4 top-1/2 size-[18px] -translate-y-1/2 text-muted" />
    </div>
  );
}

const FIELDS = {
  textarea: TextareaField,
  cards: CardsField,
  select: SelectField,
};

export default function QuestionsModal({ open, seed = "", onClose, onComplete }) {
  const [stepIndex, setStepIndex] = useState(0);
  const [answers, setAnswers] = useState(buildInitialAnswers);
  const dialogRef = useRef(null);

  /* Reopening always starts a clean run, pre-filled with the hero input. */
  useEffect(() => {
    if (!open) return;
    setStepIndex(0);
    setAnswers({ ...buildInitialAnswers(), goal: seed.slice(0, 200) });
  }, [open, seed]);

  /* Escape to close, and lock background scroll while the dialog is up. */
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, onClose]);

  const step = WIZARD[stepIndex];
  const isLastStep = stepIndex === WIZARD.length - 1;

  const canAdvance = useMemo(
    () => step.fields.every((field) => !field.required || isFilled(answers[field.name])),
    [step, answers],
  );

  if (!open) return null;

  const setAnswer = (name, value) => setAnswers((prev) => ({ ...prev, [name]: value }));

  const handleNext = () => {
    if (!canAdvance) return;
    if (isLastStep) {
      onComplete(answers);
      return;
    }
    setStepIndex((index) => index + 1);
    dialogRef.current?.querySelector("[data-modal-body]")?.scrollTo({ top: 0 });
  };

  return (
    <div className="pg-fade-in fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/65 backdrop-blur-[2px]"
        onClick={onClose}
        aria-hidden
      />

      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="pg-modal-title"
        className="pg-pop-in relative flex max-h-[88vh] w-full max-w-[810px] flex-col overflow-hidden rounded-2xl border border-line bg-surface shadow-2xl"
      >
        {/* Header */}
        <div className="px-7 pt-7">
          <div className="flex items-start gap-4">
            <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-purple/10 ring-1 ring-purple/20">
              <HelpCircle className="size-6 text-purple" strokeWidth={1.75} />
            </span>
            <div className="flex-1">
              <h2 id="pg-modal-title" className="text-[22px] font-semibold">
                Answer a Few Questions
              </h2>
              <p className="mt-1 text-[14px] text-muted">
                Help our AI understand your needs better.
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="-mr-1 grid size-9 place-items-center rounded-lg text-muted transition-colors hover:bg-surface-2 hover:text-text"
            >
              <X className="size-5" />
            </button>
          </div>

          <div className="mt-7">
            <Stepper steps={WIZARD} current={stepIndex} onStepClick={setStepIndex} />
          </div>
        </div>

        <div className="mt-6 h-px bg-line" />

        {/* Questions for the active step */}
        <div data-modal-body className="flex-1 overflow-y-auto px-7 py-6">
          {step.fields.map((field, index) => {
            const Field = FIELDS[field.type];
            return (
              <div key={field.name} className={index === 0 ? "" : "mt-7"}>
                <FieldHeading title={field.title} hint={field.hint} />
                <Field
                  field={field}
                  value={answers[field.name]}
                  onChange={(value) => setAnswer(field.name, value)}
                  autoFocus={index === 0 && field.type === "textarea"}
                />
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-line px-7 py-5">
          <button
            type="button"
            onClick={stepIndex === 0 ? onClose : () => setStepIndex((index) => index - 1)}
            className="flex items-center gap-2 rounded-lg border border-line bg-surface-2 px-5 py-2.5 text-[14px] font-medium transition-colors hover:bg-surface-3"
          >
            {stepIndex > 0 && <ArrowLeft className="size-4" />}
            {stepIndex === 0 ? "Cancel" : "Back"}
          </button>

          <button
            type="button"
            onClick={handleNext}
            disabled={!canAdvance}
            className="flex items-center gap-2 rounded-lg bg-brand-strong px-6 py-2.5 text-[14px] font-medium text-white transition-colors hover:bg-brand disabled:cursor-not-allowed disabled:opacity-40"
          >
            {isLastStep ? "Generate Prompt" : "Next"}
            <ArrowRight className="size-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
