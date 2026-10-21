import { CreditCard, Crown, ArrowRight } from "lucide-react";
import SettingsCard from "./SettingsCard";
import { btn } from "../../lib/ui";

/* Hand-off point: load plan and month-to-date usage from the billing API. */
const USAGE = [
  { label: "Prompts generated", used: 32, limit: 50 },
  { label: "Test runs", used: 12, limit: 20 },
  { label: "Model Lab comparisons", used: 3, limit: 10 },
];

/* Subscription and usage (spec §57). */
export default function PlanUsageCard({ onUpgrade }) {
  const resets = new Date();
  resets.setMonth(resets.getMonth() + 1, 1);

  return (
    <SettingsCard icon={CreditCard} title="Plan & Usage" description="Your subscription and this month's usage.">
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-line bg-surface-2 px-4 py-3">
        <div className="min-w-0 flex-1">
          <p className="text-[14px] font-semibold">Free plan</p>
          <p className="text-[12px] text-muted">
            Usage resets {resets.toLocaleDateString("en-US", { month: "short", day: "numeric" })}.
          </p>
        </div>
        <button type="button" onClick={onUpgrade} className={btn("primary", "sm")}>
          <Crown className="size-4" />
          Upgrade
          <ArrowRight className="size-4" />
        </button>
      </div>
      <ul className="mt-4 space-y-3.5">
        {USAGE.map(({ label, used, limit }) => {
          const percent = Math.round((used / limit) * 100);
          return (
            <li key={label}>
              <div className="flex items-baseline justify-between text-[13px]">
                <span>{label}</span>
                <span className="text-muted">
                  {used} / {limit}
                </span>
              </div>
              <div
                className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-surface-3"
                role="progressbar"
                aria-label={label}
                aria-valuenow={used}
                aria-valuemin={0}
                aria-valuemax={limit}
              >
                <div className={`h-full rounded-full ${percent >= 80 ? "bg-amber" : "bg-brand"}`} style={{ width: `${percent}%` }} />
              </div>
            </li>
          );
        })}
      </ul>
    </SettingsCard>
  );
}
