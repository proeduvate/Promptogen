import { forwardRef, useEffect, useId, useState } from "react";
import { ShieldCheck, Loader2, RefreshCw, Wand2, Lightbulb, Info } from "lucide-react";
import QualityDimensionItem, { LEVEL_META, IMPACT_META } from "./QualityDimensionItem";

function formatAssessedAt(iso) {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleString([], { dateStyle: "medium", timeStyle: "short" });
}

/**
 * Explainable Prompt Strength (quality) breakdown for one prompt version.
 *
 * Presentational: renders the normalized backend assessment it is given and calls back for
 * actions. It never computes a score or a classification.
 *
 * @param {{
 *   assessment: import("../../lib/promptQualityContract").QualityAssessment | null,
 *   status?: "ready"|"loading"|"error",
 *   error?: string|null,
 *   versionLabel?: string|null,
 *   isLatestVersion?: boolean,
 *   onReassess?: () => void,
 *   onImprove?: () => void,
 *   onShowLatest?: () => void,
 *   disabled?: boolean,
 * }} props
 */
const PromptQualityPanel = forwardRef(function PromptQualityPanel(
  {
    assessment,
    status = "ready",
    error = null,
    versionLabel = null,
    isLatestVersion = true,
    onReassess,
    onImprove,
    onShowLatest,
    disabled = false,
  },
  ref
) {
  const titleId = useId();
  const [expanded, setExpanded] = useState(() => new Set());

  // Collapse everything when a different assessment is shown.
  const assessmentKey = assessment
    ? `${assessment.assessmentId || ""}|${assessment.assessedAt || ""}|${assessment.overallScore}|${versionLabel || ""}`
    : "none";
  useEffect(() => {
    setExpanded(new Set());
  }, [assessmentKey]);

  const available = Boolean(assessment?.available);
  const dimensions = assessment?.dimensions || [];
  const allExpanded = dimensions.length > 0 && dimensions.every((d) => expanded.has(d.id));
  const assessedAt = formatAssessedAt(assessment?.assessedAt);
  const versionText =
    versionLabel ||
    (assessment?.promptVersion !== null && assessment?.promptVersion !== undefined
      ? `Version ${assessment.promptVersion}`
      : null);
  const hasRecommendations =
    (assessment?.generalSuggestions?.length || 0) > 0 || dimensions.some((d) => d.recommendations.length > 0);

  const toggle = (id) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <section
      ref={ref}
      tabIndex={-1}
      aria-labelledby={titleId}
      aria-busy={status === "loading" || undefined}
      className="rounded-2xl border border-[#172339] bg-[#0a101d]/90 p-4 shadow-lg outline-none backdrop-blur-md focus-visible:ring-2 focus-visible:ring-blue-500/40"
    >
      <div className="flex items-start justify-between gap-2 pb-3">
        <div>
          <h2 id={titleId} className="flex items-center gap-2 text-[13px] font-semibold text-slate-200">
            <ShieldCheck className="size-4 text-emerald-400" aria-hidden="true" />
            <span>Prompt Strength</span>
          </h2>
          <p className="mt-0.5 text-[11px] text-slate-500">Quality breakdown</p>
        </div>
        {versionText && (
          <span className="max-w-[55%] truncate rounded-full border border-blue-500/30 bg-blue-500/10 px-2 py-0.5 text-[10.5px] font-semibold text-blue-300">
            {versionText}
          </span>
        )}
      </div>

      {!isLatestVersion && onShowLatest && (
        <button
          type="button"
          onClick={onShowLatest}
          className="mb-3 w-full rounded-lg border border-[#1b2740] bg-[#0c1426] px-2.5 py-1.5 text-left text-[11.5px] text-slate-300 hover:border-blue-500/40 hover:text-white"
        >
          Showing an earlier version. <span className="font-semibold text-blue-300">Show latest</span>
        </button>
      )}

      {status === "loading" && (
        <div className="flex items-center gap-2 rounded-xl border border-[#1b2740] bg-[#0c1426] p-3 text-[12.5px] text-slate-400">
          <Loader2 className="size-4 animate-spin text-blue-400" aria-hidden="true" />
          <span>Assessing prompt quality…</span>
        </div>
      )}

      {status === "error" && (
        <div role="alert" className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-[12px] text-rose-200">
          <p className="font-semibold text-rose-300">Quality assessment failed</p>
          {error && <p className="mt-0.5 break-words text-rose-200/90">{error}</p>}
          {available && <p className="mt-1 text-[11px] text-rose-200/70">Showing the previous assessment below.</p>}
          {onReassess && (
            <button
              type="button"
              onClick={onReassess}
              disabled={disabled}
              className="mt-2 inline-flex items-center gap-1.5 rounded-lg border border-rose-500/40 bg-rose-500/10 px-2.5 py-1 text-[11.5px] font-semibold text-rose-200 hover:bg-rose-500/20 disabled:opacity-50"
            >
              <RefreshCw className="size-3" aria-hidden="true" />
              <span>Retry</span>
            </button>
          )}
        </div>
      )}

      {status !== "loading" && !available && (
        <div className="rounded-xl border border-[#1b2740] bg-[#0c1426] p-3">
          <p className="text-[13px] font-semibold text-slate-200">Quality assessment unavailable</p>
          <p className="mt-0.5 text-[11.5px] text-slate-400">
            No quality scores were returned for this version.
          </p>
        </div>
      )}

      {status !== "loading" && available && (
        <>
          {/* Overall score */}
          <div className="flex flex-wrap items-end justify-between gap-2">
            <span className="text-[30px] font-bold leading-none tracking-tight text-white tabular-nums">
              {assessment.overallScore !== null ? assessment.overallScore : "—"}
              {assessment.overallScore !== null && (
                <span className="text-[14px] font-medium text-slate-500">/100</span>
              )}
            </span>
            {assessment.classificationLabel ? (
              <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-300">
                {assessment.classificationLabel}
              </span>
            ) : (
              <span className="text-[11px] text-slate-500">Classification not provided</span>
            )}
          </div>
          {assessment.overallScore !== null && (
            <div
              role="meter"
              aria-label="Prompt strength score"
              aria-valuenow={assessment.overallScore}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuetext={`${assessment.overallScore} out of 100${
                assessment.classificationLabel ? `, ${assessment.classificationLabel}` : ""
              }`}
              className="mt-2.5 h-2 w-full overflow-hidden rounded-full bg-[#162138]"
            >
              <div
                className="h-full rounded-full bg-gradient-to-r from-emerald-600 to-emerald-400"
                style={{ width: `${assessment.overallScore}%` }}
              />
            </div>
          )}
          <p className="mt-1.5 flex items-start gap-1 text-[10.5px] leading-snug text-slate-500">
            <Info className="mt-px size-3 shrink-0" aria-hidden="true" />
            <span>Rates how well the prompt is constructed. It is not a tested-performance score.</span>
          </p>

          {(assessedAt || versionText) && (
            <dl className="mt-2.5 grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 text-[11px]">
              {assessedAt && (
                <>
                  <dt className="text-slate-500">Assessed</dt>
                  <dd className="text-slate-300">{assessedAt}</dd>
                </>
              )}
              {versionText && (
                <>
                  <dt className="text-slate-500">Prompt version</dt>
                  <dd className="truncate text-slate-300">{versionText}</dd>
                </>
              )}
            </dl>
          )}

          {assessment.summary && (
            <p className="mt-3 break-words text-[12px] leading-relaxed text-slate-300">{assessment.summary}</p>
          )}

          {/* Dimensions */}
          <div className="mt-4">
            <div className="mb-2 flex items-center justify-between gap-2">
              <h3 className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                Quality dimensions ({dimensions.length})
              </h3>
              {dimensions.length > 0 && (
                <button
                  type="button"
                  onClick={() => setExpanded(allExpanded ? new Set() : new Set(dimensions.map((d) => d.id)))}
                  className="text-[11px] font-medium text-blue-300 hover:text-blue-200"
                >
                  {allExpanded ? "Collapse all" : "Expand all"}
                </button>
              )}
            </div>

            <div className="mb-2 flex flex-wrap gap-x-3 gap-y-1 text-[10.5px]" aria-hidden="true">
              {Object.values(LEVEL_META).map((meta) => {
                const Icon = meta.icon;
                return (
                  <span key={meta.label} className={`flex items-center gap-1 ${meta.text}`}>
                    <Icon className={`size-3 ${meta.iconClass}`} />
                    {meta.label}
                  </span>
                );
              })}
            </div>

            {dimensions.length > 0 ? (
              <ul className="space-y-2">
                {dimensions.map((dimension) => (
                  <QualityDimensionItem
                    key={dimension.id}
                    dimension={dimension}
                    expanded={expanded.has(dimension.id)}
                    onToggle={() => toggle(dimension.id)}
                  />
                ))}
              </ul>
            ) : (
              <p className="text-[12px] italic text-slate-500">No dimension scores were returned.</p>
            )}

            {assessment.notAssessed.length > 0 && (
              <p className="mt-2 text-[11px] leading-relaxed text-slate-500">
                <span className="font-semibold text-slate-400">Not assessed: </span>
                {assessment.notAssessed.map((d) => d.name).join(", ")}
              </p>
            )}
            {assessment.source === "legacy" && (
              <p className="mt-1 text-[11px] leading-relaxed text-slate-500">
                This assessment includes scores only. Explanations were not provided.
              </p>
            )}
          </div>

          {/* Suggestions not linked to a single dimension */}
          {assessment.generalSuggestions.length > 0 && (
            <div className="mt-4">
              <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                Improvement suggestions
              </h3>
              <ul className="space-y-1.5">
                {assessment.generalSuggestions.map((rec) => (
                  <li key={rec.id} className="flex items-start gap-2 text-[12px] leading-relaxed text-slate-200">
                    <Lightbulb className="mt-0.5 size-3.5 shrink-0 text-blue-400" aria-hidden="true" />
                    <span className="min-w-0 flex-1 break-words">{rec.text}</span>
                    {rec.impact && (
                      <span
                        className={`shrink-0 rounded-md border px-1.5 py-0.5 text-[9.5px] font-bold uppercase ${IMPACT_META[rec.impact]}`}
                      >
                        {rec.impact}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}

      {/* Actions */}
      {(onImprove || onReassess) && status !== "loading" && (
        <div className="mt-4 flex flex-col gap-2 border-t border-[#172339] pt-3">
          {onImprove && available && (
            <button
              type="button"
              onClick={onImprove}
              disabled={disabled}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#2563eb] px-4 py-2 text-[12.5px] font-semibold text-white shadow-lg shadow-blue-600/30 transition-all hover:bg-blue-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400/60 disabled:opacity-50"
            >
              <Wand2 className="size-3.5" aria-hidden="true" />
              <span>{hasRecommendations ? "Improve with suggestions" : "Improve prompt"}</span>
            </button>
          )}
          {onReassess && status !== "error" && (
            <button
              type="button"
              onClick={onReassess}
              disabled={disabled}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-[#1b2740] bg-[#0c1426] px-4 py-2 text-[12px] font-medium text-slate-300 transition-colors hover:border-slate-600 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50 disabled:opacity-50"
            >
              <RefreshCw className="size-3.5" aria-hidden="true" />
              <span>{available ? "Reassess" : "Assess prompt"}</span>
            </button>
          )}
        </div>
      )}
    </section>
  );
});

export default PromptQualityPanel;
