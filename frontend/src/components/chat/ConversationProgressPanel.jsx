import { Compass, Check } from "lucide-react";

export default function ConversationProgressPanel({
  currentStep = 1,
  totalSteps = 4,
  steps = [
    "Business & Product Details",
    "Marketing Goals",
    "Target Audience & Market",
    "Additional Preferences",
  ],
  onSelectStep,
}) {
  const radius = 38;
  const circumference = 2 * Math.PI * radius;
  const progressRatio = Math.min(Math.max(currentStep / totalSteps, 0), 1);
  const strokeDashoffset = circumference * (1 - progressRatio);

  return (
    <div className="rounded-2xl border border-[#172339] bg-[#0a101d]/90 p-4 shadow-lg backdrop-blur-md">
      {/* Title */}
      <div className="flex items-center gap-2 pb-3 text-[13px] font-semibold text-slate-200">
        <Compass className="size-4 text-blue-400" />
        <span>Conversation Progress</span>
      </div>

      <div className="flex items-center gap-4">
        {/* Radial Ring Gauge */}
        <div className="relative size-[92px] shrink-0">
          <svg viewBox="0 0 96 96" className="size-full -rotate-90">
            <circle
              cx="48"
              cy="48"
              r={radius}
              fill="none"
              stroke="#162138"
              strokeWidth="7"
            />
            <circle
              cx="48"
              cy="48"
              r={radius}
              fill="none"
              stroke="#2563eb"
              strokeWidth="7"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              className="transition-[stroke-dashoffset] duration-500 ease-out"
            />
          </svg>

          <div className="absolute inset-0 flex items-center justify-center text-center">
            <span className="text-[20px] font-bold text-white tracking-tight">
              {currentStep}
              <span className="text-[14px] text-slate-400 font-normal">/{totalSteps}</span>
            </span>
          </div>
        </div>

        {/* Steps List */}
        <div className="flex-1 space-y-2 text-[12px]">
          {steps.map((label, idx) => {
            const stepNum = idx + 1;
            const isCompleted = stepNum < currentStep;
            const isCurrent = stepNum === currentStep;

            return (
              <button
                key={label}
                type="button"
                onClick={() => onSelectStep?.(stepNum)}
                disabled={stepNum > currentStep}
                className={`flex w-full items-center gap-2 text-left transition-colors ${
                  isCurrent
                    ? "text-blue-400 font-semibold"
                    : isCompleted
                    ? "text-slate-300 hover:text-white"
                    : "text-slate-500 cursor-not-allowed"
                }`}
              >
                {/* Dot / Indicator */}
                <span
                  className={`grid size-3.5 place-items-center rounded-full text-[9px] ${
                    isCurrent
                      ? "bg-blue-500 ring-4 ring-blue-500/20 text-white"
                      : isCompleted
                      ? "bg-blue-600/80 text-white"
                      : "border border-slate-600 bg-transparent"
                  }`}
                >
                  {isCompleted && <Check className="size-2.5 stroke-[3]" />}
                </span>

                <span className="truncate">{label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
