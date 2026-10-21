import { useState } from "react";
import { ChevronDown, FlaskConical, TrendingDown, TrendingUp } from "lucide-react";
import { domainLabel } from "../../lib/analysis";
import { ratingFor } from "../../lib/score";
import { CARD, LINK_BUTTON } from "../../lib/ui";

function Ring({ score }) {
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  const { label } = ratingFor(score);
  return (
    <div className="relative size-[104px] shrink-0">
      <svg viewBox="0 0 100 100" className="size-full -rotate-90" aria-hidden>
        <circle cx="50" cy="50" r={radius} fill="none" stroke="var(--c-surface-3)" strokeWidth="9" />
        <circle
          cx="50"
          cy="50"
          r={radius}
          fill="none"
          stroke={score >= 75 ? "var(--color-good)" : score >= 70 ? "var(--color-brand)" : score >= 60 ? "var(--color-amber)" : "var(--color-bad)"}
          strokeWidth="9"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - score / 100)}
          className="transition-[stroke-dashoffset] duration-500 ease-out motion-reduce:transition-none"
        />
      </svg>
      <div className="absolute inset-0 grid place-content-center text-center">
        <span className="text-[30px] font-bold leading-none">{score}</span>
        <span className="mt-0.5 text-[11px] text-muted">/100</span>
      </div>
      <span className="sr-only">
        Prompt quality {score} out of 100, {label}
      </span>
    </div>
  );
}

/* Explainable quality (spec §6): an overall score, eight dimensions that
   open to say why, and the separate Tested Performance score (spec §15). */
export default function QualityCard({ quality, baseline, baselineName, tested, onTest }) {
  const [open, setOpen] = useState(null);
  const rating = ratingFor(quality.overall);
  const delta = baseline == null ? 0 : quality.overall - baseline;

  return (
    <section aria-labelledby="pg-quality-title" className={`${CARD} p-5`}>
      <h2 id="pg-quality-title" className="text-[17px] font-semibold">
        Prompt Quality
      </h2>
      <div className="mt-4 flex items-center gap-4">
        <Ring score={quality.overall} />
        <div className="min-w-0">
          <p className={`text-[16px] font-semibold ${rating.tone}`}>{rating.label}</p>
          {delta !== 0 && (
            <p className={`mt-0.5 flex items-center gap-1 text-[12px] font-medium ${delta > 0 ? "text-good" : "text-bad"}`}>
              {delta > 0 ? <TrendingUp className="size-3.5" /> : <TrendingDown className="size-3.5" />}
              {delta > 0 ? "+" : ""}
              {delta} since {baselineName}
            </p>
          )}
          <p className="mt-1 text-[12px] leading-4 text-muted">How well the prompt is built. Select a dimension to see why.</p>
        </div>
      </div>

      <div className="mt-4 rounded-lg border border-line bg-surface-2 px-3 py-2.5">
        <div className="flex items-center justify-between gap-2 text-[13px]">
          <span className="flex items-center gap-1.5 font-medium">
            <FlaskConical className="size-4 text-good" strokeWidth={1.75} />
            Tested Performance
          </span>
          {tested ? (
            <span className={`font-semibold ${ratingFor(tested.score).tone}`}>{tested.score}/100</span>
          ) : (
            <button type="button" onClick={onTest} className={LINK_BUTTON}>
              Test prompt
            </button>
          )}
        </div>
        <p className="mt-1 text-[11px] leading-4 text-faint">
          {tested
            ? `${tested.passed}/${tested.total} criteria passed on ${tested.model} (${tested.version}).`
            : "Not tested yet. Measured against your own success criteria, separately from quality."}
        </p>
      </div>

      <ul className="mt-3 space-y-0.5">
        {quality.dimensions.map((dimension) => {
          const isOpen = open === dimension.id;
          const tone = ratingFor(dimension.score);
          return (
            <li key={dimension.id}>
              <button
                type="button"
                aria-expanded={isOpen}
                aria-controls={`pg-dim-${dimension.id}`}
                onClick={() => setOpen(isOpen ? null : dimension.id)}
                className="w-full rounded-lg px-2 py-2 text-left transition-colors hover:bg-surface-2"
              >
                <span className="flex items-center justify-between gap-2 text-[13px]">
                  <span>{dimension.label}</span>
                  <span className="flex items-center gap-1 font-medium">
                    {dimension.score}
                    <ChevronDown className={`size-3.5 text-faint transition-transform ${isOpen ? "rotate-180" : ""}`} />
                  </span>
                </span>
                <span aria-hidden className="mt-1.5 block h-1.5 overflow-hidden rounded-full bg-surface-3">
                  <span className={`block h-full rounded-full ${tone.bar} transition-[width] duration-500`} style={{ width: `${dimension.score}%` }} />
                </span>
              </button>
              {isOpen && (
                <div id={`pg-dim-${dimension.id}`} className="mx-2 mb-2 mt-1 rounded-lg border border-line bg-surface-2 p-3 text-[12px] leading-5">
                  <p className="font-semibold tracking-wide">
                    {dimension.label.toUpperCase()}: {dimension.score}/100
                  </p>
                  <p className="mt-1 text-muted">{dimension.summary}</p>
                  {dimension.missing.length > 0 && (
                    <>
                      <p className="mt-2 font-medium">Missing:</p>
                      <ul className="mt-0.5 space-y-0.5 text-muted">
                        {dimension.missing.map((item) => (
                          <li key={item} className="flex gap-1.5">
                            <span aria-hidden>–</span>
                            {item}
                          </li>
                        ))}
                      </ul>
                    </>
                  )}
                  {dimension.found.length > 0 && (
                    <>
                      <p className="mt-2 font-medium">Already covered:</p>
                      <p className="text-muted">{dimension.found.join(", ")}</p>
                    </>
                  )}
                  {dimension.note && <p className="mt-2 text-muted">{dimension.note}</p>}
                  <p className="mt-2 text-faint">Checks: {dimension.asks}</p>
                </div>
              )}
            </li>
          );
        })}
      </ul>
      <p className="mt-3 text-[11px] leading-4 text-faint">
        Weighted for {domainLabel(quality.domain)} prompts. This rates how the prompt is constructed, not whether an AI's answer will be correct.
      </p>
    </section>
  );
}
