import { ArrowRight } from "lucide-react";
import { STRENGTH } from "../data/content";

/* Bars read green at 85+, amber below — mirrors the reference mock. */
const barTone = (value) => (value >= 85 ? "bg-good" : "bg-warn");

function ScoreRing({ score, label }) {
  const radius = 66;
  const circumference = 2 * Math.PI * radius;

  return (
    <div className="relative mx-auto mt-5 size-[164px]">
      <svg viewBox="0 0 160 160" className="size-full -rotate-90">
        <circle
          cx="80"
          cy="80"
          r={radius}
          fill="none"
          stroke="var(--c-surface-3)"
          strokeWidth="12"
        />
        <circle
          cx="80"
          cy="80"
          r={radius}
          fill="none"
          stroke="var(--color-good)"
          strokeWidth="12"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - score / 100)}
          className="transition-[stroke-dashoffset] duration-700 ease-out"
        />
      </svg>
      <div className="absolute inset-0 grid place-content-center text-center">
        <div className="text-[46px] font-bold leading-none">{score}</div>
        <div className="mt-1 text-[13px] text-muted">/100</div>
        <div className="mt-1 text-[16px] font-semibold text-good">{label}</div>
      </div>
    </div>
  );
}

export default function StrengthPanel({
  onViewAnalytics,
  title = "Prompt Strength Overview",
  note = `${STRENGTH.note} 💪`,
}) {
  const { score, label, metrics } = STRENGTH;

  return (
    <section className="rounded-2xl border border-line bg-surface p-6">
      <h2 className="text-center text-[19px] font-semibold">{title}</h2>

      <ScoreRing score={score} label={label} />

      <p className="mt-5 text-center text-[13px] leading-5 text-muted">{note}</p>

      <ul className="mt-5 space-y-4">
        {metrics.map(({ id, label: metricLabel, value }) => (
          <li key={id}>
            <div className="flex items-baseline justify-between">
              <span className="text-[14px]">{metricLabel}</span>
              <span className="text-[13px] text-muted">{value}/100</span>
            </div>
            <div
              className="mt-2 h-[3px] w-full overflow-hidden rounded-full bg-surface-3"
              role="progressbar"
              aria-valuenow={value}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={metricLabel}
            >
              <div
                className={`h-full rounded-full transition-[width] duration-700 ease-out ${barTone(value)}`}
                style={{ width: `${value}%` }}
              />
            </div>
          </li>
        ))}
      </ul>

      <button
        type="button"
        onClick={onViewAnalytics}
        className="mt-6 flex w-full items-center justify-center gap-2 rounded-lg border border-line bg-surface-2 py-3 text-[14px] font-medium transition-colors hover:bg-surface-3"
      >
        View Full Analytics
        <ArrowRight className="size-4" />
      </button>
    </section>
  );
}
