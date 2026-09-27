import { useId } from "react";
import { CARD } from "../../lib/ui";

/* Shared shell for every Settings / Profile card: outline icon, title and
   description, then the card's controls. `inset` lines the controls up
   with the title instead of the icon. */
export default function SettingsCard({ icon: Icon, title, description, inset = false, children }) {
  const headingId = useId();
  return (
    <section aria-labelledby={headingId} className={`${CARD} p-6`}>
      <div className="flex items-start gap-4">
        <Icon className="mt-0.5 size-6 shrink-0 text-text" strokeWidth={1.6} />
        <div className="min-w-0">
          <h2 id={headingId} className="text-[17px] font-semibold leading-6">
            {title}
          </h2>
          <p className="mt-1 text-[13px] text-muted">{description}</p>
        </div>
      </div>
      <div className={`mt-5 ${inset ? "sm:pl-10" : ""}`}>{children}</div>
    </section>
  );
}

/* Label above a control with a short hint underneath. */
export function Field({ id, label, hint, children }) {
  return (
    <div className="min-w-0">
      <label htmlFor={id} className="mb-2 block text-[13px] font-medium">
        {label}
      </label>
      {children}
      {hint && <p className="mt-1.5 text-[12px] text-muted">{hint}</p>}
    </div>
  );
}
