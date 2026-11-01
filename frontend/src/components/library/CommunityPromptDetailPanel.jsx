import { useState, useEffect } from "react";
import { generatePromptEffectiveness } from "../../lib/promptAnalytics";
import {
  BarChart2,
  Code2,
  Play,
  FileText,
  BookOpen,
  Database,
  ListChecks,
  Mail,
  Image as ImageIcon,
  GraduationCap,
  Heart,
  Megaphone,
  Star,
  Download,
  Bookmark,
  Share2,
  Check,
  RotateCcw,
  ArrowRight,
  ShieldCheck,
  ChevronDown,
  Copy,
  X,
  Sparkles,
  SlidersHorizontal,
  Send,
  MessageSquare,
  Wand2,
} from "lucide-react";

const ICON_MAP = {
  BarChart2,
  Code2,
  Play,
  FileText,
  BookOpen,
  Database,
  ListChecks,
  Mail,
  Image: ImageIcon,
  GraduationCap,
  Heart,
  Megaphone,
};

export default function CommunityPromptDetailPanel({
  prompt,
  isOpen = true,
  onClose,
  onFineTuneInChat,
  onUsePromptDirectly,
  onSavePrompt,
  onToggleBookmark,
  isSaved = false,
  isBookmarked = false,
}) {
  if (!prompt) return null;

  const bookmarkActive = isBookmarked || isSaved;
  const toggleBookmark = onToggleBookmark || onSavePrompt;
  const effectiveness = generatePromptEffectiveness(prompt);

  const [activeTab, setActiveTab] = useState("overview"); // "overview" | "preview" | "quality" | "reviews"
  const [activeMode, setActiveMode] = useState("finetune"); // "finetune" | "use-direct"

  const [customFields, setCustomFields] = useState({
    productName: prompt.defaultCustomization?.productName || prompt.title || "",
    primaryGoal: prompt.defaultCustomization?.primaryGoal || "Increase user acquisition",
    targetAudience: prompt.defaultCustomization?.targetAudience || "Remote professionals",
    toneStyle: prompt.defaultCustomization?.toneStyle || "Professional and actionable",
    additionalDirectives: prompt.defaultCustomization?.additionalDirectives || "",
  });

  const [copied, setCopied] = useState(false);
  const [showLivePreview, setShowLivePreview] = useState(false);

  useEffect(() => {
    if (prompt) {
      setCustomFields({
        productName: prompt.defaultCustomization?.productName || prompt.title || "",
        primaryGoal: prompt.defaultCustomization?.primaryGoal || "Increase effectiveness & conversion",
        targetAudience: prompt.defaultCustomization?.targetAudience || "Target users & professionals",
        toneStyle: prompt.defaultCustomization?.toneStyle || "Professional and actionable",
        additionalDirectives: prompt.defaultCustomization?.additionalDirectives || "",
      });
    }
  }, [prompt]);

  const IconComponent = (prompt.icon && ICON_MAP[prompt.icon]) || FileText;

  const radius = 22;
  const circumference = 2 * Math.PI * radius;
  const score = prompt.score || 88;
  const strokeDashoffset = circumference * (1 - score / 100);

  const handleReset = () => {
    if (prompt.defaultCustomization) {
      setCustomFields({
        productName: prompt.defaultCustomization.productName || prompt.title,
        primaryGoal: prompt.defaultCustomization.primaryGoal || "Increase user acquisition",
        targetAudience: prompt.defaultCustomization.targetAudience || "Remote professionals",
        toneStyle: prompt.defaultCustomization.toneStyle || "Professional and actionable",
        additionalDirectives: "",
      });
    }
  };

  const handleCopyPrompt = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(prompt.fullPromptText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleShare = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href);
      alert("Prompt link copied to clipboard!");
    }
  };

  // Construct customized prompt preview
  const liveCustomizedPrompt = `Act as an expert AI assistant specialized in: ${prompt.title}.

Context & Subject: ${customFields.productName || prompt.title}
Primary Goal: ${customFields.primaryGoal}
Target Audience: ${customFields.targetAudience}
Tone & Delivery Style: ${customFields.toneStyle}
${customFields.additionalDirectives ? `Special Fine-Tuning Directives:\n- ${customFields.additionalDirectives}\n` : ""}
Base Prompt Directives:
${prompt.fullPromptText || prompt.description}`;

  return (
    <div className="w-full rounded-2xl border border-[#172339] bg-[#0c1322]/95 p-6 shadow-2xl backdrop-blur-xl selection:bg-blue-600/30">
      {/* ── 1. Header: Icon, Title, Tags & Score Gauge ── */}
      <div className="flex items-start justify-between gap-4 pb-4">
        <div className="flex items-start gap-3.5 min-w-0">
          <div className="grid size-12 shrink-0 place-items-center rounded-2xl bg-blue-500/10 text-blue-400 ring-1 ring-blue-500/20">
            <IconComponent className="size-6" />
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="text-[20px] font-bold text-white tracking-tight leading-snug">
                {prompt.title}
              </h2>
              {prompt.isUserGenerated && (
                <span className="rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-400">
                  Your Prompt
                </span>
              )}
            </div>

            <div className="mt-2 flex flex-wrap gap-1.5">
              <span className="rounded-lg border border-blue-500/30 bg-blue-500/15 px-2.5 py-0.5 text-[11px] font-semibold text-blue-300">
                {prompt.model || "GPT-4o"}
              </span>
              {prompt.tags?.map((tag) => (
                <span
                  key={tag}
                  className="rounded-lg border border-slate-700/60 bg-slate-800/40 px-2.5 py-0.5 text-[11px] font-medium text-slate-300"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Circular Score Badge & Close Button */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="flex items-center gap-2.5 rounded-xl border border-[#172339] bg-[#080e1a] px-3 py-1.5 shadow-inner">
            <div className="relative size-11">
              <svg viewBox="0 0 54 54" className="size-full -rotate-90">
                <circle
                  cx="27"
                  cy="27"
                  r={radius}
                  fill="none"
                  stroke="#162138"
                  strokeWidth="4"
                />
                <circle
                  cx="27"
                  cy="27"
                  r={radius}
                  fill="none"
                  stroke={score >= 90 ? "#10b981" : score >= 80 ? "#3b82f6" : "#f59e0b"}
                  strokeWidth="4"
                  strokeLinecap="round"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center text-[13px] font-bold text-white">
                {score}
              </div>
            </div>

            <div className="text-left text-[11px] leading-tight">
              <div className="text-slate-400 font-medium">Strength Score</div>
              <div className="font-semibold text-emerald-400">
                {prompt.strengthLabel || (score >= 90 ? "Excellent" : "Strong")}
              </div>
            </div>
          </div>

          {onClose && (
            <button
              type="button"
              onClick={onClose}
              title="Close panel"
              className="grid size-8 place-items-center rounded-xl border border-[#1b2740] bg-[#0c1426] text-slate-400 hover:text-white hover:border-slate-500 transition-colors"
            >
              <X className="size-4" />
            </button>
          )}
        </div>
      </div>

      {/* ── 2. Description ── */}
      <p className="text-[13px] leading-relaxed text-slate-300">
        {prompt.description}
      </p>

      {/* ── 3. Author & Quality Stats ── */}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-y border-[#172339] py-3 text-[12px] text-slate-400">
        <div className="flex items-center gap-2">
          {prompt.author?.avatar && (
            <img
              src={prompt.author.avatar}
              alt={prompt.author.name}
              className="size-6 rounded-full object-cover ring-1 ring-white/10"
            />
          )}
          <div>
            <span className="font-semibold text-slate-200">{prompt.author?.name || "Promptogen AI"}</span>
            <span className="ml-1 text-[11px] text-slate-500">
              ({prompt.author?.role || "Verified"})
            </span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <Star className="size-3.5 fill-amber-400 text-amber-400" />
            <span className="font-semibold text-slate-200">{prompt.rating || "4.8"}</span>
            <span className="text-slate-500">({prompt.reviewsCount || 120})</span>
          </div>

          <div className="flex items-center gap-1.5">
            <Download className="size-3.5 text-slate-400" />
            <span>{prompt.uses || "10K"} uses</span>
          </div>

          <button
            type="button"
            onClick={() => toggleBookmark?.(prompt)}
            className={`flex items-center gap-1.5 transition-colors ${
              bookmarkActive ? "text-blue-400 font-semibold" : "text-slate-400 hover:text-white"
            }`}
          >
            <Bookmark className={`size-3.5 ${bookmarkActive ? "fill-blue-500 text-blue-500" : ""}`} />
            <span>{bookmarkActive ? "Saved" : "Save"}</span>
          </button>
        </div>
      </div>

      {/* ── 4. Main Workflow Navigation Tabs ── */}
      <div className="mt-4 flex items-center justify-between border-b border-[#172339] pb-1 text-[12.5px]">
        <div className="flex items-center gap-4">
          {[
            { id: "overview", label: "Use & Fine-Tune" },
            { id: "preview", label: "Full Prompt Preview" },
            { id: "quality", label: "Quality Benchmarks" },
            { id: "reviews", label: "Reviews" },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`relative pb-2.5 font-semibold transition-colors ${
                activeTab === tab.id
                  ? "text-blue-400 after:absolute after:bottom-[-1px] after:left-0 after:right-0 after:h-0.5 after:bg-blue-500"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={handleShare}
          className="flex items-center gap-1.5 text-slate-400 hover:text-white text-[12px] pb-2 transition-colors"
          title="Share prompt"
        >
          <Share2 className="size-3.5" />
          <span>Share</span>
        </button>
      </div>

      {/* ── Tab Content ── */}
      {activeTab === "overview" && (
        <div className="mt-4 space-y-4">
          {/* Dual Action Switcher Banner */}
          <div className="grid grid-cols-2 gap-2 rounded-2xl border border-[#1b2740] bg-[#0a101d] p-1.5">
            <button
              type="button"
              onClick={() => setActiveMode("finetune")}
              className={`flex items-center justify-center gap-2 rounded-xl py-2 px-3 text-xs font-semibold transition-all ${
                activeMode === "finetune"
                  ? "bg-blue-600 text-white shadow-md shadow-blue-600/30"
                  : "text-slate-400 hover:text-white hover:bg-white/5"
              }`}
            >
              <Wand2 className="size-3.5 text-blue-200" />
              <span>Fine-Tune in Chat</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveMode("use-direct")}
              className={`flex items-center justify-center gap-2 rounded-xl py-2 px-3 text-xs font-semibold transition-all ${
                activeMode === "use-direct"
                  ? "bg-blue-600 text-white shadow-md shadow-blue-600/30"
                  : "text-slate-400 hover:text-white hover:bg-white/5"
              }`}
            >
              <Check className="size-3.5 text-blue-200" />
              <span>Use As-Is</span>
            </button>
          </div>

          {/* ── MODE 1: Fine-Tune with Chat by Changing Fields ── */}
          {activeMode === "finetune" && (
            <div className="rounded-2xl border border-[#192742] bg-[#0a101d]/90 p-4 space-y-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-1.5">
                    <Sparkles className="size-4 text-blue-400" />
                    <h3 className="text-[13px] font-bold text-white">
                      Change Fields & Continue to Fine-Tune
                    </h3>
                  </div>
                  <p className="mt-1 text-[11.5px] text-slate-400">
                    Adjust the prompt parameters below. Continuing with chat will start an interactive session where the AI analyzes loopholes and fine-tunes your prompt further.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleReset}
                  className="flex items-center gap-1 text-[11px] font-medium text-slate-400 hover:text-white shrink-0 transition-colors"
                >
                  <RotateCcw className="size-3" />
                  <span>Reset</span>
                </button>
              </div>

              {/* Editable Fields Form */}
              <div className="space-y-3">
                {/* Row 1: Product/Topic & Primary Goal */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11.5px] font-medium text-slate-300 mb-1">
                      Product / Topic / Context
                    </label>
                    <input
                      type="text"
                      value={customFields.productName}
                      onChange={(e) =>
                        setCustomFields({ ...customFields, productName: e.target.value })
                      }
                      placeholder="e.g., FocusFlow (AI Productivity Tool)"
                      className="w-full rounded-xl border border-[#1b2740] bg-[#0c1426] px-3 py-2 text-[12px] text-white placeholder:text-slate-500 outline-none focus:border-blue-500/80 transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-[11.5px] font-medium text-slate-300 mb-1">
                      Primary Goal
                    </label>
                    <div className="relative">
                      <select
                        value={customFields.primaryGoal}
                        onChange={(e) =>
                          setCustomFields({ ...customFields, primaryGoal: e.target.value })
                        }
                        className="w-full appearance-none rounded-xl border border-[#1b2740] bg-[#0c1426] px-3 py-2 pr-8 text-[12px] text-white outline-none focus:border-blue-500/80 transition-colors"
                      >
                        <option value="Increase user acquisition & conversion">Increase user acquisition & conversion</option>
                        <option value="Brand awareness & executive positioning">Brand awareness & executive positioning</option>
                        <option value="Rigorous technical architecture & security">Rigorous technical architecture & security</option>
                        <option value="Customer retention & churn reduction">Customer retention & churn reduction</option>
                        <option value="Automate workflow and improve speed">Automate workflow and improve speed</option>
                      </select>
                      <ChevronDown className="pointer-events-none absolute right-2.5 top-2.5 size-3.5 text-slate-400" />
                    </div>
                  </div>
                </div>

                {/* Row 2: Target Audience & Tone */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11.5px] font-medium text-slate-300 mb-1">
                      Target Audience / Persona
                    </label>
                    <input
                      type="text"
                      value={customFields.targetAudience}
                      onChange={(e) =>
                        setCustomFields({ ...customFields, targetAudience: e.target.value })
                      }
                      placeholder="e.g., B2B Tech Founders, Engineering Leads"
                      className="w-full rounded-xl border border-[#1b2740] bg-[#0c1426] px-3 py-2 text-[12px] text-white placeholder:text-slate-500 outline-none focus:border-blue-500/80 transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-[11.5px] font-medium text-slate-300 mb-1">
                      Tone / Delivery Style
                    </label>
                    <div className="relative">
                      <select
                        value={customFields.toneStyle}
                        onChange={(e) =>
                          setCustomFields({ ...customFields, toneStyle: e.target.value })
                        }
                        className="w-full appearance-none rounded-xl border border-[#1b2740] bg-[#0c1426] px-3 py-2 pr-8 text-[12px] text-white outline-none focus:border-blue-500/80 transition-colors"
                      >
                        <option value="Professional and actionable">Professional and actionable</option>
                        <option value="Inspiring, modern and persuasive">Inspiring, modern and persuasive</option>
                        <option value="Highly technical, strict and rigorous">Highly technical, strict and rigorous</option>
                        <option value="Direct, concise and bulleted">Direct, concise and bulleted</option>
                        <option value="Conversational and friendly">Conversational and friendly</option>
                      </select>
                      <ChevronDown className="pointer-events-none absolute right-2.5 top-2.5 size-3.5 text-slate-400" />
                    </div>
                  </div>
                </div>

                {/* Row 3: Specific Directives for Fine-Tuning */}
                <div>
                  <label className="block text-[11.5px] font-medium text-slate-300 mb-1">
                    Special Directives & Loophole Focus (Optional)
                  </label>
                  <textarea
                    rows={2}
                    value={customFields.additionalDirectives}
                    onChange={(e) =>
                      setCustomFields({
                        ...customFields,
                        additionalDirectives: e.target.value,
                      })
                    }
                    placeholder="e.g., Address pricing objections, include step-by-step implementation roadmap, ensure output is under 500 words..."
                    className="w-full rounded-xl border border-[#1b2740] bg-[#0c1426] px-3 py-2 text-[12px] text-white placeholder:text-slate-500 outline-none focus:border-blue-500/80 transition-colors resize-none"
                  />
                </div>
              </div>

              {/* Live Preview Toggle */}
              <div className="border-t border-[#162138] pt-2">
                <button
                  type="button"
                  onClick={() => setShowLivePreview(!showLivePreview)}
                  className="text-[11.5px] text-blue-400 hover:text-blue-300 font-medium flex items-center gap-1 transition-colors"
                >
                  <span>{showLivePreview ? "Hide Live Adapted Query" : "Preview Adapted Query for Chat"}</span>
                  <ChevronDown className={`size-3 transition-transform ${showLivePreview ? "rotate-180" : ""}`} />
                </button>

                {showLivePreview && (
                  <pre className="mt-2 p-3 rounded-xl border border-[#18263f] bg-[#080e1a] text-[11px] leading-relaxed text-slate-300 font-mono whitespace-pre-wrap max-h-40 overflow-y-auto">
                    {liveCustomizedPrompt}
                  </pre>
                )}
              </div>

              {/* Primary Action Button: Fine-tune in Chat */}
              <button
                type="button"
                onClick={() => onFineTuneInChat?.(prompt, customFields)}
                className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 py-3 text-[13.5px] font-bold text-white shadow-lg shadow-blue-600/30 transition-all hover:from-blue-500 hover:to-indigo-500 active:scale-[0.99]"
              >
                <Sparkles className="size-4" />
                <span>Continue with Chat to Fine-Tune →</span>
              </button>
            </div>
          )}

          {/* ── MODE 2: Use As-Is (Instant Production) ── */}
          {activeMode === "use-direct" && (
            <div className="rounded-2xl border border-[#192742] bg-[#0a101d]/90 p-4 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-[13px] font-bold text-white">
                    Use High-Scoring Prompt As-Is
                  </h3>
                  <p className="text-[11.5px] text-slate-400 mt-0.5">
                    Score: <strong className="text-emerald-400">{score}/100</strong>. Ready for immediate deployment.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleCopyPrompt}
                  className="flex items-center gap-1.5 rounded-xl border border-[#1b2740] bg-[#0c1426] px-3 py-1.5 text-xs text-blue-400 hover:text-white hover:border-blue-500/50 transition-colors"
                >
                  {copied ? <Check className="size-3.5 text-emerald-400" /> : <Copy className="size-3.5" />}
                  <span>{copied ? "Copied!" : "Copy Full Prompt"}</span>
                </button>
              </div>

              {/* Full prompt display box */}
              <div className="max-h-56 overflow-y-auto rounded-xl border border-[#17243c] bg-[#080e1a] p-3 text-[11.5px] leading-relaxed text-slate-200 font-mono whitespace-pre-wrap">
                {prompt.fullPromptText || prompt.description}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={() => onUsePromptDirectly?.(prompt)}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-blue-600 py-2.5 px-4 text-[13px] font-semibold text-white shadow-md shadow-blue-600/30 hover:bg-blue-500 transition-all"
                >
                  <Send className="size-4" />
                  <span>Use in Composer</span>
                </button>

                <button
                  type="button"
                  onClick={handleCopyPrompt}
                  className="flex items-center gap-2 rounded-xl border border-[#1b2740] bg-[#0c1426] py-2.5 px-4 text-[13px] font-medium text-slate-300 hover:text-white hover:border-slate-500 transition-colors"
                >
                  <Copy className="size-4" />
                  <span>{copied ? "Copied" : "Copy"}</span>
                </button>
              </div>
            </div>
          )}

          {/* Prompt Highlights & Use Cases (Dynamic Real Data) */}
          <div className="rounded-2xl border border-[#172339] bg-[#0a101d]/60 p-4 space-y-3">
            <h4 className="text-[12.5px] font-bold text-white flex items-center gap-2">
              <Sparkles className="size-3.5 text-blue-400" />
              <span>Why this prompt is effective</span>
            </h4>
            <p className="text-[12px] text-slate-300 leading-relaxed">
              {effectiveness.summary}
            </p>
            <div className="space-y-2 pt-1 border-t border-[#162138]">
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
            <div className="flex flex-wrap gap-1.5 pt-2">
              {(prompt.bestFor || ["Production execution", "Fine-tuning in chat", "Autonomous workflows"]).map((item) => (
                <span
                  key={item}
                  className="rounded-lg border border-[#1c2a44] bg-[#0c1426] px-2.5 py-1 text-[11px] text-slate-300"
                >
                  ✓ {item}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Tab: Full Prompt Preview ── */}
      {activeTab === "preview" && (
        <div className="mt-5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[12px] text-slate-400 font-medium">Ready-to-Use Prompt Template</span>
            <button
              type="button"
              onClick={handleCopyPrompt}
              className="flex items-center gap-1.5 text-[12px] text-blue-400 hover:text-blue-300 transition-colors"
            >
              {copied ? <Check className="size-3.5 text-emerald-400" /> : <Copy className="size-3.5" />}
              <span>{copied ? "Copied!" : "Copy Full Text"}</span>
            </button>
          </div>
          <pre className="overflow-x-auto whitespace-pre-wrap rounded-xl border border-[#17243c] bg-[#0a101d] p-4 text-[12px] leading-relaxed text-slate-200 font-mono">
            {prompt.fullPromptText || prompt.description}
          </pre>
        </div>
      )}

      {/* ── Tab: Quality Benchmarks ── */}
      {activeTab === "quality" && (
        <div className="mt-5 space-y-3 text-[12px]">
          <div className="rounded-xl border border-[#17243c] bg-[#0a101d] p-4">
            <div className="font-semibold text-white mb-2 flex items-center justify-between">
              <span>Overall Prompt Quality Benchmark</span>
              <span className="font-bold text-emerald-400 text-sm">{score}/100</span>
            </div>
            <p className="text-slate-400 leading-relaxed mb-4">
              Tested across reasoning models (GPT-4o, Claude 3.5 Sonnet, Llama 3.3).
            </p>
            <div className="space-y-2.5">
              <div className="flex justify-between items-center text-slate-300">
                <span>Clarity & Persona Definition:</span>
                <span className="font-semibold text-emerald-400">96%</span>
              </div>
              <div className="flex justify-between items-center text-slate-300">
                <span>Domain Specificity:</span>
                <span className="font-semibold text-blue-400">92%</span>
              </div>
              <div className="flex justify-between items-center text-slate-300">
                <span>Instruction Adherence:</span>
                <span className="font-semibold text-emerald-400">94%</span>
              </div>
              <div className="flex justify-between items-center text-slate-300">
                <span>Actionability of Output:</span>
                <span className="font-semibold text-blue-400">95%</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Tab: Reviews ── */}
      {activeTab === "reviews" && (
        <div className="mt-5 space-y-3 text-[12px]">
          <div className="rounded-xl border border-[#17243c] bg-[#0a101d] p-3.5">
            <div className="flex items-center justify-between mb-1">
              <span className="font-semibold text-white">David Miller</span>
              <div className="flex items-center text-amber-400">{"★★★★★"}</div>
            </div>
            <p className="text-slate-400 leading-relaxed">
              "Generated our entire marketing roadmap in minutes. The fine-tuning in chat helped tailor it perfectly for our startup."
            </p>
          </div>

          <div className="rounded-xl border border-[#17243c] bg-[#0a101d] p-3.5">
            <div className="flex items-center justify-between mb-1">
              <span className="font-semibold text-white">Elena Rostova</span>
              <div className="flex items-center text-amber-400">{"★★★★★"}</div>
            </div>
            <p className="text-slate-400 leading-relaxed">
              "Changing the fields and continuing in chat made it effortless to refine and address edge cases."
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
