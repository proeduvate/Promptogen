import { useState } from "react";
import {
  ArrowRight,
  ArrowLeft,
  Check,
  Plus,
  Calendar,
  Link as LinkIcon,
  UploadCloud,
  FileText,
  X,
  HelpCircle,
  Sparkles,
} from "lucide-react";

/** DOM id for a question container (used by readiness "Add Details" to focus a linked question). */
export function getQuestionDomId(questionKey) {
  return `pg-question-${String(questionKey).replace(/[^A-Za-z0-9_-]/g, "_")}`;
}

export default function DynamicQuestionCard({
  currentStep = 1,
  totalSteps = 1,
  stepTitle = "Adaptive Clarification Questions",
  stepDescription = "Answer the targeted questions below to help the AI craft an optimized, domain-specific prompt:",
  questions = [],
  answers = {},
  onAnswerChange,
  onNextStep,
  onPrevStep,
  onSkipToStep2,
  isLastStep = true,
  isSubmitting = false,
  isSufficient = false,
}) {
  const [otherOpen, setOtherOpen] = useState({});

  const renderBadge = (level) => {
    const l = (level || "recommended").toLowerCase();
    if (l === "required") {
      return (
        <span className="inline-flex items-center rounded-md border border-rose-500/30 bg-rose-500/10 px-2 py-0.5 text-[10.5px] font-semibold text-rose-300">
          Required *
        </span>
      );
    }
    if (l === "recommended") {
      return (
        <span className="inline-flex items-center rounded-md border border-blue-500/30 bg-blue-500/10 px-2 py-0.5 text-[10.5px] font-medium text-blue-300">
          Recommended
        </span>
      );
    }
    return (
      <span className="inline-flex items-center rounded-md border border-slate-600/40 bg-slate-800/40 px-2 py-0.5 text-[10.5px] font-medium text-slate-400">
        Optional
      </span>
    );
  };

  return (
    <div className="w-full rounded-2xl border border-[#172339] bg-[#0c1322]/95 p-6 shadow-xl backdrop-blur-xl">
      {/* Header Info */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-2">
        <div className="flex items-center gap-2">
          <span className="text-[13px] font-bold text-blue-400">
            Step {currentStep} of {totalSteps}
          </span>
          <span className="text-slate-500">•</span>
          <span className="text-[14px] font-semibold text-slate-100">{stepTitle}</span>
        </div>
        <div className="flex items-center gap-2">
          {isSufficient && (
            <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-medium text-emerald-300">
              Sufficient Details Found
            </span>
          )}
          <span className="text-[12px] font-medium text-slate-400">
            {currentStep}/{totalSteps}
          </span>
        </div>
      </div>

      {/* Progress Bar Indicator */}
      <div className="mb-4 h-1.5 w-full overflow-hidden rounded-full bg-[#162138]">
        <div
          className="h-full rounded-full bg-gradient-to-r from-blue-600 to-sky-400 transition-all duration-300"
          style={{ width: `${(currentStep / totalSteps) * 100}%` }}
        />
      </div>

      {/* Step Description */}
      <p className="mb-6 text-[13px] leading-relaxed text-slate-300">
        {stepDescription}
      </p>

      {/* Dynamic Questions List */}
      <div className="space-y-6">
        {questions.map((q, qIndex) => {
          const qKey = q.id || `q_${qIndex}`;
          const currentVal = answers[qKey] ?? "";
          const qType = (q.type || "text").toLowerCase();

          return (
            <div
              key={qKey}
              id={getQuestionDomId(qKey)}
              tabIndex={-1}
              className="rounded-xl border border-[#17233a] bg-[#090e1a]/70 p-4 transition-all outline-none hover:border-[#1e2f4f] focus-within:border-[#1e2f4f]"
            >
              {/* Question Header: Title & Badges */}
              <div className="mb-2.5 flex flex-wrap items-start justify-between gap-2">
                <label className="text-[13.5px] font-semibold text-slate-100 flex-1 leading-snug">
                  <span className="text-blue-400 mr-1.5">{qIndex + 1}.</span>
                  {q.question || q.label}
                </label>
                <div className="flex items-center gap-1.5 shrink-0">
                  {renderBadge(q.level)}
                  {q.category && (
                    <span className="rounded bg-[#131d33] px-2 py-0.5 text-[10px] font-medium text-slate-400 capitalize">
                      {q.category.replace(/_/g, " ")}
                    </span>
                  )}
                </div>
              </div>

              {/* Optional explanation / rationale */}
              {q.explanation && (
                <p className="mb-3 text-[11.5px] leading-relaxed text-slate-400 flex items-center gap-1">
                  <HelpCircle className="size-3 text-slate-500 shrink-0" />
                  <span>{q.explanation}</span>
                </p>
              )}

              {/* ────────────────── Type: Text / Input ────────────────── */}
              {(qType === "text" || qType === "input") && (
                <input
                  type="text"
                  value={currentVal}
                  onChange={(e) => onAnswerChange(qKey, e.target.value)}
                  placeholder={q.placeholder || "Enter details..."}
                  className="w-full rounded-xl border border-[#1a253c] bg-[#0c1426] px-4 py-2.5 text-[13px] text-slate-100 placeholder:text-slate-500 outline-none transition-colors focus:border-blue-500/80 focus:ring-1 focus:ring-blue-500/30"
                />
              )}

              {/* ────────────────── Type: Textarea ────────────────── */}
              {qType === "textarea" && (
                <div className="relative rounded-xl border border-[#1a253c] bg-[#0c1426] focus-within:border-blue-500/80 focus-within:ring-1 focus-within:ring-blue-500/30">
                  <textarea
                    rows={3}
                    maxLength={1000}
                    value={currentVal}
                    onChange={(e) => onAnswerChange(qKey, e.target.value)}
                    placeholder={q.placeholder || "Provide specific details or implementation context..."}
                    className="w-full resize-none bg-transparent px-4 pb-7 pt-3 text-[13px] leading-relaxed text-slate-100 placeholder:text-slate-500 outline-none"
                  />
                  <span className="pointer-events-none absolute bottom-2 right-3 text-[11px] font-medium text-slate-500">
                    {(currentVal || "").length}/1000
                  </span>
                </div>
              )}

              {/* ────────────────── Type: Single Select (Pills) ────────────────── */}
              {(qType === "single_select" || (qType === "options" && q.multiple === false)) && (() => {
                const isCustomActive = Boolean(
                  otherOpen[qKey] ||
                  answers[`${qKey}_other`] ||
                  (currentVal && !(q.options || []).includes(currentVal))
                );

                return (
                  <div className="space-y-2">
                    <div className="flex flex-wrap gap-2">
                      {(q.options || []).map((opt) => {
                        const isSelected = currentVal === opt;
                        return (
                          <button
                            key={opt}
                            type="button"
                            onClick={() => {
                              const nextVal = isSelected ? "" : opt;
                              onAnswerChange({
                                [qKey]: nextVal,
                                [`${qKey}_other`]: "",
                              });
                              setOtherOpen((prev) => ({ ...prev, [qKey]: false }));
                            }}
                            className={`flex items-center gap-2 rounded-xl px-3.5 py-2 text-[12.5px] font-medium transition-all ${
                              isSelected
                                ? "border border-blue-500 bg-blue-500/20 text-white shadow-[0_0_12px_-2px_rgba(59,130,246,0.3)]"
                                : "border border-[#1a253c] bg-[#0c1426] text-slate-300 hover:border-slate-600 hover:text-white"
                            }`}
                          >
                            <span
                              className={`grid size-4 place-items-center rounded-full border ${
                                isSelected
                                  ? "border-blue-400 bg-blue-500 text-white"
                                  : "border-slate-600 bg-transparent"
                              }`}
                            >
                              {isSelected && <span className="size-1.5 rounded-full bg-white" />}
                            </span>
                            <span>{opt}</span>
                          </button>
                        );
                      })}
                    </div>

                    {/* "Other" Option Write-in */}
                    <div className="pt-1">
                      {isCustomActive ? (
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            placeholder="Specify custom response..."
                            value={
                              answers[`${qKey}_other`] ??
                              (currentVal && !(q.options || []).includes(currentVal) ? currentVal : "")
                            }
                            onChange={(e) => {
                              const val = e.target.value;
                              onAnswerChange({
                                [qKey]: val,
                                [`${qKey}_other`]: val,
                              });
                            }}
                            className="rounded-xl border border-blue-500 bg-[#0c1426] px-3.5 py-1.5 text-[12.5px] text-white outline-none flex-1 max-w-sm focus:border-blue-400 focus:ring-1 focus:ring-blue-500/40"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              setOtherOpen((prev) => ({ ...prev, [qKey]: false }));
                              onAnswerChange({
                                [qKey]: "",
                                [`${qKey}_other`]: "",
                              });
                            }}
                            className="text-[12px] text-slate-400 hover:text-white"
                          >
                            Clear
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setOtherOpen((prev) => ({ ...prev, [qKey]: true }))}
                          className="rounded-xl border border-[#1a253c] bg-[#0c1426] px-3 py-1 text-[11.5px] text-slate-400 hover:border-slate-500 hover:text-slate-200"
                        >
                          + Other / Custom
                        </button>
                      )}
                    </div>
                  </div>
                );
              })()}

              {/* ────────────────── Type: Multi Select (Pills) ────────────────── */}
              {(qType === "multi_select" || (qType === "options" && q.multiple !== false)) && (
                <div className="space-y-2">
                  <div className="flex flex-wrap gap-2">
                    {(q.options || []).map((opt) => {
                      const arr = Array.isArray(currentVal)
                        ? currentVal
                        : currentVal
                        ? [currentVal]
                        : [];
                      const isSelected = arr.includes(opt);

                      return (
                        <button
                          key={opt}
                          type="button"
                          onClick={() => {
                            if (isSelected) {
                              onAnswerChange(
                                qKey,
                                arr.filter((x) => x !== opt)
                              );
                            } else {
                              onAnswerChange(qKey, [...arr, opt]);
                            }
                          }}
                          className={`flex items-center gap-2 rounded-xl px-3.5 py-2 text-[12.5px] font-medium transition-all ${
                            isSelected
                              ? "border border-blue-500 bg-blue-500/20 text-white shadow-[0_0_12px_-2px_rgba(59,130,246,0.3)]"
                              : "border border-[#1a253c] bg-[#0c1426] text-slate-300 hover:border-slate-600 hover:text-white"
                          }`}
                        >
                          <span
                            className={`grid size-4 place-items-center rounded border ${
                              isSelected
                                ? "border-blue-400 bg-blue-500 text-white"
                                : "border-slate-600 bg-transparent"
                            }`}
                          >
                            {isSelected ? (
                              <Check className="size-3 stroke-[3]" />
                            ) : (
                              <Plus className="size-3 text-slate-400" />
                            )}
                          </span>
                          <span>{opt}</span>
                        </button>
                      );
                    })}
                  </div>

                  {/* "Other" Option Write-in */}
                  <div className="pt-1">
                    {otherOpen[qKey] ? (
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          placeholder="Add custom option..."
                          value={answers[`${qKey}_other`] || ""}
                          onChange={(e) => {
                            onAnswerChange(`${qKey}_other`, e.target.value);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && answers[`${qKey}_other`]?.trim()) {
                              e.preventDefault();
                              const cur = Array.isArray(currentVal) ? currentVal : [];
                              const customText = answers[`${qKey}_other`].trim();
                              if (!cur.includes(customText)) {
                                onAnswerChange({
                                  [qKey]: [...cur, customText],
                                  [`${qKey}_other`]: "",
                                });
                              }
                            }
                          }}
                          className="rounded-xl border border-blue-500 bg-[#0c1426] px-3.5 py-1.5 text-[12.5px] text-white outline-none flex-1 max-w-sm focus:border-blue-400 focus:ring-1 focus:ring-blue-500/40"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            if (answers[`${qKey}_other`]?.trim()) {
                              const cur = Array.isArray(currentVal) ? currentVal : [];
                              const customText = answers[`${qKey}_other`].trim();
                              if (!cur.includes(customText)) {
                                onAnswerChange({
                                  [qKey]: [...cur, customText],
                                  [`${qKey}_other`]: "",
                                });
                              }
                            }
                            setOtherOpen((prev) => ({ ...prev, [qKey]: false }));
                          }}
                          className="rounded-lg bg-blue-600 px-2.5 py-1 text-[11.5px] text-white hover:bg-blue-500"
                        >
                          Add
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setOtherOpen((prev) => ({ ...prev, [qKey]: true }))}
                        className="rounded-xl border border-[#1a253c] bg-[#0c1426] px-3 py-1 text-[11.5px] text-slate-400 hover:border-slate-500 hover:text-slate-200"
                      >
                        + Add Custom Option
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* ────────────────── Type: Dropdown ────────────────── */}
              {qType === "dropdown" && (
                <div className="relative max-w-md">
                  <select
                    value={currentVal}
                    onChange={(e) => onAnswerChange(qKey, e.target.value)}
                    className="w-full appearance-none rounded-xl border border-[#1a253c] bg-[#0c1426] px-4 py-2.5 pr-10 text-[13px] text-slate-100 outline-none transition-colors focus:border-blue-500/80 focus:ring-1 focus:ring-blue-500/30"
                  >
                    <option value="" disabled className="bg-[#0c1322] text-slate-500">
                      Select an option...
                    </option>
                    {(q.options || []).map((opt) => (
                      <option key={opt} value={opt} className="bg-[#0c1322] text-slate-200">
                        {opt}
                      </option>
                    ))}
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-400">
                    ▼
                  </div>
                </div>
              )}

              {/* ────────────────── Type: Yes / No ────────────────── */}
              {qType === "yes_no" && (
                <div className="inline-flex rounded-xl border border-[#1a253c] bg-[#0c1426] p-1">
                  <button
                    type="button"
                    onClick={() => onAnswerChange(qKey, "Yes")}
                    className={`flex items-center gap-2 rounded-lg px-5 py-2 text-[13px] font-semibold transition-all ${
                      currentVal === "Yes"
                        ? "bg-emerald-600 text-white shadow-md shadow-emerald-700/30"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    <Check className="size-3.5 stroke-[3]" />
                    <span>Yes</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onAnswerChange(qKey, "No")}
                    className={`flex items-center gap-2 rounded-lg px-5 py-2 text-[13px] font-semibold transition-all ${
                      currentVal === "No"
                        ? "bg-rose-600 text-white shadow-md shadow-rose-700/30"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    <X className="size-3.5 stroke-[3]" />
                    <span>No</span>
                  </button>
                </div>
              )}

              {/* ────────────────── Type: Date ────────────────── */}
              {qType === "date" && (
                <div className="relative max-w-xs">
                  <input
                    type="date"
                    value={currentVal}
                    onChange={(e) => onAnswerChange(qKey, e.target.value)}
                    className="w-full rounded-xl border border-[#1a253c] bg-[#0c1426] px-4 py-2.5 text-[13px] text-slate-100 outline-none transition-colors focus:border-blue-500/80 [color-scheme:dark]"
                  />
                </div>
              )}

              {/* ────────────────── Type: Date Range ────────────────── */}
              {qType === "date_range" && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-md">
                  <div>
                    <span className="block text-[11px] font-medium text-slate-400 mb-1">
                      Start Date
                    </span>
                    <input
                      type="date"
                      value={typeof currentVal === "object" ? currentVal?.start || "" : ""}
                      onChange={(e) => {
                        const cur = typeof currentVal === "object" ? currentVal : {};
                        onAnswerChange(qKey, { ...cur, start: e.target.value });
                      }}
                      className="w-full rounded-xl border border-[#1a253c] bg-[#0c1426] px-3.5 py-2 text-[12.5px] text-slate-100 outline-none focus:border-blue-500/80 [color-scheme:dark]"
                    />
                  </div>
                  <div>
                    <span className="block text-[11px] font-medium text-slate-400 mb-1">
                      End Date
                    </span>
                    <input
                      type="date"
                      value={typeof currentVal === "object" ? currentVal?.end || "" : ""}
                      onChange={(e) => {
                        const cur = typeof currentVal === "object" ? currentVal : {};
                        onAnswerChange(qKey, { ...cur, end: e.target.value });
                      }}
                      className="w-full rounded-xl border border-[#1a253c] bg-[#0c1426] px-3.5 py-2 text-[12.5px] text-slate-100 outline-none focus:border-blue-500/80 [color-scheme:dark]"
                    />
                  </div>
                </div>
              )}

              {/* ────────────────── Type: Number ────────────────── */}
              {qType === "number" && (
                <div className="flex items-center gap-2 max-w-xs">
                  <input
                    type="number"
                    min={q.min ?? undefined}
                    max={q.max ?? undefined}
                    step={q.step ?? "any"}
                    value={currentVal}
                    onChange={(e) => onAnswerChange(qKey, e.target.value)}
                    placeholder={q.placeholder || "0"}
                    className="w-full rounded-xl border border-[#1a253c] bg-[#0c1426] px-4 py-2.5 text-[13px] text-slate-100 outline-none transition-colors focus:border-blue-500/80 focus:ring-1 focus:ring-blue-500/30"
                  />
                  {q.unit && (
                    <span className="rounded-xl border border-[#1b2740] bg-[#121c33] px-3 py-2 text-[12px] font-semibold text-slate-300">
                      {q.unit}
                    </span>
                  )}
                </div>
              )}

              {/* ────────────────── Type: Slider ────────────────── */}
              {qType === "slider" && (
                <div className="space-y-2 max-w-md pt-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-slate-400">
                      Min: {q.min ?? 0} {q.unit || ""}
                    </span>
                    <span className="rounded-lg bg-blue-600/20 px-2.5 py-0.5 text-[12px] font-bold text-blue-300">
                      {currentVal || q.min || 0} {q.unit || ""}
                    </span>
                    <span className="text-[11px] text-slate-400">
                      Max: {q.max ?? 100} {q.unit || ""}
                    </span>
                  </div>
                  <input
                    type="range"
                    min={q.min ?? 0}
                    max={q.max ?? 100}
                    step={q.step ?? 1}
                    value={currentVal || q.min || 0}
                    onChange={(e) => onAnswerChange(qKey, e.target.value)}
                    className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-[#192640] accent-blue-500"
                  />
                </div>
              )}

              {/* ────────────────── Type: URL ────────────────── */}
              {qType === "url" && (
                <div className="relative max-w-lg">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                    <LinkIcon className="size-4" />
                  </div>
                  <input
                    type="url"
                    value={currentVal}
                    onChange={(e) => onAnswerChange(qKey, e.target.value)}
                    placeholder={q.placeholder || "https://github.com/org/repo or https://example.com"}
                    className="w-full rounded-xl border border-[#1a253c] bg-[#0c1426] py-2.5 pl-10 pr-4 text-[13px] text-slate-100 placeholder:text-slate-500 outline-none transition-colors focus:border-blue-500/80 focus:ring-1 focus:ring-blue-500/30"
                  />
                </div>
              )}

              {/* ────────────────── Type: File Upload ────────────────── */}
              {qType === "file_upload" && (
                <div className="max-w-md">
                  {currentVal ? (
                    <div className="flex items-center justify-between rounded-xl border border-blue-500/40 bg-blue-500/10 p-3">
                      <div className="flex items-center gap-2 truncate pr-2">
                        <FileText className="size-4 text-blue-400 shrink-0" />
                        <span className="text-[12.5px] font-medium text-slate-200 truncate">
                          {typeof currentVal === "string" ? currentVal : currentVal?.name || "Uploaded File"}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => onAnswerChange(qKey, "")}
                        className="rounded p-1 text-slate-400 hover:text-rose-400 transition-colors"
                      >
                        <X className="size-4" />
                      </button>
                    </div>
                  ) : (
                    <label className="flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-[#233558] bg-[#0c1426] p-4 text-center transition-colors hover:border-blue-500/60 hover:bg-[#101b33]">
                      <UploadCloud className="size-6 text-slate-400 mb-1" />
                      <span className="text-[12.5px] font-medium text-slate-200">
                        Attach document, log, or code sample
                      </span>
                      <span className="text-[11px] text-slate-500 mt-0.5">
                        PDF, TXT, JSON, CSV, MD up to 10MB
                      </span>
                      <input
                        type="file"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            onAnswerChange(qKey, file.name);
                          }
                        }}
                      />
                    </label>
                  )}
                </div>
              )}

              {/* ────────────────── Fallback: Custom / Unrecognized ────────────────── */}
              {!["text", "input", "textarea", "single_select", "multi_select", "options", "dropdown", "yes_no", "date", "date_range", "number", "slider", "url", "file_upload"].includes(qType) && (
                <input
                  type="text"
                  value={currentVal}
                  onChange={(e) => onAnswerChange(qKey, e.target.value)}
                  placeholder={q.placeholder || "Enter details..."}
                  className="w-full rounded-xl border border-[#1a253c] bg-[#0c1426] px-4 py-2.5 text-[13px] text-slate-100 placeholder:text-slate-500 outline-none transition-colors focus:border-blue-500/80"
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Card Action Footer */}
      <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-[#172339] pt-4">
        {currentStep > 1 ? (
          <button
            type="button"
            onClick={onPrevStep}
            className="flex items-center gap-2 rounded-xl border border-[#1b2740] bg-[#0c1426] px-4 py-2.5 text-[13px] font-medium text-slate-300 transition-colors hover:bg-[#121c33] hover:text-white"
          >
            <ArrowLeft className="size-4" />
            <span>Previous</span>
          </button>
        ) : isSufficient && onSkipToStep2 ? (
          <button
            type="button"
            onClick={onSkipToStep2}
            className="flex items-center gap-1.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-[12.5px] font-medium text-emerald-300 hover:bg-emerald-500/20 transition-all"
          >
            <Sparkles className="size-3.5" />
            <span>Skip & Proceed to Step 2</span>
          </button>
        ) : (
          <div />
        )}

        <div className="flex items-center gap-3">
          {isSufficient && !isLastStep && onSkipToStep2 && (
            <button
              type="button"
              onClick={onSkipToStep2}
              className="text-[12px] font-medium text-slate-400 hover:text-white transition-colors"
            >
              Skip Questions
            </button>
          )}

          <button
            type="button"
            onClick={onNextStep}
            disabled={isSubmitting}
            className="flex items-center gap-2 rounded-xl bg-[#2563eb] px-5 py-2.5 text-[13px] font-semibold text-white shadow-lg shadow-blue-600/30 transition-all hover:bg-blue-500 active:scale-[0.98] disabled:opacity-50"
          >
            <span>
              {isSubmitting
                ? "Processing Answers..."
                : isLastStep
                ? "Proceed to Step 2"
                : "Next Step"}
            </span>
            <ArrowRight className="size-4 stroke-[2.5]" />
          </button>
        </div>
      </div>
    </div>
  );
}
