import { useState } from "react";
import {
  Check,
  Copy,
  Edit3,
  Wand2,
  Play,
  User,
  Target,
  FileText,
  Sparkles,
  ListOrdered,
  Layout,
  ChevronRight,
  Paperclip,
  AlertCircle,
  ShieldAlert,
  Bookmark,
  CheckCircle2,
  Code2,
  BarChart2,
} from "lucide-react";

export default function StructuredPromptCard({
  score = 92,
  label = "Excellent",
  sections = [],
  rawJson = null,
  onCopy,
  onEdit,
  onImprove,
  onTest,
  onViewStrength,
  onViewAnalytics,
  isPublished = false,
  onPublishToLibrary,
}) {
  const [activeTab, setActiveTab] = useState("prompt"); // "prompt" | "json"
  const [copied, setCopied] = useState(false);

  const radius = 24;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - score / 100);

  const getItemText = (it) => {
    if (it == null) return "";
    if (typeof it === "string" || typeof it === "number") return String(it);
    if (typeof it === "object") {
      return (
        it.text ||
        it.value ||
        it.description ||
        it.content ||
        Object.entries(it)
          .filter(([k]) => k !== "key")
          .map(([k, v]) => (typeof v === "object" ? JSON.stringify(v) : `${k}: ${v}`))
          .join(" - ") ||
        JSON.stringify(it)
      );
    }
    return String(it);
  };

  // Section icon mapping
  const getSectionIcon = (labelName) => {
    const l = (labelName || "").toLowerCase();
    if (l.includes("role") || l.includes("persona") || l.includes("system")) return User;
    if (l.includes("objective") || l.includes("goal") || l.includes("mission")) return Target;
    if (l.includes("context") || l.includes("background") || l.includes("environment")) return FileText;
    if (l.includes("input") || l.includes("attachment") || l.includes("asset") || l.includes("data")) return Paperclip;
    if (l.includes("process") || l.includes("instruction") || l.includes("step") || l.includes("method")) return Sparkles;
    if (l.includes("requirement") || l.includes("spec") || l.includes("rule")) return ListOrdered;
    if (l.includes("edge") || l.includes("boundary") || l.includes("error") || l.includes("defens")) return AlertCircle;
    if (l.includes("constraint") || l.includes("negative") || l.includes("guardrail") || l.includes("avoid")) return ShieldAlert;
    if (l.includes("example") || l.includes("few-shot") || l.includes("sample") || l.includes("pattern")) return Bookmark;
    if (l.includes("quality") || l.includes("criteria") || l.includes("benchmark") || l.includes("accept")) return CheckCircle2;
    if (l.includes("output") || l.includes("deliverable") || l.includes("format")) return Layout;
    if (l.includes("code") || l.includes("snippet") || l.includes("schema")) return Code2;
    if (l.includes("final") || l.includes("command") || l.includes("execut")) return Play;
    return Sparkles;
  };

  // Normalize sections from any shape:
  // - Array of { id, title/label, items/content, type }
  // - Or fallback to rawJson.sections
  // - Or split rawJson.optimized_prompt by markdown headings
  const normalizedSections = (() => {
    let list = [];
    if (Array.isArray(sections) && sections.length > 0) {
      list = [...sections];
    } else if (rawJson?.sections && Array.isArray(rawJson.sections) && rawJson.sections.length > 0) {
      list = [...rawJson.sections];
    }

    if (list.length === 0) {
      const fullText =
        (typeof rawJson === "string" ? rawJson : null) ||
        rawJson?.optimized_prompt ||
        rawJson?.prompt ||
        rawJson?.raw_prompt ||
        "";

      if (fullText) {
        const parts = fullText.split(/\n(?=###?\s+)/);
        if (parts.length > 1) {
          list = parts.map((part, pIdx) => {
            const trimmed = part.trim();
            const firstLineEnd = trimmed.indexOf("\n");
            let secTitle = "PROMPT SECTION";
            let secBody = trimmed;
            if (trimmed.startsWith("#")) {
              const headerLine = firstLineEnd > 0 ? trimmed.slice(0, firstLineEnd) : trimmed;
              secTitle = headerLine.replace(/^#+\s*/, "").trim();
              secBody = firstLineEnd > 0 ? trimmed.slice(firstLineEnd).trim() : "";
            }
            return {
              id: `sec_dyn_${pIdx}`,
              label: secTitle,
              title: secTitle,
              type: "text",
              content: secBody,
            };
          });
        } else {
          list = [
            {
              id: "sec_full_prompt",
              label: "GENERATED PROMPT",
              title: "GENERATED PROMPT",
              type: "text",
              content: fullText,
            },
          ];
        }
      }
    }

    return list.map((sec, idx) => {
      if (typeof sec === "string") {
        return {
          id: `sec_${idx}`,
          label: `SECTION ${idx + 1}`,
          title: `SECTION ${idx + 1}`,
          type: "text",
          content: sec,
        };
      }
      return {
        ...sec,
        id: sec?.id || `sec_${idx}`,
        label: sec?.label || sec?.title || `SECTION ${idx + 1}`,
        title: sec?.title || sec?.label || `SECTION ${idx + 1}`,
      };
    });
  })();

  const handleCopyClick = () => {
    let textToCopy = "";
    if (activeTab === "json") {
      textToCopy = JSON.stringify(rawJson || { sections: normalizedSections }, null, 2);
    } else if (rawJson?.optimized_prompt) {
      textToCopy = rawJson.optimized_prompt;
    } else if (normalizedSections.length > 0) {
      textToCopy = normalizedSections
        .map((s) => {
          let body = s.content || "";
          if (Array.isArray(s.items)) {
            body = s.items
              .map((it) => (typeof it === "string" ? `• ${it}` : `• ${it.key ? `${it.key}: ` : ""}${getItemText(it)}`))
              .join("\n");
          }
          return `### ${s.label || s.title || "SECTION"}\n${body}`;
        })
        .join("\n\n");
    } else {
      textToCopy = typeof rawJson === "string" ? rawJson : JSON.stringify(rawJson || {}, null, 2);
    }

    if (navigator.clipboard) {
      navigator.clipboard.writeText(textToCopy);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
    onCopy?.(textToCopy);
  };

  return (
    <div className="w-full rounded-2xl border border-[#172339] bg-[#0c1322]/95 p-6 shadow-xl backdrop-blur-xl">
      {/* ── 1. Top Green Banner: Your Prompt is Ready ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4 mb-6">
        <div className="flex items-center gap-3.5">
          <div className="grid size-9 shrink-0 place-items-center rounded-xl bg-emerald-500 text-slate-950 font-bold shadow-md shadow-emerald-500/20">
            <Check className="size-5 stroke-[2.5]" />
          </div>
          <div>
            <div className="text-[15px] font-bold text-white">
              Your Prompt is Ready
            </div>
            <div className="text-[12px] text-slate-400">
              A complete, structured prompt based on your answers.
            </div>
          </div>
        </div>

        {/* Right Score Gauge Tag */}
        <button
          type="button"
          onClick={onViewAnalytics || onViewStrength}
          title="Click to view detailed analytics for this prompt"
          className="group flex items-center gap-3 rounded-xl border border-[#1a2b38] bg-[#091522]/80 px-3 py-1.5 transition-colors hover:border-emerald-500/40 cursor-pointer"
        >
          {/* Radial Ring */}
          <div className="relative size-10 shrink-0">
            <svg viewBox="0 0 60 60" className="size-full -rotate-90">
              <circle
                cx="30"
                cy="30"
                r={radius}
                fill="none"
                stroke="#122533"
                strokeWidth="5"
              />
              <circle
                cx="30"
                cy="30"
                r={radius}
                fill="none"
                stroke="#10b981"
                strokeWidth="5"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center text-[12px] font-bold text-white">
              {score}
            </div>
          </div>

          <div className="text-left text-[11px] leading-tight">
            <div className="text-slate-400">Prompt Strength</div>
            <div className="flex items-center gap-1 font-semibold text-emerald-400">
              <span>{label}</span>
              <ChevronRight className="size-3 transition-transform group-hover:translate-x-0.5" />
            </div>
          </div>
        </button>
      </div>

      {/* ── 2. Toolbar: Prompt / JSON Tabs & Actions ── */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#172339] pb-3 mb-5">
        {/* Left Tabs */}
        <div className="flex items-center gap-6">
          <button
            type="button"
            onClick={() => setActiveTab("prompt")}
            className={`relative pb-3 text-[13px] font-semibold transition-colors ${
              activeTab === "prompt"
                ? "text-blue-400 after:absolute after:bottom-[-1px] after:left-0 after:right-0 after:h-0.5 after:bg-blue-500"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Prompt
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("json")}
            className={`relative pb-3 text-[13px] font-semibold transition-colors ${
              activeTab === "json"
                ? "text-blue-400 after:absolute after:bottom-[-1px] after:left-0 after:right-0 after:h-0.5 after:bg-blue-500"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            JSON
          </button>
        </div>

        {/* Right Action Buttons */}
        <div className="flex items-center gap-2">
          {/* Copy Button */}
          <button
            type="button"
            onClick={handleCopyClick}
            className="flex items-center gap-1.5 rounded-lg border border-[#1b2740] bg-[#0c1426] px-3 py-1.5 text-[12px] font-medium text-slate-300 transition-colors hover:border-slate-600 hover:text-white"
          >
            {copied ? (
              <>
                <Check className="size-3.5 text-emerald-400" />
                <span className="text-emerald-400">Copied!</span>
              </>
            ) : (
              <>
                <Copy className="size-3.5" />
                <span>Copy</span>
              </>
            )}
          </button>

          {/* Improve Button */}
          <button
            type="button"
            onClick={onImprove}
            className="flex items-center gap-1.5 rounded-lg border border-[#1b2740] bg-[#0c1426] px-3 py-1.5 text-[12px] font-medium text-slate-300 transition-colors hover:border-slate-600 hover:text-white"
          >
            <Wand2 className="size-3.5 text-blue-400" />
            <span>Improve</span>
          </button>

          {/* Test Button (Coming Soon) */}
          <button
            type="button"
            onClick={() => alert("Feature coming soon: Model playground and direct prompt execution are currently under development.")}
            className="flex items-center gap-1.5 rounded-lg bg-[#19243a] border border-[#233454] px-3 py-1.5 text-[12px] font-medium text-slate-200 shadow-md transition-all hover:bg-blue-600 hover:text-white active:scale-95"
          >
            <Play className="size-3 fill-current text-blue-400" />
            <span>Test (Coming Soon)</span>
          </button>

          {/* View Detailed Analytics */}
          <button
            type="button"
            onClick={onViewAnalytics}
            title="View detailed analytics for this prompt"
            className="flex items-center gap-1.5 rounded-lg border border-[#1b2740] bg-[#0c1426] px-3 py-1.5 text-[12px] font-medium text-slate-300 transition-colors hover:border-blue-500/50 hover:bg-[#121c33] hover:text-white"
          >
            <BarChart2 className="size-3.5 text-blue-400" />
            <span className="hidden sm:inline">Analytics</span>
          </button>

          {/* Explicit Publish to Library Provision */}
          <button
            type="button"
            onClick={onPublishToLibrary}
            disabled={isPublished}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12px] font-medium transition-all ${
              isPublished
                ? "border border-emerald-500/40 bg-emerald-500/10 text-emerald-300 cursor-default"
                : "border border-blue-500/40 bg-blue-600/20 text-blue-300 hover:bg-blue-600 hover:text-white active:scale-95"
            }`}
          >
            {isPublished ? (
              <>
                <Check className="size-3.5 text-emerald-400" />
                <span>Published to Library</span>
              </>
            ) : (
              <>
                <Bookmark className="size-3.5" />
                <span>Publish to Library</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* ── 3. Structured Content Body ── */}
      {activeTab === "json" ? (
        <pre className="overflow-x-auto rounded-xl border border-[#1a253c] bg-[#080d17] p-4 text-[12px] font-mono text-slate-300 leading-relaxed">
          {JSON.stringify(rawJson || { score, label, sections: normalizedSections }, null, 2)}
        </pre>
      ) : normalizedSections.length > 0 ? (
        <div className="space-y-6">
          {normalizedSections.map((section, idx) => {
            const displayTitle = section.label || section.title || `SECTION ${idx + 1}`;
            const Icon = getSectionIcon(displayTitle);
            return (
              <div key={section.id || idx} className="space-y-2">
                {/* Section Header with Icon Badge */}
                <div className="flex items-center gap-2">
                  <span className="grid size-5 place-items-center rounded bg-blue-500/10 text-blue-400">
                    <Icon className="size-3.5" />
                  </span>
                  <span className="text-[12px] font-bold tracking-wider uppercase text-blue-400">
                    {displayTitle}
                  </span>
                </div>

                {/* Section Content */}
                <div className="pl-7 text-[13px] leading-relaxed text-slate-200 font-normal">
                  {section.type === "list" || (Array.isArray(section.items) && section.items.length > 0) ? (
                    <ul className="space-y-1.5">
                      {(section.items || []).map((item, iIdx) => (
                        <li key={iIdx} className="flex items-start gap-2">
                          <span className="text-blue-400/80 font-bold">•</span>
                          <span>
                            {item?.key && (
                              <strong className="text-slate-200 font-semibold mr-1.5">
                                {item.key}:
                              </strong>
                            )}
                            <span className="text-slate-300">
                              {getItemText(item)}
                            </span>
                          </span>
                        </li>
                      ))}
                    </ul>
                  ) : section.type === "numbered" ? (
                    <ol className="space-y-1.5">
                      {(section.items || []).map((item, iIdx) => (
                        <li key={iIdx} className="flex items-start gap-2">
                          <span className="shrink-0 font-mono text-[11px] font-semibold text-blue-400">
                            {iIdx + 1}.
                          </span>
                          <span className="text-slate-300">
                            {item?.key && (
                              <strong className="text-slate-200 font-semibold mr-1.5">
                                {item.key}:
                              </strong>
                            )}
                            {getItemText(item)}
                          </span>
                        </li>
                      ))}
                    </ol>
                  ) : section.type === "code" ? (
                    <pre className="overflow-x-auto rounded-lg border border-[#1b2740] bg-[#070d18] p-3 font-mono text-[12px] text-blue-300">
                      <code>{typeof section.content === "object" ? JSON.stringify(section.content, null, 2) : section.content}</code>
                    </pre>
                  ) : (
                    <div className="space-y-2 whitespace-pre-line text-slate-300 leading-relaxed">
                      {typeof section.content === "object"
                        ? JSON.stringify(section.content, null, 2)
                        : (section.content || (Array.isArray(section.items) ? section.items.map(getItemText).join("\n") : ""))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="rounded-xl border border-[#1a253c] bg-[#080d17] p-5 text-[13px] leading-relaxed text-slate-200 whitespace-pre-line">
          {rawJson?.optimized_prompt ||
            (typeof rawJson === "string" ? rawJson : JSON.stringify(rawJson, null, 2)) ||
            "Prompt synthesized successfully."}
        </div>
      )}
    </div>
  );
}
