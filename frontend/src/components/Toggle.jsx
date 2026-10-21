import { useId } from "react";

/* On/off switch. Pass `id` so a <label htmlFor> can name it, or `label`
   for an aria-label when there's no visible text. */
export default function Toggle({ id, checked, onChange, label, describedBy }) {
  return (
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      aria-describedby={describedBy}
      onClick={() => onChange(!checked)}
      className={[
        "inline-flex h-6 w-11 shrink-0 items-center rounded-full p-0.5 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand motion-reduce:transition-none",
        checked ? "bg-brand-strong" : "bg-faint/45",
      ].join(" ")}
    >
      <span
        aria-hidden
        className={[
          "size-5 rounded-full bg-white shadow transition-transform motion-reduce:transition-none",
          checked ? "translate-x-5" : "translate-x-0",
        ].join(" ")}
      />
    </button>
  );
}

/* Toggle with a title and a one-line description beside it; clicking the
   title flips it too. */
export function ToggleRow({ label, description, checked, onChange }) {
  const id = useId();
  return (
    <div className="flex items-start gap-3.5">
      <Toggle id={id} checked={checked} onChange={onChange} describedBy={`${id}-hint`} />
      <div className="min-w-0">
        <label htmlFor={id} className="block cursor-pointer text-[14px] font-medium leading-6">
          {label}
        </label>
        <p id={`${id}-hint`} className="text-[13px] leading-5 text-muted">
          {description}
        </p>
      </div>
    </div>
  );
}
