import { useState, useRef, useEffect } from "react";
import {
  Bot,
  Paperclip,
  ArrowUpRight,
  FileText,
  AlertTriangle,
  Info,
  CheckCircle2,
  FileCode,
  Image,
  Database,
  FileSpreadsheet,
  Loader2,
  Sparkles,
  Layers,
  HelpCircle,
} from "lucide-react";
import StructuredPromptCard from "./StructuredPromptCard";
import PromptDetailsPanel from "./PromptDetailsPanel";
import UsedContextPanel from "./UsedContextPanel";
import ResultQuickActionsPanel from "./ResultQuickActionsPanel";

export default function ChatResultView({
  chat,
  onFollowUp,
  onRegenerate,
  onCreateVersion,
  onSaveToLibrary,
  onExport,
  onViewAnalytics,
  isSaved,
}) {
  const [followUpText, setFollowUpText] = useState("");
  const [inlineAnswers, setInlineAnswers] = useState({});
  const messagesEndRef = useRef(null);

  const promptData = chat.generatedPromptData || {};

  // Build the conversation history from chat.conversation or generate the baseline
  const conversation =
    chat.conversation && chat.conversation.length > 0
      ? chat.conversation
      : [
          {
            id: "msg_u_init",
            role: "user",
            text: chat.query || "Create a structured prompt",
            timestamp: chat.timestamp || "Just now",
          },
          {
            id: "msg_p_1",
            role: "assistant",
            type: "prompt",
            version: 1,
            versionLabel: "v1: Initial Synthesis",
            title: chat.title || "Optimized Prompt",
            promptData: promptData,
            score: promptData.overall_score || chat.score || 92,
            timestamp: chat.timestamp || "Just now",
          },
        ];

  const prevCountRef = useRef(conversation.length);

  // Auto-scroll to latest message ONLY when a new message is appended during active chat
  useEffect(() => {
    // Only scroll if a new message was added after initial mount
    if (conversation.length > prevCountRef.current) {
      // Guard: do not scroll if the view is in an exiting transition state or hidden
      if (
        !messagesEndRef.current ||
        messagesEndRef.current.closest("[data-exiting='true']") ||
        messagesEndRef.current.closest(".pointer-events-none")
      ) {
        prevCountRef.current = conversation.length;
        return;
      }

      const scrollContainer = messagesEndRef.current.closest("main");
      if (scrollContainer) {
        scrollContainer.scrollTo({
          top: scrollContainer.scrollHeight,
          behavior: "smooth",
        });
      }
    }
    prevCountRef.current = conversation.length;
  }, [conversation.length]);

  const handleFollowUpSubmit = () => {
    if (!followUpText.trim()) return;
    onFollowUp?.(followUpText.trim());
    setFollowUpText("");
  };

  const handleInlineAnswerSelect = (questionId, option) => {
    setInlineAnswers((prev) => ({
      ...prev,
      [questionId]: option,
    }));
  };

  const handleInlineClarificationSubmit = (clarifyItem) => {
    const parts = (clarifyItem.questions || []).map((q) => {
      const ans = inlineAnswers[q.id] || q.options?.[0] || "Default";
      return `${q.question}: ${ans}`;
    });
    const summary = `Clarification answers: ${parts.join("; ")}`;
    onFollowUp?.(summary);
  };

  const getAttachmentIcon = (type) => {
    const t = (type || "").toLowerCase();
    if (t.includes("schema") || t.includes("sql") || t.includes("db")) return Database;
    if (t.includes("image") || t.includes("screenshot") || t.includes("wireframe") || t.includes("mockup")) return Image;
    if (t.includes("data") || t.includes("csv") || t.includes("excel")) return FileSpreadsheet;
    if (t.includes("code") || t.includes("json") || t.includes("yaml") || t.includes("config")) return FileCode;
    return FileText;
  };

  return (
    <div className="mx-auto max-w-7xl px-6 py-6 pb-28">
      {/* 2-Column Grid: Center Conversation Stream + Right Panels */}
      <div className="grid grid-cols-1 items-start gap-8 xl:grid-cols-[minmax(0,1fr)_316px]">
        {/* Center Chat Conversation Stream */}
        <div className="flex flex-col space-y-6">
          {conversation.map((msg, idx) => {
            // ── 1. User Message Turn ──
            if (msg.role === "user") {
              return (
                <div key={msg.id || idx} className="flex flex-col items-end">
                  <div className="flex items-start gap-3 max-w-2xl">
                    <div className="rounded-2xl rounded-tr-sm border border-[#1b2740] bg-[#0e1628] p-4 text-[13.5px] leading-relaxed text-slate-100 shadow-md">
                      {msg.text}
                    </div>
                    <div className="grid size-8 shrink-0 place-items-center rounded-full bg-slate-800 text-[12px] font-semibold text-white ring-1 ring-white/10">
                      U
                    </div>
                  </div>
                  <span className="mr-11 mt-1 text-[11px] text-slate-500">
                    {msg.timestamp || "Just now"}
                  </span>
                </div>
              );
            }

            // ── 2. Assistant Loading Indicator Turn ──
            if (msg.type === "loading") {
              return (
                <div key={msg.id || idx} className="flex items-start gap-3 animate-pulse">
                  <div className="grid size-8 shrink-0 place-items-center rounded-full bg-blue-600/20 text-blue-400 ring-1 ring-blue-500/30">
                    <Bot className="size-4" />
                  </div>
                  <div className="flex items-center gap-3 rounded-2xl border border-blue-500/20 bg-[#091224]/80 px-4 py-3 text-[13px] text-blue-300 shadow-md">
                    <Loader2 className="size-4 animate-spin text-blue-400" />
                    <span>{msg.message || "Analyzing conversation & synthesizing refined prompt..."}</span>
                  </div>
                </div>
              );
            }

            // ── 3. Assistant Clarification Questions Turn ──
            if (msg.type === "clarification") {
              return (
                <div key={msg.id || idx} className="flex items-start gap-3">
                  <div className="grid size-8 shrink-0 place-items-center rounded-full bg-blue-600/20 text-blue-400 ring-1 ring-blue-500/30">
                    <Bot className="size-4" />
                  </div>
                  <div className="flex-1 space-y-3 rounded-2xl border border-blue-500/25 bg-[#091122]/95 p-5 shadow-lg backdrop-blur-xl">
                    <div className="flex items-center gap-2 text-[13.5px] font-semibold text-blue-300">
                      <HelpCircle className="size-4 text-blue-400" />
                      <span>{msg.reasoning || "To accurately adapt this prompt, please clarify these details:"}</span>
                    </div>

                    <div className="space-y-4 pt-2">
                      {(msg.questions || []).map((q, qIdx) => (
                        <div key={q.id || qIdx} className="space-y-2">
                          <label className="text-[12.5px] font-medium text-slate-200">
                            {q.question}
                          </label>
                          <div className="flex flex-wrap gap-2">
                            {(q.options || []).map((opt, oIdx) => {
                              const isSelected = (inlineAnswers[q.id] || q.options[0]) === opt;
                              return (
                                <button
                                  key={oIdx}
                                  type="button"
                                  onClick={() => handleInlineAnswerSelect(q.id, opt)}
                                  className={`rounded-xl px-3 py-1.5 text-[12px] font-medium transition-all ${
                                    isSelected
                                      ? "bg-blue-600 text-white shadow-md shadow-blue-600/30"
                                      : "border border-[#1b2740] bg-[#0c1426] text-slate-300 hover:border-slate-500"
                                  }`}
                                >
                                  {opt}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>

                    <button
                      type="button"
                      onClick={() => handleInlineClarificationSubmit(msg)}
                      className="mt-3 flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-[12.5px] font-semibold text-white shadow-md transition-all hover:bg-blue-500 active:scale-95"
                    >
                      <span>Submit Answers & Refine Prompt</span>
                      <ArrowUpRight className="size-4" />
                    </button>
                  </div>
                </div>
              );
            }

            // ── 4. Assistant Error Turn ──
            if (msg.type === "error") {
              return (
                <div key={msg.id || idx} className="flex items-start gap-3">
                  <div className="grid size-8 shrink-0 place-items-center rounded-full bg-red-600/20 text-red-400 ring-1 ring-red-500/30">
                    <AlertTriangle className="size-4" />
                  </div>
                  <div className="flex-1 rounded-2xl border border-red-500/30 bg-red-500/5 p-4 text-[13px] text-red-200">
                    <p className="font-semibold text-red-300">Prompt refinement issue</p>
                    <p className="mt-1 text-slate-300">{msg.error}</p>
                  </div>
                </div>
              );
            }

            // ── 5. Assistant Structured Prompt Turn ──
            const turnPromptData = msg.promptData || chat.generatedPromptData || {};
            const turnSections = turnPromptData.sections || [];
            const turnAttachments = (turnPromptData.required_attachments || []).filter(Boolean);

            return (
              <div key={msg.id || idx} className="flex items-start gap-3">
                <div className="grid size-8 shrink-0 place-items-center rounded-full bg-blue-600/20 text-blue-400 ring-1 ring-blue-500/30">
                  <Bot className="size-4" />
                </div>

                <div className="flex-1 space-y-4 min-w-0">
                  {/* Version & Header Pill */}
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="rounded-full bg-blue-500/15 border border-blue-500/30 px-2.5 py-0.5 text-[11px] font-bold text-blue-300 flex items-center gap-1.5">
                        <Sparkles className="size-3 text-blue-400" />
                        {msg.versionLabel || `Version ${msg.version || idx + 1}`}
                      </span>
                      <span className="text-[13px] text-slate-300 font-medium">
                        {msg.version && msg.version > 1 ? "Refined Structured Prompt" : "Task-Adaptive Prompt"}
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-500">
                      {msg.timestamp || "Just now"}
                    </span>
                  </div>

                  {/* ── Required Attachments & Assets Callout ── */}
                  {turnAttachments.length > 0 && (
                    <div className="rounded-2xl border border-amber-500/30 bg-amber-500/[0.04] p-5 shadow-lg backdrop-blur-xl">
                      <div className="flex items-start gap-3.5">
                        <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-amber-500/15 text-amber-400 ring-1 ring-amber-500/30">
                          <Paperclip className="size-4" />
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <h4 className="text-[13.5px] font-bold text-white tracking-wide">
                              REQUIRED ATTACHMENTS & INPUT ASSETS
                            </h4>
                            <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-[10.5px] font-semibold text-amber-300">
                              {turnAttachments.length} {turnAttachments.length === 1 ? "Asset" : "Assets"} To Attach
                            </span>
                          </div>
                          <p className="text-[12px] text-slate-300 mt-1 leading-relaxed">
                            To execute this prompt with complete accuracy, attach or paste these context files when submitting this prompt to ChatGPT, Claude, or Gemini:
                          </p>
                        </div>
                      </div>

                      <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                        {turnAttachments.map((att, i) => {
                          const Icon = getAttachmentIcon(att?.type);
                          const name = typeof att === "string" ? att : (att?.name || "Asset");
                          const desc = typeof att === "object" && att !== null ? (typeof att.description === "object" ? JSON.stringify(att.description) : (att.description || "")) : "";
                          const fmt = typeof att === "object" && att !== null ? (typeof att.format_recommendation === "object" ? JSON.stringify(att.format_recommendation) : (att.format_recommendation || "")) : "";
                          const isReq = typeof att === "object" && att !== null ? Boolean(att.required) : true;
                          return (
                            <div
                              key={i}
                              className="flex flex-col justify-between rounded-xl border border-amber-500/20 bg-[#090f1d]/90 p-3.5 transition-all hover:border-amber-500/40"
                            >
                              <div>
                                <div className="flex items-center justify-between gap-2 mb-1.5">
                                  <span className="flex items-center gap-2 text-[12.5px] font-semibold text-slate-100">
                                    <Icon className="size-3.5 text-amber-400 shrink-0" />
                                    <span className="line-clamp-1">{name}</span>
                                  </span>
                                  <span
                                    className={`shrink-0 text-[9.5px] font-bold px-2 py-0.5 rounded ${
                                      isReq
                                        ? "bg-red-500/15 text-red-300 border border-red-500/30"
                                        : "bg-slate-700/60 text-slate-300"
                                    }`}
                                  >
                                    {isReq ? "MANDATORY" : "RECOMMENDED"}
                                  </span>
                                </div>
                                <p className="text-[11.5px] text-slate-300 leading-relaxed">
                                  {desc}
                                </p>
                              </div>
                              {fmt && (
                                <div className="mt-2.5 flex items-center gap-1.5 text-[11px] text-amber-300/90 font-mono">
                                  <span className="text-[10px] uppercase tracking-wider text-slate-400">
                                    Suggested Format:
                                  </span>
                                  <span className="rounded bg-amber-400/10 px-1.5 py-0.5">
                                    {fmt}
                                  </span>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Structured Prompt Card with Publish to Library provision */}
                  <StructuredPromptCard
                    score={turnPromptData.overall_score || msg.score || 92}
                    label={(turnPromptData.overall_score || msg.score || 92) >= 90 ? "Excellent" : "Strong"}
                    sections={turnSections}
                    rawJson={turnPromptData}
                    isPublished={Boolean(isSaved || chat.isPublished || chat.isSaved)}
                    onPublishToLibrary={onSaveToLibrary}
                    onViewAnalytics={onViewAnalytics}
                    onImprove={() =>
                      onFollowUp?.(
                        "Improve this prompt: maximize architectural determinism, add comprehensive edge cases, and eliminate all ambiguity."
                      )
                    }
                    onTest={() => {
                      alert("Feature coming soon: Direct model execution and playground is currently in development.");
                    }}
                  />
                </div>
              </div>
            );
          })}

          <div ref={messagesEndRef} />

          {/* Bottom Chat Input Bar */}
          <div className="relative mt-6 rounded-2xl border border-[#1b2742] bg-[#0c1322]/95 p-3 shadow-xl backdrop-blur-xl">
            <div className="flex items-center gap-2">
              <button
                type="button"
                title="Attach context or document"
                className="grid size-8 place-items-center rounded-lg text-slate-400 hover:bg-white/5 hover:text-slate-200 transition-colors"
              >
                <Paperclip className="size-4" />
              </button>

              <input
                type="text"
                value={followUpText}
                onChange={(e) => setFollowUpText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleFollowUpSubmit();
                  }
                }}
                placeholder="Ask a follow-up or refine the prompt (e.g. 'Add Redis caching', 'Support PostgreSQL RLS')..."
                className="flex-1 bg-transparent text-[13px] text-slate-100 placeholder:text-slate-500 outline-none"
              />

              <div className="flex items-center gap-3">
                <span className="hidden sm:inline text-[11px] text-slate-500">
                  Shift + Enter for new line
                </span>

                <button
                  type="button"
                  onClick={handleFollowUpSubmit}
                  disabled={!followUpText.trim()}
                  className="grid size-8 place-items-center rounded-xl bg-blue-600 text-white transition-all hover:bg-blue-500 active:scale-95 disabled:opacity-40"
                >
                  <ArrowUpRight className="size-4" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right Rail Panels */}
        <div className="flex flex-col space-y-4">
          <PromptDetailsPanel
            modelName={chat.model || promptData.model || "Gemini 3.5 Flash-Lite"}
            createdAt={chat.timestamp ? `Today at ${chat.timestamp}` : "Just now"}
            updatedAt="Just now"
            messagesCount={`${conversation.length} Messages in Thread`}
          />

          <UsedContextPanel
            answers={chat.answers || {}}
            questions={chat.backendQuestions || []}
            taskIntent={chat.taskIntent || chat.depthAnalysis?.task_intent || ""}
            onViewAllAnswers={() => {}}
          />

          <ResultQuickActionsPanel
            onRegenerate={() =>
              onFollowUp?.(
                "Regenerate and deepen this prompt with maximum technical depth, determinism, and defensive edge-case handling."
              )
            }
            onCreateVersion={() => {
              const vCount = (chat.versions?.length || 1) + 1;
              alert(`Created snapshot Version ${vCount} for "${chat.title}".`);
            }}
            onSaveToLibrary={onSaveToLibrary}
            onExport={onExport}
            onViewAnalytics={onViewAnalytics}
            isSaved={isSaved}
          />
        </div>
      </div>
    </div>
  );
}
