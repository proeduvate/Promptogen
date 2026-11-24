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
import PromptQualityPanel from "./PromptQualityPanel";
import { normalizeQualityAssessment } from "../../lib/promptQualityContract";

const NON_PROMPT_TYPES = ["loading", "clarification", "error"];
const isPromptMessage = (msg) => msg && msg.role !== "user" && !NON_PROMPT_TYPES.includes(msg.type);

export default function ChatResultView({
  chat,
  onFollowUp,
  onRegenerate,
  onCreateVersion,
  onSaveToLibrary,
  onExport,
  onViewAnalytics,
  isSaved,
  isGenerating = false,
  // Prompt quality breakdown
  onReassessPrompt,
  onImproveWithSuggestions,
}) {
  const [followUpText, setFollowUpText] = useState("");
  const [inlineAnswers, setInlineAnswers] = useState({});
  const [followUpAttachment, setFollowUpAttachment] = useState(null);
  const followUpFileInputRef = useRef(null);
  const messagesEndRef = useRef(null);

  const isCurrentlyGenerating = Boolean(isGenerating || chat?.isSubmitting);
  const promptData = chat?.generatedPromptData || {};

  // Build the conversation history from chat.conversation or generate the baseline
  let conversation =
    chat?.conversation && chat.conversation.length > 0
      ? [...chat.conversation]
      : [];

  const userInitialMsg = {
    id: "msg_u_init",
    role: "user",
    text: chat?.query || "Create a structured prompt",
    timestamp: chat?.timestamp || "Just now",
    attachment: chat?.attachment,
  };

  if (conversation.length === 0) {
    if (isCurrentlyGenerating) {
      conversation = [
        userInitialMsg,
        {
          id: "msg_generating_loader",
          role: "assistant",
          type: "loading",
          message:
            chat?.status ||
            "Synthesizing final adaptive prompt...",
          timestamp: "Just now",
        },
      ];
    } else {
      conversation = [
        userInitialMsg,
        {
          id: "msg_p_1",
          role: "assistant",
          type: "prompt",
          version: 1,
          versionLabel: "v1: Initial Synthesis",
          title: chat?.title || "Optimized Prompt",
          promptData: promptData,
          score: promptData.overall_score ?? null,
          timestamp: chat?.timestamp || "Just now",
        },
      ];
    }
  } else if (isCurrentlyGenerating && !conversation.some((m) => m.type === "loading")) {
    conversation.push({
      id: "msg_generating_loader",
      role: "assistant",
      type: "loading",
      message:
        chat?.status ||
        "Synthesizing final adaptive prompt...",
      timestamp: "Just now",
    });
  }

  const prevCountRef = useRef(conversation.length);

  // ── Prompt quality breakdown: one assessment per prompt version ──
  const qualityPanelRef = useRef(null);
  const promptMessages = conversation.filter(isPromptMessage);
  const latestPromptMsg = promptMessages[promptMessages.length - 1] || null;
  const [selectedPromptId, setSelectedPromptId] = useState(null);
  const [qualityRequest, setQualityRequest] = useState(null); // { messageId, status, error }
  const qualityRequestSeq = useRef(0);

  // A new version (regenerate / improve / follow-up) or another chat shows the latest assessment.
  useEffect(() => {
    setSelectedPromptId(null);
  }, [latestPromptMsg?.id, chat?.id]);
  useEffect(() => {
    qualityRequestSeq.current += 1;
    setQualityRequest(null);
  }, [chat?.id]);

  const selectedPromptMsg =
    promptMessages.find((m) => m.id === selectedPromptId) || latestPromptMsg;
  const assessmentFor = (msg) =>
    normalizeQualityAssessment(
      chat?.qualityAssessments?.[msg?.id] ?? msg?.promptData ?? chat?.generatedPromptData
    );
  const selectedAssessment = selectedPromptMsg ? assessmentFor(selectedPromptMsg) : null;
  const selectedRequest =
    qualityRequest && selectedPromptMsg && qualityRequest.messageId === selectedPromptMsg.id
      ? qualityRequest
      : null;
  const qualityStatus =
    selectedRequest?.status ||
    (!selectedPromptMsg && isCurrentlyGenerating ? "loading" : "ready");

  const showQualityFor = (msg) => {
    setSelectedPromptId(msg.id);
    const panel = qualityPanelRef.current;
    if (panel) {
      panel.scrollIntoView?.({ behavior: "smooth", block: "start" });
      panel.focus?.({ preventScroll: true });
    }
  };

  const handleReassess = async () => {
    const msg = selectedPromptMsg;
    if (!msg || !onReassessPrompt) return;
    qualityRequestSeq.current += 1;
    const seq = qualityRequestSeq.current;
    setQualityRequest({ messageId: msg.id, status: "loading", error: null });
    try {
      await onReassessPrompt(msg, { isLatest: msg.id === latestPromptMsg?.id });
      if (seq === qualityRequestSeq.current) setQualityRequest(null);
    } catch (err) {
      if (seq === qualityRequestSeq.current) {
        setQualityRequest({
          messageId: msg.id,
          status: "error",
          error: err?.message || "The quality assessment could not be completed.",
        });
      }
    }
  };

  // Auto-scroll to latest message ONLY when a new message is appended during active chat or generating starts
  useEffect(() => {
    // Only scroll if a new message was added after initial mount or when generating
    if (conversation.length > prevCountRef.current || isCurrentlyGenerating) {
      // Guard: do not scroll if the view is in an exiting transition state or hidden
      if (
        !messagesEndRef.current ||
        messagesEndRef.current.closest("[data-exiting='true']") ||
        messagesEndRef.current.closest(".pointer-events-none")
      ) {
        prevCountRef.current = conversation.length;
        return;
      }

      const scrollContainer = messagesEndRef.current.closest("main") || messagesEndRef.current.closest(".overflow-y-auto");
      if (scrollContainer && typeof scrollContainer.scrollTo === "function") {
        scrollContainer.scrollTo({
          top: scrollContainer.scrollHeight,
          behavior: "smooth",
        });
      }
    }
    prevCountRef.current = conversation.length;
  }, [conversation.length, isCurrentlyGenerating]);

  const handleFollowUpSubmit = () => {
  if (!followUpText.trim()) return;

  onFollowUp?.(followUpText.trim(), followUpAttachment);

  setFollowUpText("");
  setFollowUpAttachment(null);
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
    if (t.includes("schema") || t.includes("sql") || t.includes("db"))
      return Database;
    if (
      t.includes("image") ||
      t.includes("screenshot") ||
      t.includes("wireframe") ||
      t.includes("mockup")
    )
      return Image;
    if (t.includes("data") || t.includes("csv") || t.includes("excel"))
      return FileSpreadsheet;
    if (
      t.includes("code") ||
      t.includes("json") ||
      t.includes("yaml") ||
      t.includes("config")
    )
      return FileCode;
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
                <div
                  key={msg.id || idx}
                  className="flex items-start gap-3"
                >
                  <div className="relative grid size-8 shrink-0 place-items-center rounded-full bg-blue-600/20 text-blue-400 ring-1 ring-blue-500/30">
                    <Bot className="size-4" />
                    <span className="absolute -bottom-0.5 -right-0.5 size-2 rounded-full bg-blue-400 animate-ping" />
                  </div>
                  <div className="flex-1 max-w-2xl rounded-2xl border border-blue-500/30 bg-[#091224]/90 p-4 shadow-lg backdrop-blur-md">
                    <div className="flex items-center justify-between gap-3 pb-2 border-b border-[#172339]">
                      <div className="flex items-center gap-2">
                        <Loader2 className="size-4 animate-spin text-blue-400" />
                        <span className="text-[13.5px] font-semibold text-slate-100">
                          {msg.message || "Synthesizing final adaptive prompt..."}
                        </span>
                      </div>
                      {/* Typing indicator dots */}
                      <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400">
                        <span className="size-1.5 rounded-full bg-blue-400 animate-bounce [animation-delay:-0.3s]" />
                        <span className="size-1.5 rounded-full bg-blue-400 animate-bounce [animation-delay:-0.15s]" />
                        <span className="size-1.5 rounded-full bg-blue-400 animate-bounce" />
                      </div>
                    </div>
                    <p className="mt-2.5 text-[12.5px] leading-relaxed text-slate-400">
                      Packaging task context, dynamic requirements, edge cases, and input assets with {chat?.model || "AI Model"}. The generated prompt will appear here once synthesis is complete.
                    </p>
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
                      <span>
                        {msg.reasoning ||
                          "To accurately adapt this prompt, please clarify these details:"}
                      </span>
                    </div>

                    <div className="space-y-4 pt-2">
                      {(msg.questions || []).map((q, qIdx) => (
                        <div key={q.id || qIdx} className="space-y-2">
                          <label className="text-[12.5px] font-medium text-slate-200">
                            {q.question}
                          </label>
                          <div className="flex flex-wrap gap-2">
                            {(q.options || []).map((opt, oIdx) => {
                              const isSelected =
                                (inlineAnswers[q.id] || q.options[0]) === opt;
                              return (
                                <button
                                  key={oIdx}
                                  type="button"
                                  disabled={isCurrentlyGenerating}
                                  onClick={() =>
                                    handleInlineAnswerSelect(q.id, opt)
                                  }
                                  className={`rounded-xl px-3 py-1.5 text-[12px] font-medium transition-all ${
                                    isSelected
                                      ? "bg-blue-600 text-white shadow-md shadow-blue-600/30"
                                      : "border border-[#1b2740] bg-[#0c1426] text-slate-300 hover:border-slate-500"
                                  } ${isCurrentlyGenerating ? "opacity-50 cursor-not-allowed" : ""}`}
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
                      disabled={isCurrentlyGenerating}
                      onClick={() => handleInlineClarificationSubmit(msg)}
                      className="mt-3 flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-[12.5px] font-semibold text-white shadow-md transition-all hover:bg-blue-500 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
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
                    <p className="font-semibold text-red-300">
                      Prompt refinement issue
                    </p>
                    <p className="mt-1 text-slate-300">{msg.error}</p>
                  </div>
                </div>
              );
            }

            // ── 5. Assistant Structured Prompt Turn ──
            const turnPromptData =
              msg.promptData || chat.generatedPromptData || {};
            const turnSections = turnPromptData.sections || [];
            const turnAttachments = (
              turnPromptData.required_attachments || []
            ).filter(Boolean);
            const turnAssessment = assessmentFor(msg);

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
                        {msg.versionLabel ||
                          `Version ${msg.version || idx + 1}`}
                      </span>
                      <span className="text-[13px] text-slate-300 font-medium">
                        {msg.version && msg.version > 1
                          ? "Refined Structured Prompt"
                          : "Task-Adaptive Prompt"}
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
                              {turnAttachments.length}{" "}
                              {turnAttachments.length === 1
                                ? "Asset"
                                : "Assets"}{" "}
                              To Attach
                            </span>
                          </div>
                          <p className="text-[12px] text-slate-300 mt-1 leading-relaxed">
                            To execute this prompt with complete accuracy,
                            attach or paste these context files when submitting
                            this prompt to ChatGPT, Claude, or Gemini:
                          </p>
                        </div>
                      </div>

                      <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                        {turnAttachments.map((att, i) => {
                          const Icon = getAttachmentIcon(att?.type);
                          const name =
                            typeof att === "string"
                              ? att
                              : att?.name || "Asset";
                          const desc =
                            typeof att === "object" && att !== null
                              ? typeof att.description === "object"
                                ? JSON.stringify(att.description)
                                : att.description || ""
                              : "";
                          const fmt =
                            typeof att === "object" && att !== null
                              ? typeof att.format_recommendation === "object"
                                ? JSON.stringify(att.format_recommendation)
                                : att.format_recommendation || ""
                              : "";
                          const isReq =
                            typeof att === "object" && att !== null
                              ? Boolean(att.required)
                              : true;
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
                    score={turnAssessment.overallScore}
                    label={turnAssessment.classificationLabel}
                    onViewStrength={() => showQualityFor(msg)}
                    sections={turnSections}
                    rawJson={turnPromptData}
                    isPublished={Boolean(
                      isSaved || chat.isPublished || chat.isSaved,
                    )}
                    onPublishToLibrary={onSaveToLibrary}
                    onViewAnalytics={onViewAnalytics}
                    onImprove={() =>
                      onFollowUp?.(
                        "Improve this prompt: maximize architectural determinism, add comprehensive edge cases, and eliminate all ambiguity.",
                      )
                    }
                    onTest={() => {
                      alert(
                        "Feature coming soon: Direct model execution and playground is currently in development.",
                      );
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
              <input
                type="file"
                ref={followUpFileInputRef}
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    setFollowUpAttachment(file);
                  }
                  e.target.value = "";
                }}
              />

              <button
                type="button"
                title={isCurrentlyGenerating ? "Prompt generation in progress" : "Attach context or document"}
                disabled={isCurrentlyGenerating}
                onClick={() => followUpFileInputRef.current?.click()}
                className="grid size-8 place-items-center rounded-lg text-slate-400 hover:bg-white/5 hover:text-slate-200 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Paperclip className="size-4" />
              </button>

              <input
                type="text"
                value={followUpText}
                disabled={isCurrentlyGenerating}
                onChange={(e) => setFollowUpText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey && !isCurrentlyGenerating) {
                    e.preventDefault();
                    handleFollowUpSubmit();
                  }
                }}
                placeholder={
                  isCurrentlyGenerating
                    ? "Synthesizing prompt, please wait..."
                    : "Ask a follow-up or refine the prompt (e.g. 'Add Redis caching', 'Support PostgreSQL RLS')..."
                }
                className={`flex-1 bg-transparent text-[13px] text-slate-100 placeholder:text-slate-500 outline-none ${
                  isCurrentlyGenerating ? "cursor-not-allowed opacity-60" : ""
                }`}
              />

              <div className="flex items-center gap-3">
                <span className="hidden sm:inline text-[11px] text-slate-500">
                  {isCurrentlyGenerating ? "Generating..." : "Shift + Enter for new line"}
                </span>

                <button
                  type="button"
                  onClick={handleFollowUpSubmit}
                  disabled={isCurrentlyGenerating || !followUpText.trim()}
                  className="grid size-8 place-items-center rounded-xl bg-blue-600 text-white transition-all hover:bg-blue-500 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {isCurrentlyGenerating ? (
                    <Loader2 className="size-4 animate-spin text-white" />
                  ) : (
                    <ArrowUpRight className="size-4" />
                  )}
                </button>
              </div>
               
            </div>
         

{followUpAttachment && (
  <div className="mt-2 flex items-center gap-2 rounded-xl border border-blue-500/30 bg-blue-500/10 px-3 py-2 text-xs text-blue-200 w-fit">
    <Paperclip className="size-3.5 shrink-0" />
    <span className="max-w-[220px] truncate">
      {followUpAttachment.name}
    </span>
    <button
      type="button"
      disabled={isCurrentlyGenerating}
      onClick={() => setFollowUpAttachment(null)}
      className="ml-1 text-slate-400 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed"
      title="Remove attachment"
    >
      ×
    </button>
  </div>
)}


          </div>
        </div>

        {/* Right Rail Panels */}
        <div className="flex flex-col space-y-4">
          {(selectedPromptMsg || isCurrentlyGenerating) && (
            <PromptQualityPanel
              ref={qualityPanelRef}
              assessment={selectedAssessment}
              status={qualityStatus}
              error={selectedRequest?.error || null}
              versionLabel={
                selectedPromptMsg
                  ? selectedPromptMsg.versionLabel ||
                    (selectedPromptMsg.version ? `Version ${selectedPromptMsg.version}` : null)
                  : null
              }
              isLatestVersion={!selectedPromptMsg || selectedPromptMsg.id === latestPromptMsg?.id}
              onShowLatest={() => setSelectedPromptId(null)}
              onReassess={selectedPromptMsg && onReassessPrompt ? handleReassess : undefined}
              onImprove={
                selectedPromptMsg && onImproveWithSuggestions
                  ? () => onImproveWithSuggestions(selectedAssessment)
                  : undefined
              }
              disabled={isCurrentlyGenerating}
            />
          )}

          <PromptDetailsPanel
            modelName={
              chat.model || promptData.model || "Gemini 3.5 Flash-Lite"
            }
            createdAt={
              chat.timestamp ? `Today at ${chat.timestamp}` : "Just now"
            }
            updatedAt="Just now"
            messagesCount={`${conversation.length} Messages in Thread`}
          />

          <UsedContextPanel
            answers={chat.answers || {}}
            questions={chat.backendQuestions || []}
            taskIntent={
              chat.taskIntent || chat.depthAnalysis?.task_intent || ""
            }
            onViewAllAnswers={() => {}}
          />

          <ResultQuickActionsPanel
            disabled={isCurrentlyGenerating}
            onRegenerate={() =>
              onFollowUp?.(
                "Regenerate and deepen this prompt with maximum technical depth, determinism, and defensive edge-case handling.",
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
