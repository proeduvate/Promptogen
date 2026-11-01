import { useState } from "react";
import {
  Sparkles,
  Bot,
  Layers,
  CheckCircle2,
  Clock,
  ArrowLeft,
  Copy,
  Check,
  Code2,
  BarChart3,
  Cpu,
  Target,
  FileCheck,
  ShieldAlert,
} from "lucide-react";

export default function Step2ComingSoonView({
  chat,
  onBackToQuestions,
  onNewPrompt,
}) {
  const [copied, setCopied] = useState(false);
  const answers = chat?.answers || {};
  const depthAnalysis = chat?.depthAnalysis || chat?.depth_analysis || null;
  const taskDomain = chat?.taskDomain || chat?.task_domain || depthAnalysis?.task_domain || "general";
  const questions = chat?.backendQuestions || [];

  const handleCopyJson = () => {
    const payload = {
      prompt: chat?.query || "",
      task_domain: taskDomain,
      depth_analysis: depthAnalysis,
      captured_parameters: answers,
    };
    navigator.clipboard?.writeText(JSON.stringify(payload, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const domainLabel =
    taskDomain === "software_development"
      ? "Software Development"
      : taskDomain === "marketing"
      ? "Marketing & Growth"
      : taskDomain === "content_creation"
      ? "Content & Copywriting"
      : taskDomain === "business"
      ? "Business & Strategy"
      : taskDomain.replace(/_/g, " ").toUpperCase();

  return (
    <div className="mx-auto max-w-5xl px-6 py-6 pb-28">
      {/* Top Banner: Coming Soon Pill */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-blue-500/30 bg-gradient-to-r from-blue-900/30 via-[#0d162d]/60 to-purple-900/20 p-5 backdrop-blur-xl shadow-xl">
        <div className="flex items-center gap-3">
          <div className="grid size-11 place-items-center rounded-xl bg-blue-600/20 text-blue-400 ring-1 ring-blue-500/40">
            <Sparkles className="size-6 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[12px] font-bold uppercase tracking-wider text-blue-400">
                Step 1 Complete
              </span>
              <span className="text-slate-500">•</span>
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/20 px-2.5 py-0.5 text-[11px] font-bold text-amber-300">
                <Clock className="size-3" />
                Step 2 Coming Soon
              </span>
            </div>
            <h1 className="text-[20px] font-bold text-white mt-0.5">
              Adaptive Clarification & Gap Analysis Captured
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onBackToQuestions}
            className="flex items-center gap-2 rounded-xl border border-[#1b2740] bg-[#0c1426] px-4 py-2 text-[12.5px] font-medium text-slate-300 transition-colors hover:bg-[#121c33] hover:text-white"
          >
            <ArrowLeft className="size-4" />
            <span>Edit Answers</span>
          </button>
          <button
            type="button"
            onClick={handleCopyJson}
            className="flex items-center gap-2 rounded-xl border border-blue-500/30 bg-blue-600/10 px-4 py-2 text-[12.5px] font-medium text-blue-300 transition-colors hover:bg-blue-600/20"
          >
            {copied ? <Check className="size-4 text-emerald-400" /> : <Copy className="size-4" />}
            <span>{copied ? "Copied JSON!" : "Export Context"}</span>
          </button>
        </div>
      </div>

      {/* Grid: 2 columns */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left Column (2 spans): Captured Parameters & Prompt Context */}
        <div className="space-y-6 lg:col-span-2">
          {/* Original User Prompt Card */}
          <div className="rounded-2xl border border-[#172339] bg-[#0c1322]/90 p-5 shadow-lg backdrop-blur-md">
            <div className="flex items-center justify-between pb-3 border-b border-[#172339]">
              <span className="text-[12px] font-bold uppercase tracking-wider text-slate-400">
                Original Input Prompt
              </span>
              <span className="rounded-full border border-blue-500/30 bg-blue-500/10 px-2.5 py-0.5 text-[11px] font-medium text-blue-300">
                {domainLabel}
              </span>
            </div>
            <p className="mt-3 text-[14.5px] leading-relaxed text-slate-100 font-medium">
              "{chat?.query || chat?.fullPrompt}"
            </p>
          </div>

          {/* Captured Dynamic Clarification Parameters */}
          <div className="rounded-2xl border border-[#172339] bg-[#0c1322]/90 p-5 shadow-lg backdrop-blur-md">
            <div className="flex items-center justify-between pb-3 border-b border-[#172339]">
              <div className="flex items-center gap-2">
                <FileCheck className="size-4 text-emerald-400" />
                <span className="text-[13px] font-bold text-slate-200">
                  Adaptive Parameter Profile
                </span>
              </div>
              <span className="text-[11px] text-slate-400">
                {Object.keys(answers).length} field(s) captured
              </span>
            </div>

            {Object.keys(answers).length === 0 ? (
              <div className="py-6 text-center text-[13px] text-slate-400">
                No extra parameters needed — prompt contained sufficient information.
              </div>
            ) : (
              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                {Object.entries(answers).map(([key, value]) => {
                  if (!value || key.endsWith("_other")) return null;
                  const matchingQ = questions.find((q) => q.id === key);
                  const label = matchingQ?.question || key.replace(/_/g, " ");

                  const displayVal = Array.isArray(value)
                    ? value.join(", ")
                    : typeof value === "object"
                    ? JSON.stringify(value)
                    : String(value);

                  return (
                    <div
                      key={key}
                      className="rounded-xl border border-[#182642] bg-[#090e1a] p-3.5"
                    >
                      <div className="text-[11px] font-medium uppercase tracking-wider text-slate-400 truncate">
                        {label}
                      </div>
                      <div className="mt-1 text-[13px] font-semibold text-slate-100 break-words">
                        {displayVal}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Prompt Depth & Gap Analysis (from Backend Engine) */}
          {depthAnalysis && (
            <div className="rounded-2xl border border-[#172339] bg-[#0c1322]/90 p-5 shadow-lg backdrop-blur-md">
              <div className="flex items-center gap-2 pb-3 border-b border-[#172339]">
                <Target className="size-4 text-purple-400" />
                <span className="text-[13px] font-bold text-slate-200">
                  AI Depth & Gap Analysis Breakdown
                </span>
              </div>

              <div className="mt-4 space-y-3 text-[12.5px]">
                {depthAnalysis.task_intent && (
                  <div>
                    <span className="font-semibold text-slate-300">Identified Intent: </span>
                    <span className="text-slate-400">{depthAnalysis.task_intent}</span>
                  </div>
                )}

                {depthAnalysis.info_present && depthAnalysis.info_present.length > 0 && (
                  <div>
                    <span className="font-semibold text-emerald-400">Information Present: </span>
                    <span className="text-slate-300">
                      {depthAnalysis.info_present.join("; ")}
                    </span>
                  </div>
                )}

                {depthAnalysis.info_missing && depthAnalysis.info_missing.length > 0 && (
                  <div>
                    <span className="font-semibold text-amber-400">Gaps Addressed: </span>
                    <span className="text-slate-300">
                      {depthAnalysis.info_missing.join("; ")}
                    </span>
                  </div>
                )}

                {depthAnalysis.expected_output_format && (
                  <div>
                    <span className="font-semibold text-sky-400">Target Output Format: </span>
                    <span className="text-slate-300">
                      {depthAnalysis.expected_output_format}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Step 2 Roadmap & Next Steps */}
        <div className="space-y-6">
          {/* Step 2 Coming Soon Feature Card */}
          <div className="relative overflow-hidden rounded-2xl border border-blue-500/40 bg-gradient-to-b from-[#0e1a38] to-[#0a101d] p-5 shadow-xl">
            <div className="absolute -right-6 -top-6 size-24 rounded-full bg-blue-500/10 blur-xl" />

            <div className="flex items-center gap-2">
              <Layers className="size-5 text-blue-400" />
              <h3 className="text-[15px] font-bold text-white">
                Step 2: Prompt Synthesis
              </h3>
            </div>

            <p className="mt-3 text-[12.5px] leading-relaxed text-slate-300">
              In Step 2, the multi-stage LangGraph synthesizer will combine your initial prompt and the adaptive parameters to assemble:
            </p>

            <div className="mt-4 space-y-2.5 text-[12px]">
              <div className="flex items-start gap-2 text-slate-300">
                <CheckCircle2 className="size-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>
                  <strong>Persona & Role Definition</strong> with calibrated expertise
                </span>
              </div>
              <div className="flex items-start gap-2 text-slate-300">
                <CheckCircle2 className="size-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>
                  <strong>Strict Execution Constraints & Rules</strong> preventing hallucination
                </span>
              </div>
              <div className="flex items-start gap-2 text-slate-300">
                <CheckCircle2 className="size-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>
                  <strong>Dynamic XML / Markdown Template</strong> with concrete examples
                </span>
              </div>
              <div className="flex items-start gap-2 text-slate-300">
                <CheckCircle2 className="size-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>
                  <strong>Rubric Quality Scoring</strong> (Clarity, Specificity, Context, Actionability)
                </span>
              </div>
            </div>

            <div className="mt-6 rounded-xl border border-blue-500/20 bg-blue-950/40 p-3 text-center">
              <span className="text-[11.5px] font-semibold text-blue-300">
                🚧 Multi-stage synthesis engine under active development
              </span>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="rounded-2xl border border-[#172339] bg-[#0c1322]/90 p-5 shadow-lg backdrop-blur-md space-y-3">
            <div className="text-[12px] font-bold uppercase tracking-wider text-slate-400 mb-2">
              Next Actions
            </div>

            <button
              type="button"
              onClick={onNewPrompt}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-[13px] font-semibold text-white shadow-lg shadow-blue-600/30 transition-all hover:bg-blue-500"
            >
              <Sparkles className="size-4" />
              <span>Test Another Prompt</span>
            </button>

            <button
              type="button"
              onClick={onBackToQuestions}
              className="w-full flex items-center justify-center gap-2 rounded-xl border border-[#1b2740] bg-[#0c1426] px-4 py-2.5 text-[13px] font-medium text-slate-300 transition-colors hover:bg-[#121c33] hover:text-white"
            >
              <ArrowLeft className="size-4" />
              <span>Modify Clarification Answers</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
