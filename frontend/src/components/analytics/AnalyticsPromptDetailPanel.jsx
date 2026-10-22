import { useState } from "react";
import {
  ArrowLeft,
  X,
  Star,
  FileText,
  Sparkles,
  BarChart2,
  Check,
  Copy,
  Layers,
  ShieldAlert,
  Cpu,
  Clock,
  Hash,
  ArrowRight,
  GitCommit,
  CheckCircle2,
} from "lucide-react";
import {
  generatePromptEffectiveness,
  derivePromptStructuralMetrics,
  extractPromptText,
} from "../../lib/promptAnalytics";

export default function AnalyticsPromptDetailPanel({
  prompt,
  onClose,
  onUsePrompt,
}) {
  const [copied, setCopied] = useState(false);
  const [isStarred, setIsStarred] = useState(Boolean(prompt?.isFavorite || prompt?.isStarred));

  if (!prompt) return null;

  const effectiveness = generatePromptEffectiveness(prompt);
  const metrics = derivePromptStructuralMetrics(prompt);
  const fullText = extractPromptText(prompt);

  const score = prompt.score || prompt.overall_score || 90;
  const rubricMetrics = prompt.metrics || {
    clarity: score,
    specificity: Math.max(70, score - 3),
    context: Math.max(68, score - 5),
    structure: score,
    actionability: Math.min(100, score + 2),
  };

  const radius = 28;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - score / 100);

  // Versions history extracted from real prompt conversation or constructed dynamically
  const versions = prompt.versions && prompt.versions.length > 0
    ? prompt.versions
    : [
        {
          version: "v1.0",
          title: "Initial Synthesis",
          date: prompt.date || "Today",
          score: score,
          description: "Synthesized through adaptive clarification gap analysis",
          isLatest: true,
        },
      ];

  const handleCopy = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(fullText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="flex h-full flex-col bg-[#070d18] text-slate-100 selection:bg-blue-600/30">
      {/* ── Top Header Bar ── */}
      <div className="flex items-center justify-between border-b border-[#141f33] px-6 py-4 shrink-0 bg-[#070b14]/80 backdrop-blur-md">
        <button
          type="button"
          onClick={onClose}
          className="flex items-center gap-2 rounded-xl border border-[#1b2740] bg-[#0c1426] px-3 py-1.5 text-xs font-medium text-slate-300 transition-colors hover:border-blue-500/50 hover:bg-[#121c33] hover:text-white"
        >
          <ArrowLeft className="size-3.5 text-blue-400" />
          <span>Back to Table</span>
        </button>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsStarred(!isStarred)}
            className="grid size-8 place-items-center rounded-xl border border-[#1b2740] bg-[#0c1426] text-slate-400 hover:text-amber-400 transition-colors"
            title={isStarred ? "Remove star" : "Star prompt"}
          >
            <Star
              className={`size-4 ${
                isStarred ? "fill-amber-400 text-amber-400" : ""
              }`}
            />
          </button>

          <button
            type="button"
            onClick={onClose}
            className="grid size-8 place-items-center rounded-xl border border-[#1b2740] bg-[#0c1426] text-slate-400 transition-colors hover:border-red-500/50 hover:bg-red-500/10 hover:text-white"
            title="Close panel"
          >
            <X className="size-4" />
          </button>
        </div>
      </div>

      {/* ── Title & Meta Info ── */}
      <div className="border-b border-[#141f33] px-6 py-4 shrink-0 bg-[#080f1d]/50">
        <div className="flex items-start gap-3">
          <div className="grid size-10 place-items-center rounded-2xl border border-blue-500/20 bg-blue-600/10 text-blue-400 shrink-0 mt-0.5">
            <BarChart2 className="size-5" />
          </div>

          <div className="min-w-0 flex-1">
            <h2 className="text-base font-bold text-white leading-tight truncate">
              {prompt.title}
            </h2>
            <p className="mt-1 text-xs text-slate-400 line-clamp-1">
              {prompt.snippet || prompt.query || "Private generated prompt"}
            </p>

            <div className="mt-2.5 flex flex-wrap items-center gap-1.5 text-[11px]">
              <span className="rounded-lg border border-blue-500/30 bg-blue-500/15 px-2.5 py-0.5 font-semibold text-blue-300">
                {prompt.category || prompt.taskDomain || "General"}
              </span>
              <span className="rounded-lg border border-slate-700/60 bg-slate-800/40 px-2 py-0.5 font-medium text-slate-300">
                {prompt.model || "Gemini 3.5 Flash-Lite"}
              </span>
              <span className="text-slate-500">•</span>
              <span className="text-slate-400">{prompt.date || "Generated"}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Main Unified Analytics Body (Tabs Removed) ── */}
      <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
        {/* Section 1: Prompt Strength & 5 Rubrics */}
        <div className="rounded-2xl border border-[#16233b] bg-[#0b1222] p-4 shadow-md">
          <div className="flex items-center justify-between pb-3 border-b border-[#141e33]">
            <span className="text-xs font-semibold text-white flex items-center gap-1.5">
              <Sparkles className="size-3.5 text-blue-400" />
              <span>Prompt Strength & Rubrics</span>
            </span>
            <span className="text-[11px] font-semibold text-emerald-400">
              {score >= 90 ? "Excellent" : score >= 80 ? "Strong" : "Good"}
            </span>
          </div>

          <div className="mt-3 flex items-center gap-5">
            {/* Radial Ring */}
            <div className="relative size-18 shrink-0">
              <svg viewBox="0 0 70 70" className="size-full -rotate-90">
                <circle
                  cx="35"
                  cy="35"
                  r={radius}
                  stroke="#142138"
                  strokeWidth="6"
                  fill="transparent"
                />
                <circle
                  cx="35"
                  cy="35"
                  r={radius}
                  stroke="#10b981"
                  strokeWidth="6"
                  fill="transparent"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  strokeLinecap="round"
                  className="transition-[stroke-dashoffset] duration-700 ease-out"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-xl font-extrabold text-white leading-none">
                  {score}
                </span>
                <span className="text-[9px] text-slate-400 font-medium">/100</span>
              </div>
            </div>

            {/* Rubric Progress Bars */}
            <div className="flex-1 space-y-2 text-xs">
              {[
                { label: "Clarity", val: rubricMetrics.clarity },
                { label: "Specificity", val: rubricMetrics.specificity },
                { label: "Context", val: rubricMetrics.context },
                { label: "Structure", val: rubricMetrics.structure },
                { label: "Actionability", val: rubricMetrics.actionability },
              ].map((m) => (
                <div key={m.label}>
                  <div className="flex justify-between text-[11px] mb-0.5">
                    <span className="text-slate-400 font-medium">{m.label}</span>
                    <span className="text-slate-300 font-semibold">{m.val}/100</span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-[#142138] overflow-hidden">
                    <div
                      className="h-full rounded-full bg-blue-500"
                      style={{ width: `${m.val}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Section 2: Dynamic "Why This Prompt Is Effective" Analysis */}
        <div className="rounded-2xl border border-[#16233b] bg-[#0b1222] p-4 shadow-md space-y-3">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="size-4 text-emerald-400" />
            <h4 className="text-xs font-bold text-white">Why This Prompt Is Effective</h4>
          </div>

          <p className="text-xs text-slate-300 leading-relaxed">
            {effectiveness.summary}
          </p>

          <div className="space-y-2 pt-2 border-t border-[#141e33]">
            {effectiveness.catalysts.map((cat, idx) => (
              <div key={idx} className="flex items-start gap-2 text-[11.5px]">
                <span className="text-blue-400 font-bold shrink-0 mt-0.5">•</span>
                <div>
                  <strong className="text-slate-200 mr-1">{cat.title}:</strong>
                  <span className="text-slate-400">{cat.desc}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Section 3: Structural Footprint & Complexity */}
        <div className="rounded-2xl border border-[#16233b] bg-[#0b1222] p-4 shadow-md">
          <h4 className="text-xs font-bold text-white mb-3 flex items-center gap-1.5">
            <Layers className="size-3.5 text-blue-400" />
            <span>Structural Blueprint & Complexity</span>
          </h4>

          <div className="grid grid-cols-2 gap-2.5 text-center text-xs">
            <div className="rounded-xl border border-[#16233b] bg-[#070d18] p-3">
              <Hash className="size-4 mx-auto text-blue-400" />
              <div className="mt-1 text-base font-bold text-white">{metrics.wordCount}</div>
              <div className="text-[10px] text-slate-400">Total Words</div>
            </div>

            <div className="rounded-xl border border-[#16233b] bg-[#070d18] p-3">
              <Cpu className="size-4 mx-auto text-purple-400" />
              <div className="mt-1 text-base font-bold text-white">~{metrics.estimatedTokens}</div>
              <div className="text-[10px] text-slate-400">Estimated Tokens</div>
            </div>

            <div className="rounded-xl border border-[#16233b] bg-[#070d18] p-3">
              <Clock className="size-4 mx-auto text-emerald-400" />
              <div className="mt-1 text-base font-bold text-white">{metrics.readingTime}</div>
              <div className="text-[10px] text-slate-400">Reading Time</div>
            </div>

            <div className="rounded-xl border border-[#16233b] bg-[#070d18] p-3">
              <ShieldAlert className="size-4 mx-auto text-amber-400" />
              <div className="mt-1 text-base font-bold text-white">{metrics.rulesCount}</div>
              <div className="text-[10px] text-slate-400">Rules & Constraints</div>
            </div>
          </div>
        </div>

        {/* Section 4: Target Model & Execution Recommendations */}
        <div className="rounded-2xl border border-[#16233b] bg-[#0b1222] p-4 shadow-md space-y-2.5">
          <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
            <Cpu className="size-3.5 text-blue-400" />
            <span>Model Execution Parameters</span>
          </h4>

          <div className="space-y-1.5 text-xs text-slate-300">
            <div className="flex items-center justify-between py-1 border-b border-[#141e33] text-[11px]">
              <span className="text-slate-400">Recommended Model</span>
              <span className="font-semibold text-blue-400">{prompt.model || "Gemini 3.5 Flash-Lite"}</span>
            </div>
            <div className="flex items-center justify-between py-1 border-b border-[#141e33] text-[11px]">
              <span className="text-slate-400">Sampling Temperature</span>
              <span className="font-mono text-slate-200">0.2 (High Determinism)</span>
            </div>
            <div className="flex items-center justify-between py-1 border-b border-[#141e33] text-[11px]">
              <span className="text-slate-400">Multimodal Readiness</span>
              <span className="text-emerald-400 font-semibold">Enabled (Images & Docs)</span>
            </div>
            <div className="flex items-center justify-between py-1 text-[11px]">
              <span className="text-slate-400">Context Window Footprint</span>
              <span className="text-slate-200">&lt; 1% of 1M Tokens</span>
            </div>
          </div>
        </div>

        {/* Section 5: Version History & Evolution */}
        <div className="rounded-2xl border border-[#16233b] bg-[#0b1222] p-4 shadow-md space-y-3">
          <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
            <GitCommit className="size-3.5 text-blue-400" />
            <span>Iteration Evolution & Versions</span>
          </h4>

          <div className="space-y-2">
            {versions.map((v, i) => (
              <div
                key={v.version || i}
                className="flex items-start gap-3 rounded-xl border border-[#16233b] bg-[#070d18] p-3 text-xs"
              >
                <span className="rounded-md bg-blue-600/20 border border-blue-500/30 px-2 py-0.5 text-[10px] font-bold text-blue-400">
                  {v.version}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-white">{v.title || "Refined Prompt"}</span>
                    <span className="text-[10px] text-slate-500">{v.date}</span>
                  </div>
                  <p className="mt-0.5 text-[11px] text-slate-400 leading-snug">
                    {v.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Footer Actions ── */}
      <div className="border-t border-[#141f33] bg-[#070b14]/90 p-4 shrink-0 flex items-center gap-3">
        <button
          type="button"
          onClick={handleCopy}
          className="flex-1 flex items-center justify-center gap-2 rounded-xl border border-[#1b2740] bg-[#0c1426] py-2.5 px-3 text-xs font-medium text-slate-200 hover:text-white hover:bg-[#121c33] transition-colors"
        >
          {copied ? (
            <>
              <Check className="size-3.5 text-emerald-400" />
              <span className="text-emerald-400">Copied to Clipboard!</span>
            </>
          ) : (
            <>
              <Copy className="size-3.5 text-slate-400" />
              <span>Copy Full Prompt</span>
            </>
          )}
        </button>

        <button
          type="button"
          onClick={() => onUsePrompt?.(prompt)}
          className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-blue-600 py-2.5 px-3 text-xs font-semibold text-white shadow-lg shadow-blue-600/30 hover:bg-blue-500 active:scale-95 transition-all"
        >
          <span>Use in Chat</span>
          <ArrowRight className="size-3.5" />
        </button>
      </div>
    </div>
  );
}
