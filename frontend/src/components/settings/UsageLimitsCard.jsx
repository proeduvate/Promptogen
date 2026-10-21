import { useId } from "react";
import { Gauge } from "lucide-react";
import SettingsCard, { Field } from "./SettingsCard";
import { ToggleRow } from "../Toggle";

const INPUT =
  "w-full rounded-lg border border-line bg-surface-2 px-3.5 py-2.5 text-[14px] text-text outline-none focus:border-brand/60";

/* Hand-off point: read real month-to-date spend from the usage API. */
const SPENT_THIS_MONTH = 4.12;

/* Spending and token limits for test runs (spec §38). */
export default function UsageLimitsCard({ settings, onChange }) {
  const id = useId();
  const budget = Number(settings.monthlyBudget) || 0;
  const used = budget > 0 ? Math.min(100, Math.round((SPENT_THIS_MONTH / budget) * 100)) : 0;

  return (
    <SettingsCard icon={Gauge} title="Usage Limits" description="Keep testing costs predictable." inset>
      <div className="grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-2">
        <Field id={`${id}-budget`} label="Monthly budget (USD)" hint="Test runs pause when the budget is reached.">
          <input
            id={`${id}-budget`}
            type="number"
            min={0}
            step={1}
            value={settings.monthlyBudget}
            onChange={(event) => onChange("monthlyBudget", Math.max(0, Number(event.target.value)))}
            className={INPUT}
          />
        </Field>
        <Field id={`${id}-tokens`} label="Max tokens per run" hint="Caps the response length of each test run.">
          <input
            id={`${id}-tokens`}
            type="number"
            min={256}
            step={256}
            value={settings.maxTokensPerRun}
            onChange={(event) => onChange("maxTokensPerRun", Math.max(256, Number(event.target.value)))}
            className={INPUT}
          />
        </Field>
      </div>

      <div className="mt-5">
        <div className="flex items-baseline justify-between text-[13px]">
          <span className="text-muted">This month</span>
          <span>
            <span className="font-medium">${SPENT_THIS_MONTH.toFixed(2)}</span>
            <span className="text-muted"> of ${budget.toFixed(2)}</span>
          </span>
        </div>
        <div
          className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface-3"
          role="progressbar"
          aria-label="Budget used this month"
          aria-valuenow={used}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div className={`h-full rounded-full ${used >= 80 ? "bg-amber" : "bg-brand"}`} style={{ width: `${used}%` }} />
        </div>
      </div>

      <div className="mt-5">
        <ToggleRow
          label="Budget alerts"
          description="Notify me when I reach 80% of my monthly budget."
          checked={settings.budgetAlerts}
          onChange={(value) => onChange("budgetAlerts", value)}
        />
      </div>
    </SettingsCard>
  );
}
