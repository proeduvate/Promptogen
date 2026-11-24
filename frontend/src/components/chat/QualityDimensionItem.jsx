import { useId } from "react";
import { CheckCircle2, AlertTriangle, AlertOctagon, HelpCircle, ChevronDown, Lightbulb } from "lucide-react";

export const LEVEL_META = {
  strong: {
    label: "Strong",
    icon: CheckCircle2,
    text: "text-emerald-300",
    iconClass: "text-emerald-400",
    bar: "bg-emerald-500",
  },
  moderate: {
    label: "Moderate",
    icon: AlertTriangle,
    text: "text-amber-300",
    iconClass: "text-amber-400",
    bar: "bg-amber-400",
  },
  weak: {
    label: "Weak",
    icon: AlertOctagon,
    text: "text-rose-300",
    iconClass: "text-rose-400",
    bar: "bg-rose-500",
  },
};

const UNKNOWN_LEVEL = {
  label: "Score unavailable",
  icon: HelpCircle,
  text: "text-slate-400",
  iconClass: "text-slate-500",
  bar: "bg-slate-600",
};

export const IMPACT_META = {
  high: "border-rose-500/30 bg-rose-500/10 text-rose-300",
  medium: "border-amber-500/30 bg-amber-500/10 text-amber-300",
  low: "border-slate-600/40 bg-slate-800/40 text-slate-300",
};

function DetailList({ title, items, tone }) {
  if (!items.length) return null;
  return (
    <div>
      <p className={`mb-1 text-[10.5px] font-semibold uppercase tracking-wide ${tone}`}>{title}</p>
      <ul className="space-y-1 pl-4 text-[12px] leading-relaxed text-slate-300 marker:text-slate-500 list-disc">
        {items.map((item, i) => (
          <li key={`${title}-${i}`} className="break-words">
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * One expandable quality dimension. Everything shown comes from the backend assessment.
 * @param {{
 *   dimension: import("../../lib/promptQualityContract").QualityDimension,
 *   expanded: boolean,
 *   onToggle: () => void,
 * }} props
 */
export default function QualityDimensionItem({ dimension, expanded, onToggle }) {
  const detailsId = useId();
  const meta = (dimension.level && LEVEL_META[dimension.level]) || UNKNOWN_LEVEL;
  const Icon = meta.icon;
  const hasDetails =
    Boolean(dimension.explanation) ||
    dimension.weaknesses.length > 0 ||
    dimension.missingInformation.length > 0 ||
    dimension.recommendations.length > 0;

  return (
    <li className="rounded-xl border border-[#17233a] bg-[#090e1a]/70" data-dimension-id={dimension.id}>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={expanded}
        aria-controls={detailsId}
        className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-white/[0.02] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50"
      >
        <Icon className={`size-4 shrink-0 ${meta.iconClass}`} aria-hidden="true" />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[12.5px] font-semibold text-slate-100">{dimension.name}</span>
          <span className={`block text-[10.5px] font-medium ${meta.text}`}>{meta.label}</span>
        </span>
        <span className="text-[14px] font-bold tabular-nums text-white">
          {dimension.score !== null ? dimension.score : "—"}
          {dimension.score !== null && <span className="text-[10.5px] font-medium text-slate-500">/100</span>}
        </span>
        <ChevronDown
          className={`size-4 shrink-0 text-slate-500 transition-transform ${expanded ? "rotate-180" : ""}`}
          aria-hidden="true"
        />
      </button>

      {dimension.score !== null && (
        <div className="mx-3 mb-2.5 h-1 overflow-hidden rounded-full bg-[#162138]" aria-hidden="true">
          <div className={`h-full rounded-full ${meta.bar}`} style={{ width: `${dimension.score}%` }} />
        </div>
      )}

      <div
        id={detailsId}
        role="region"
        aria-label={`${dimension.name} details`}
        hidden={!expanded}
        className="space-y-3 border-t border-[#172339] px-3 py-3"
      >
        {dimension.explanation ? (
          <p className="break-words text-[12px] leading-relaxed text-slate-300">{dimension.explanation}</p>
        ) : (
          !hasDetails && (
            <p className="text-[11.5px] italic text-slate-500">
              The assessment did not include an explanation for this dimension.
            </p>
          )
        )}

        <DetailList title="Weaknesses" items={dimension.weaknesses} tone="text-amber-300/90" />
        <DetailList title="Missing information" items={dimension.missingInformation} tone="text-rose-300/90" />

        {dimension.recommendations.length > 0 && (
          <div>
            <p className="mb-1 text-[10.5px] font-semibold uppercase tracking-wide text-blue-300/90">
              Recommendations
            </p>
            <ul className="space-y-1.5">
              {dimension.recommendations.map((rec) => (
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
      </div>
    </li>
  );
}
