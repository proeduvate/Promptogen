import { useId } from "react";
import {
  Gauge,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  AlertOctagon,
  Info,
  RefreshCw,
  Sparkles,
  ArrowRight,
} from "lucide-react";
import MissingContextItem from "./MissingContextItem";
import { sortGapsByImportance } from "../../lib/promptReadinessContract";

const STATUS_TONE = {
  needs_more_details: {
    chip: "border-rose-500/30 bg-rose-500/10 text-rose-300",
    bar: "bg-gradient-to-r from-rose-600 to-rose-400",
  },
  partially_ready: {
    chip: "border-amber-500/30 bg-amber-500/10 text-amber-300",
    bar: "bg-gradient-to-r from-amber-500 to-amber-300",
  },
  ready_to_generate: {
    chip: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
    bar: "bg-gradient-to-r from-emerald-600 to-emerald-400",
  },
};

const NEUTRAL_TONE = {
  chip: "border-slate-600/40 bg-slate-800/40 text-slate-300",
  bar: "bg-gradient-to-r from-blue-600 to-sky-400",
};

const WARNING_TONE = {
  info: { icon: Info, className: "border-blue-500/25 bg-blue-500/5 text-blue-200", iconClass: "text-blue-400" },
  warning: {
    icon: AlertTriangle,
    className: "border-amber-500/25 bg-amber-500/5 text-amber-100",
    iconClass: "text-amber-400",
  },
  error: { icon: AlertOctagon, className: "border-rose-500/25 bg-rose-500/5 text-rose-100", iconClass: "text-rose-400" },
};

const SECTION_HEADING = "mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400";

/**
 * Presentational readiness panel. It renders only what the readiness hook provides
 * (backend data) and calls back for actions. It never calls the API or changes answers.
 *
 * @param {{
 *   readiness: ReturnType<typeof import("../../hooks/usePromptReadiness").default>,
 *   contextAdditions?: Array<{gap_id: string, value: string}>,
 *   onAddDetails?: (gap: object) => void,
 *   onGenerate?: () => void,
 *   onGenerateAnyway?: () => void,
 *   onRetry?: () => void,
 *   isGenerating?: boolean,
 *   className?: string,
 * }} props
 */
export default function PromptReadinessPanel({
  readiness,
  contextAdditions = [],
  onAddDetails,
  onGenerate,
  onGenerateAnyway,
  onRetry,
  isGenerating = false,
  className = "",
}) {
  const titleId = useId();
  if (!readiness || readiness.status === "disabled") return null;

  const { status, data, error, isFresh, isUpdating, permission } = readiness;
  const score = data?.readiness;
  const tone = (score?.status && STATUS_TONE[score.status]) || NEUTRAL_TONE;
  const savedByGap = new Map((contextAdditions || []).map((item) => [item.gap_id, item.value]));
  const gaps = sortGapsByImportance(data?.missingContext || []);
  const collected = data?.collectedContext || [];
  const warnings = data?.warnings || [];

  return (
    <section
      aria-labelledby={titleId}
      aria-busy={isUpdating || undefined}
      className={`rounded-2xl border border-[#172339] bg-[#0a101d]/90 p-4 shadow-lg backdrop-blur-md ${className}`}
    >
      <div className="flex items-center justify-between gap-2 pb-3">
        <h2 id={titleId} className="flex items-center gap-2 text-[13px] font-semibold text-slate-200">
          <Gauge className="size-4 text-blue-400" aria-hidden="true" />
          <span>Prompt Readiness</span>
        </h2>
        <span aria-live="polite" className="flex items-center gap-1.5 text-[11px] font-medium text-slate-400">
          {isUpdating && data && (
            <>
              <Loader2 className="size-3 animate-spin" aria-hidden="true" />
              <span>Updating…</span>
            </>
          )}
        </span>
      </div>

      {/* Score */}
      {!data && status === "loading" && (
        <div className="flex items-center gap-2 rounded-xl border border-[#1b2740] bg-[#0c1426] p-3 text-[12.5px] text-slate-400">
          <Loader2 className="size-4 animate-spin text-blue-400" aria-hidden="true" />
          <span>Checking prompt readiness…</span>
        </div>
      )}

      {data && score?.available && (
        <div className={isFresh ? "" : "opacity-60 transition-opacity"}>
          <div className="flex flex-wrap items-end justify-between gap-2">
            <span className="text-[30px] font-bold leading-none tracking-tight text-white tabular-nums">
              {score.percentage}%
            </span>
            <span className={`rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${tone.chip}`}>
              {score.statusLabel || "Status unavailable"}
            </span>
          </div>
          <div
            role="progressbar"
            aria-label="Prompt readiness"
            aria-valuenow={score.percentage}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuetext={`${score.percentage}%${score.statusLabel ? `, ${score.statusLabel}` : ""}`}
            className="mt-2.5 h-2 w-full overflow-hidden rounded-full bg-[#162138]"
          >
            <div className={`h-full rounded-full transition-all duration-500 ${tone.bar}`} style={{ width: `${score.percentage}%` }} />
          </div>
          <p className="mt-1.5 text-[10.5px] text-slate-500">
            Assessed from your prompt and answers. Separate from question progress.
          </p>
        </div>
      )}

      {data && !score?.available && (
        <div className={`rounded-xl border border-[#1b2740] bg-[#0c1426] p-3 ${isFresh ? "" : "opacity-60"}`}>
          <p className="text-[13px] font-semibold text-slate-200">Readiness unavailable</p>
          <p className="mt-0.5 text-[11.5px] text-slate-400">
            The readiness service did not return a score for this conversation.
          </p>
        </div>
      )}

      {/* Error + retry (answers and navigation are untouched) */}
      {status === "error" && (
        <div role="alert" className="mt-3 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-[12px] text-rose-200">
          <p className="font-semibold text-rose-300">Readiness check failed</p>
          <p className="mt-0.5 break-words text-rose-200/90">{error}</p>
          {data && <p className="mt-1 text-[11px] text-rose-200/70">Showing the last confirmed result. It may be out of date.</p>}
          {onRetry && (
            <button
              type="button"
              onClick={onRetry}
              className="mt-2 inline-flex items-center gap-1.5 rounded-lg border border-rose-500/40 bg-rose-500/10 px-2.5 py-1 text-[11.5px] font-semibold text-rose-200 transition-colors hover:bg-rose-500/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500/50"
            >
              <RefreshCw className="size-3" aria-hidden="true" />
              <span>Retry</span>
            </button>
          )}
        </div>
      )}

      {data && (
        <>
          {/* Warnings */}
          {warnings.length > 0 && (
            <ul className="mt-3 space-y-1.5" aria-label="Readiness warnings">
              {warnings.map((warning, index) => {
                const meta = WARNING_TONE[warning.tone] || WARNING_TONE.warning;
                const Icon = meta.icon;
                return (
                  <li
                    key={`${warning.code || "warning"}-${index}`}
                    className={`flex items-start gap-2 rounded-lg border px-2.5 py-2 text-[11.5px] leading-relaxed ${meta.className}`}
                  >
                    <Icon className={`mt-0.5 size-3.5 shrink-0 ${meta.iconClass}`} aria-hidden="true" />
                    <span className="break-words">{warning.message}</span>
                  </li>
                );
              })}
            </ul>
          )}

          {/* Collected context */}
          <div className="mt-4">
            <h3 className={SECTION_HEADING}>Collected context ({collected.length})</h3>
            {collected.length === 0 ? (
              <p className="text-[12px] italic text-slate-500">No collected details reported yet.</p>
            ) : (
              <ul className="max-h-48 space-y-2 overflow-y-auto pr-1 scrollbar-thin">
                {collected.map((item) => (
                  <li key={item.id} className="flex items-start gap-2">
                    <CheckCircle2 className="mt-0.5 size-3.5 shrink-0 text-emerald-400" aria-hidden="true" />
                    <div className="min-w-0">
                      <p className="text-[11px] font-medium text-slate-400">{item.label}</p>
                      <p className="break-words text-[12px] text-slate-200">{item.value}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Missing context */}
          <div className="mt-4">
            <h3 className={SECTION_HEADING}>Missing context ({gaps.length})</h3>
            {gaps.length === 0 ? (
              <p className="flex items-center gap-1.5 text-[12px] text-emerald-300">
                <CheckCircle2 className="size-3.5" aria-hidden="true" />
                <span>No context gaps reported</span>
              </p>
            ) : (
              <ul className="space-y-2">
                {gaps.map((gap) => (
                  <MissingContextItem
                    key={gap.id}
                    gap={gap}
                    savedValue={savedByGap.get(gap.id) || ""}
                    onAddDetails={onAddDetails}
                    disabled={isGenerating}
                  />
                ))}
              </ul>
            )}
          </div>
        </>
      )}

      {/* Generation actions: only from the latest, fresh backend policy */}
      {(data || status === "error") && (
        <div className="mt-4 border-t border-[#172339] pt-3">
          {!isFresh ? (
            <button
              type="button"
              disabled
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-[#1b2740] bg-[#0c1426] px-4 py-2 text-[12.5px] font-semibold text-slate-400"
            >
              {status === "error" ? (
                <span>Generation paused</span>
              ) : (
                <>
                  <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
                  <span>Checking readiness…</span>
                </>
              )}
            </button>
          ) : permission.canGenerate ? (
            <button
              type="button"
              onClick={onGenerate}
              disabled={isGenerating}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#2563eb] px-4 py-2 text-[12.5px] font-semibold text-white shadow-lg shadow-blue-600/30 transition-all hover:bg-blue-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400/60 disabled:opacity-50"
            >
              <Sparkles className="size-3.5" aria-hidden="true" />
              <span>Generate Prompt</span>
            </button>
          ) : permission.canGenerateAnyway ? (
            <div className="space-y-2">
              <p className="flex items-start gap-1.5 text-[11.5px] leading-relaxed text-amber-200">
                <AlertTriangle className="mt-0.5 size-3.5 shrink-0 text-amber-400" aria-hidden="true" />
                <span>Some context is still missing and will be left out of the generated prompt.</span>
              </p>
              <button
                type="button"
                onClick={onGenerateAnyway}
                disabled={isGenerating}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-2 text-[12.5px] font-semibold text-amber-200 transition-colors hover:bg-amber-500/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/60 disabled:opacity-50"
              >
                <span>Generate Anyway</span>
                <ArrowRight className="size-3.5" aria-hidden="true" />
              </button>
            </div>
          ) : (
            <p role="status" className="flex items-start gap-1.5 text-[11.5px] leading-relaxed text-rose-200">
              <AlertOctagon className="mt-0.5 size-3.5 shrink-0 text-rose-400" aria-hidden="true" />
              <span>
                {permission.reason ||
                  (score?.available
                    ? "Add the required details above before generating."
                    : "Generation is paused until readiness is available.")}
              </span>
            </p>
          )}
          {isFresh && (permission.canGenerate || permission.canGenerateAnyway) && permission.reason && (
            <p className="mt-2 text-[11px] text-slate-400">{permission.reason}</p>
          )}
        </div>
      )}
    </section>
  );
}
