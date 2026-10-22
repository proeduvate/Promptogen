import { Info, ArrowRight } from "lucide-react";

export default function PromptStrengthOverview({
  score = null,
  label = null,
  metrics = null,
  note = null,
  onViewAnalytics,
}) {
  const isNull = score == null;

  const displayScore = isNull ? null : Math.round(Number(score));
  const displayLabel = isNull
    ? "No Data"
    : label || (displayScore >= 90 ? "Excellent" : displayScore >= 80 ? "Strong" : "Good");

  const displayNote = isNull
    ? "Generate your first prompt to unlock real-time quality scoring and dimension analysis."
    : note || "Quality calculated based on your previous generated prompt.";

  const radius = 64;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = isNull ? circumference : circumference * (1 - (displayScore || 0) / 100);

  const metricList = [
    { key: "clarity", label: "Clarity", value: isNull ? null : (metrics?.clarity ?? displayScore ?? 0) },
    { key: "specificity", label: "Specificity", value: isNull ? null : (metrics?.specificity ?? displayScore ?? 0) },
    { key: "context", label: "Context", value: isNull ? null : (metrics?.context ?? displayScore ?? 0) },
    { key: "structure", label: "Structure", value: isNull ? null : (metrics?.structure ?? displayScore ?? 0) },
    { key: "actionability", label: "Actionability", value: isNull ? null : (metrics?.actionability ?? displayScore ?? 0) },
  ];

  return (
    <div className="w-full rounded-2xl border border-[#172339] bg-[#0a101d]/90 p-5 shadow-xl backdrop-blur-md">
      {/* Title with Info icon */}
      <div className="flex items-center justify-between pb-3">
        <h3 className="text-[15px] font-semibold text-white">
          Prompt Strength Overview
        </h3>
        <button
          type="button"
          title="Scored on clarity, specificity, context, structure and actionability"
          className="text-slate-500 hover:text-slate-300 transition-colors"
        >
          <Info className="size-4" />
        </button>
      </div>

      {/* Radial Circle Gauge */}
      <div className="relative mx-auto my-3 size-[152px]">
        <svg viewBox="0 0 160 160" className="size-full -rotate-90">
          {/* Background circle */}
          <circle
            cx="80"
            cy="80"
            r={radius}
            fill="none"
            stroke="#162138"
            strokeWidth="11"
            strokeDasharray={isNull ? "6 6" : undefined}
          />
          {/* Active progress ring in electric blue */}
          {!isNull && (
            <circle
              cx="80"
              cy="80"
              r={radius}
              fill="none"
              stroke="#2563eb"
              strokeWidth="11"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              className="transition-[stroke-dashoffset] duration-700 ease-out"
            />
          )}
        </svg>

        {/* Center content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          {isNull ? (
            <>
              <div className="text-[34px] font-bold tracking-tight text-slate-500 leading-none">
                --
              </div>
              <div className="text-[11px] text-slate-500 font-medium">/100</div>
              <div className="mt-1 text-[12px] font-medium text-slate-400">
                Awaiting Prompt
              </div>
            </>
          ) : (
            <>
              <div className="text-[38px] font-bold tracking-tight text-white leading-none">
                {displayScore}
              </div>
              <div className="text-[12px] text-slate-400 font-medium">/100</div>
              <div className="mt-1 text-[13px] font-semibold text-slate-200">
                {displayLabel}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Note tag */}
      <p className="text-center text-[12.5px] font-medium text-slate-400 px-2 leading-relaxed">
        {displayNote}
      </p>

      {/* 5 Metrics Progress Bars */}
      <div className="mt-5 space-y-3.5">
        {metricList.map(({ key, label: metricLabel, value }) => (
          <div key={key}>
            <div className="flex items-center justify-between text-[13px]">
              <span className="text-slate-300 font-medium">{metricLabel}</span>
              <span className="text-slate-400 text-[12px]">
                {value !== null ? `${value}/100` : "--/100"}
              </span>
            </div>
            <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-[#162138]">
              {value !== null && (
                <div
                  className="h-full rounded-full bg-blue-500 transition-[width] duration-700 ease-out"
                  style={{ width: `${value}%` }}
                />
              )}
            </div>
          </div>
        ))}
      </div>

      {/* View Full Analytics button */}
      <button
        type="button"
        onClick={onViewAnalytics}
        className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl border border-[#1b2740] bg-[#0c1426] py-2.5 px-4 text-[13px] font-medium text-slate-200 transition-all hover:border-blue-500/50 hover:bg-[#121c33] hover:text-white"
      >
        <span>View Full Analytics</span>
        <ArrowRight className="size-4" />
      </button>
    </div>
  );
}
