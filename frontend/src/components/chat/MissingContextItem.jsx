import { AlertOctagon, Info, CircleDashed, HelpCircle, Plus, Pencil } from "lucide-react";

const IMPORTANCE_META = {
  required: {
    label: "Required",
    icon: AlertOctagon,
    iconClass: "text-rose-400",
    badgeClass: "border-rose-500/30 bg-rose-500/10 text-rose-300",
  },
  recommended: {
    label: "Recommended",
    icon: Info,
    iconClass: "text-blue-400",
    badgeClass: "border-blue-500/30 bg-blue-500/10 text-blue-300",
  },
  optional: {
    label: "Optional",
    icon: CircleDashed,
    iconClass: "text-slate-400",
    badgeClass: "border-slate-600/40 bg-slate-800/40 text-slate-400",
  },
  // Unknown backend levels are shown neutrally and never treated as optional.
  unclassified: {
    label: "Unclassified",
    icon: HelpCircle,
    iconClass: "text-slate-300",
    badgeClass: "border-slate-500/40 bg-slate-700/30 text-slate-300",
  },
};

/**
 * One backend-reported context gap.
 * @param {{
 *   gap: import("../../lib/promptReadinessContract").NormalizedGap,
 *   savedValue?: string,
 *   onAddDetails: (gap: object) => void,
 *   disabled?: boolean,
 * }} props
 */
export default function MissingContextItem({ gap, savedValue = "", onAddDetails, disabled = false }) {
  const meta = IMPORTANCE_META[gap.importance] || IMPORTANCE_META.unclassified;
  const Icon = meta.icon;
  const hasSaved = Boolean(savedValue && savedValue.trim());

  return (
    <li className="rounded-xl border border-[#17233a] bg-[#090e1a]/70 p-3" data-gap-id={gap.id}>
      <div className="flex items-start gap-2.5">
        <Icon className={`mt-0.5 size-4 shrink-0 ${meta.iconClass}`} aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="break-words text-[12.5px] font-semibold text-slate-100">{gap.label}</span>
            <span
              className={`inline-flex items-center rounded-md border px-1.5 py-0.5 text-[10px] font-semibold ${meta.badgeClass}`}
              title={gap.importance === "unclassified" ? `Importance reported as: ${gap.importanceRaw || "not provided"}` : undefined}
            >
              {meta.label}
            </span>
          </div>

          {gap.description && (
            <p className="mt-1 break-words text-[11.5px] leading-relaxed text-slate-400">{gap.description}</p>
          )}

          {hasSaved && (
            <p className="mt-1.5 line-clamp-2 break-words text-[11.5px] text-emerald-300">
              <span className="font-semibold">Added: </span>
              {savedValue}
            </p>
          )}

          <button
            type="button"
            onClick={() => onAddDetails?.(gap)}
            disabled={disabled}
            aria-label={`${hasSaved ? "Edit" : "Add"} details for ${gap.label}`}
            className="mt-2 inline-flex items-center gap-1.5 rounded-lg border border-[#1b2740] bg-[#0c1426] px-2.5 py-1 text-[11.5px] font-medium text-blue-300 transition-colors hover:border-blue-500/40 hover:text-blue-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {hasSaved ? <Pencil className="size-3" aria-hidden="true" /> : <Plus className="size-3" aria-hidden="true" />}
            <span>{hasSaved ? "Edit Details" : "Add Details"}</span>
          </button>
        </div>
      </div>
    </li>
  );
}
