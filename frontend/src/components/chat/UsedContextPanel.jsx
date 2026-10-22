import { Bookmark, HelpCircle, CheckCircle2, ArrowRight } from "lucide-react";

export default function UsedContextPanel({
  answers = {},
  questions = [],
  taskIntent = "",
  onViewAllAnswers,
}) {
  let contextItems = [];

  if (Array.isArray(questions) && questions.length > 0) {
    contextItems = questions
      .map((q) => {
        const val = answers[q.id] ?? answers[`q_${q.id}`];
        const otherVal = answers[`${q.id}_other`];
        let displayVal = "";
        if (otherVal) {
          displayVal = String(otherVal);
        } else if (Array.isArray(val)) {
          displayVal = val.join(", ");
        } else if (typeof val === "object" && val !== null) {
          displayVal = Object.entries(val)
            .map(([k, v]) => `${k}: ${v}`)
            .join(", ");
        } else if (val) {
          displayVal = String(val);
        }
        return {
          label: q.question,
          value: displayVal,
          icon: CheckCircle2,
        };
      })
      .filter((item) => Boolean(item.value));
  }

  // Fallback to direct answers keys if questions array is empty
  if (contextItems.length === 0 && Object.keys(answers).length > 0) {
    contextItems = Object.entries(answers)
      .filter(([k]) => !k.endsWith("_other"))
      .map(([k, v]) => ({
        label: k.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
        value: Array.isArray(v) ? v.join(", ") : String(v),
        icon: Bookmark,
      }));
  }

  return (
    <div className="rounded-2xl border border-[#172339] bg-[#0a101d]/90 p-4 shadow-lg backdrop-blur-md">
      <div className="flex items-center gap-2 pb-3 text-[13px] font-semibold text-slate-200">
        <Bookmark className="size-4 text-blue-400" />
        <span>Used Context ({contextItems.length})</span>
      </div>

      {taskIntent && (
        <div className="mb-3 rounded-lg border border-blue-500/20 bg-blue-500/5 p-2.5 text-[11.5px] text-blue-200">
          <span className="font-semibold text-blue-300">Goal: </span>
          {taskIntent}
        </div>
      )}

      {contextItems.length === 0 ? (
        <div className="py-2 text-[12px] text-slate-400 italic">
          No explicit clarification parameters used.
        </div>
      ) : (
        <div className="max-h-72 overflow-y-auto space-y-3 pr-1 text-[12px] scrollbar-thin">
          {contextItems.map(({ label, value, icon: Icon }, idx) => (
            <div key={idx} className="flex items-start gap-2.5">
              <span className="grid size-5 shrink-0 place-items-center rounded-md bg-[#162138] text-blue-400 mt-0.5">
                <Icon className="size-3" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="line-clamp-1 text-[11px] font-medium text-slate-400" title={label}>
                  {label}
                </div>
                <div className="line-clamp-2 text-[12px] font-medium text-slate-200" title={value}>
                  {value}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {onViewAllAnswers && contextItems.length > 3 && (
        <button
          type="button"
          onClick={onViewAllAnswers}
          className="mt-4 flex w-full items-center justify-center gap-1.5 rounded-xl border border-[#1b2740] bg-[#0c1426] py-2 text-[12px] font-medium text-blue-400 transition-colors hover:border-blue-500/40 hover:bg-[#121c34] hover:text-blue-300"
        >
          <span>View All Answers</span>
          <ArrowRight className="size-3.5" />
        </button>
      )}
    </div>
  );
}
