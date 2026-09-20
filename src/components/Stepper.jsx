import { Check } from "lucide-react";

export default function Stepper({ steps, current, onStepClick }) {
  const lastIndex = steps.length - 1;

  return (
    <ol className="flex items-start">
      {steps.map((step, index) => {
        const isDone = index < current;
        const isActive = index === current;
        const reachable = index <= current;

        return (
          <li
            key={step.id}
            className={`flex items-start ${index < lastIndex ? "flex-1" : ""}`}
          >
            <div className="flex w-[96px] shrink-0 flex-col items-center">
              <button
                type="button"
                disabled={!reachable}
                onClick={() => reachable && onStepClick(index)}
                aria-current={isActive ? "step" : undefined}
                className={[
                  "grid size-8 place-items-center rounded-full border text-[13px] font-semibold transition-colors",
                  isActive
                    ? "border-brand bg-brand text-white"
                    : isDone
                      ? "border-brand/50 bg-brand/15 text-brand"
                      : "border-line bg-surface-2 text-faint",
                  reachable ? "cursor-pointer" : "cursor-default",
                ].join(" ")}
              >
                {isDone ? <Check className="size-4" strokeWidth={3} /> : index + 1}
              </button>
              <span
                className={`mt-2 text-[13px] ${isActive ? "font-medium text-text" : "text-muted"}`}
              >
                {step.label}
              </span>
            </div>

            {index < lastIndex && (
              <span
                aria-hidden
                className={`mt-4 h-px flex-1 ${index < current ? "bg-brand/50" : "bg-line"}`}
              />
            )}
          </li>
        );
      })}
    </ol>
  );
}
