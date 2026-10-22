import { useState, useMemo } from "react";
import {
  Bot,
  Paperclip,
  ArrowUpRight,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Loader2,
  RefreshCw,
} from "lucide-react";
import DynamicQuestionCard from "./DynamicQuestionCard";
import ConversationProgressPanel from "./ConversationProgressPanel";
import ExpectedOutputPanel from "./ExpectedOutputPanel";
import AIModelSelectorPanel from "./AIModelSelectorPanel";
import QuickActionsPanel from "./QuickActionsPanel";
import ErrorMessageBanner from "../common/ErrorMessageBanner";

export default function ChatClarificationView({
  chat,
  error = null,
  onRetryStart,
  onUpdateAnswers,
  onCompleteGeneration,
  onSkipQuestions,
  selectedModel = "gemini-3.5-flash-lite",
  onSelectModel,
  geminiApiKey = "",
  onGeminiApiKeyChange,
}) {
  const [followUpText, setFollowUpText] = useState("");
  const currentStep = chat.step || 1;

  // Retrieve dynamic data from backend start response
  const activeError = error || chat.error || null;
  const backendQuestions = chat.backendQuestions || [];
  const depthAnalysis = chat.depthAnalysis || chat.depth_analysis || null;
  const isSufficient = chat.isSufficient ?? depthAnalysis?.is_sufficient ?? false;
  const taskDomain = chat.taskDomain || chat.task_domain || depthAnalysis?.task_domain || "general";
  const hasDynamicQuestions = Array.isArray(backendQuestions) && backendQuestions.length > 0;
  const isAnalyzing = !activeError && !hasDynamicQuestions && !isSufficient;

  // Build steps ONLY if dynamic questions came from the AI
  const stepsMeta = useMemo(() => {
    if (!hasDynamicQuestions) {
      return [];
    }

    const totalQ = backendQuestions.length;
    // Dynamic grouping based on model question count:
    // - 1-4 questions: 1 single step (no unnecessary clicking)
    // - 5-8 questions: 2 steps
    // - 9-12 questions: 3 steps
    // - 13+ questions: 4+ steps
    let perStep = 4;
    if (totalQ <= 4) {
      perStep = totalQ;
    } else if (totalQ <= 8) {
      perStep = Math.ceil(totalQ / 2);
    } else if (totalQ <= 12) {
      perStep = Math.ceil(totalQ / 3);
    } else {
      perStep = 4;
    }

    const numSteps = Math.ceil(totalQ / perStep);
    const groups = [];
    for (let i = 0; i < backendQuestions.length; i += perStep) {
      const chunk = backendQuestions.slice(i, i + perStep);
      const stepIdx = Math.floor(i / perStep) + 1;

      const primaryCategory = chunk[0]?.category;
      let title = `Stage ${stepIdx}: Clarification`;
      if (primaryCategory) {
        title = primaryCategory
          .split("_")
          .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
          .join(" ");
      } else if (numSteps === 1) {
        title = "Targeted Clarification";
      } else if (stepIdx === 1) {
        title = "Core Requirements & Stack";
      } else if (stepIdx === 2) {
        title = "Architecture & Constraints";
      } else if (stepIdx === 3) {
        title = "Deliverables & Output Guidelines";
      } else {
        title = `Detailed Specifications (Part ${stepIdx - 3})`;
      }

      groups.push({
        title,
        description:
          numSteps === 1
            ? "Promptogen analyzed your prompt. Answer these targeted questions to eliminate ambiguity:"
            : stepIdx === 1
            ? "Promptogen identified key foundational details to clarify before generating the prompt:"
            : "Fine-tune technical details, operational constraints, and deliverable format:",
        questions: chunk,
      });
    }

    return groups;
  }, [backendQuestions, hasDynamicQuestions]);

  const totalSteps = stepsMeta.length;
  const safeStep = totalSteps > 0 ? Math.min(Math.max(currentStep, 1), totalSteps) : 1;
  const currentMeta = stepsMeta[safeStep - 1] || null;

  const handleAnswerChange = (keyOrObj, val) => {
    if (typeof keyOrObj === "object" && keyOrObj !== null) {
      onUpdateAnswers?.((prev) => ({
        ...(prev || {}),
        ...keyOrObj,
      }));
    } else {
      onUpdateAnswers?.((prev) => ({
        ...(prev || {}),
        [keyOrObj]: val,
      }));
    }
  };

  const handleNextStep = () => {
    if (safeStep < totalSteps) {
      onUpdateAnswers?.(chat.answers || {}, safeStep + 1);
    } else {
      // Completed all steps!
      onCompleteGeneration?.(chat.answers || {});
    }
  };

  const handlePrevStep = () => {
    if (safeStep > 1) {
      onUpdateAnswers?.(chat.answers || {}, safeStep - 1);
    }
  };

  const handleSelectStepFromProgress = (stepNum) => {
    if (stepNum <= totalSteps) {
      onUpdateAnswers?.(chat.answers || {}, stepNum);
    }
  };

  const domainBadgeLabel =
    taskDomain === "software_development"
      ? "Software Development"
      : taskDomain === "marketing"
      ? "Marketing & Growth"
      : taskDomain === "content_creation"
      ? "Content & Writing"
      : taskDomain === "business"
      ? "Business & Strategy"
      : taskDomain.replace(/_/g, " ").toUpperCase();

  return (
    <div className="mx-auto max-w-7xl px-6 py-6 pb-28">
      {/* 2-Column Layout: Center Chat (flex-1) + Right Panels (w-80) */}
      <div className="grid grid-cols-1 items-start gap-8 xl:grid-cols-[minmax(0,1fr)_316px]">
        {/* Center Chat Conversation Column */}
        <div className="flex flex-col space-y-6">
          {/* User Message Bubble (Right aligned) */}
          <div className="flex flex-col items-end">
            <div className="flex items-start gap-3 max-w-2xl">
              <div className="rounded-2xl rounded-tr-sm border border-[#1b2740] bg-[#0e1628] p-4 text-[13.5px] leading-relaxed text-slate-100 shadow-md">
                {chat.query || chat.fullPrompt || "New Prompt Idea"}
              </div>
              <div className="grid size-8 shrink-0 place-items-center rounded-full bg-slate-800 text-[12px] font-semibold text-white ring-1 ring-white/10">
                D
              </div>
            </div>
            <span className="mr-11 mt-1 text-[11px] text-slate-500">
              {chat.timestamp || "Just now"}
            </span>
          </div>

          {/* AI Response Block (Left aligned) */}
          <div className="flex items-start gap-3">
            <div className="grid size-8 shrink-0 place-items-center rounded-full bg-blue-600/20 text-blue-400 ring-1 ring-blue-500/30">
              <Bot className="size-4" />
            </div>

            <div className="flex-1 space-y-4 min-w-0">
              {/* Case 1: An Error occurred (e.g. Model discontinued or rate limit) */}
              {activeError && (
                <div className="space-y-3">
                  <ErrorMessageBanner
                    error={activeError}
                    onRetry={onRetryStart}
                    className="shadow-xl"
                  />
                  <div className="rounded-2xl border border-[#1b2740] bg-[#0a101d] p-4 text-[12.5px] text-slate-400">
                    <p>
                      The selected model encounterd an error while generating clarification questions.
                    </p>
                    <p className="mt-1 text-slate-300">
                      You can select a different model in the <strong>Gemini Model Engine</strong> panel on the right and click <strong>Retry</strong>.
                    </p>
                  </div>
                </div>
              )}

              {/* Case 2: Loading / Analyzing Prompt */}
              {isAnalyzing && (
                <div className="rounded-2xl border border-[#172339] bg-[#0c1322]/90 p-6 shadow-md backdrop-blur-md">
                  <div className="flex items-center gap-3">
                    <Loader2 className="size-5 text-blue-400 animate-spin" />
                    <div>
                      <h4 className="text-[14px] font-semibold text-slate-100">
                        Analyzing Prompt with {selectedModel}...
                      </h4>
                      <p className="text-[12px] text-slate-400 mt-0.5">
                        Evaluating task intent, domain depth, and dynamically framing precision questions.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Case 3: Prompt Depth & Domain Analysis (Shown only when analysis successfully arrived) */}
              {!activeError && (hasDynamicQuestions || isSufficient) && (
                <div className="rounded-2xl border border-[#172339] bg-[#0c1322]/90 p-4 shadow-md backdrop-blur-md">
                  <div className="flex flex-wrap items-center justify-between gap-2 pb-2">
                    <div className="flex items-center gap-2">
                      <Sparkles className="size-4 text-blue-400" />
                      <span className="text-[13px] font-bold text-slate-200">
                        Prompt Depth & Domain Analysis
                      </span>
                    </div>
                    <span className="rounded-full border border-blue-500/30 bg-blue-500/10 px-2.5 py-0.5 text-[11px] font-medium text-blue-300">
                      {domainBadgeLabel}
                    </span>
                  </div>

                  <p className="text-[13px] leading-relaxed text-slate-300">
                    {depthAnalysis?.task_intent
                      ? `Identified intent: "${depthAnalysis.task_intent}".`
                      : "Prompt analyzed. Here are the core specifications to clarify:"}
                  </p>

                  {/* Info present vs Info missing tags */}
                  {depthAnalysis && (
                    <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-[#172339] text-[11.5px]">
                      {depthAnalysis.info_present?.length > 0 && (
                        <div className="flex items-start gap-1.5 text-slate-300">
                          <CheckCircle2 className="size-3.5 text-emerald-400 shrink-0 mt-0.5" />
                          <div>
                            <strong className="text-emerald-400">Identified: </strong>
                            {depthAnalysis.info_present.slice(0, 3).join(", ")}
                          </div>
                        </div>
                      )}
                      {depthAnalysis.info_missing?.length > 0 && (
                        <div className="flex items-start gap-1.5 text-slate-300">
                          <AlertCircle className="size-3.5 text-amber-400 shrink-0 mt-0.5" />
                          <div>
                            <strong className="text-amber-400">Gaps to clarify: </strong>
                            {depthAnalysis.info_missing.slice(0, 3).join(", ")}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Case 4: Sufficiency Fast-Track Card if AI detected prompt has enough info */}
              {!activeError && isSufficient && (
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-emerald-500/30 bg-emerald-950/20 p-4 shadow-lg backdrop-blur-md">
                  <div className="flex items-center gap-2.5">
                    <CheckCircle2 className="size-5 text-emerald-400 shrink-0" />
                    <div>
                      <div className="text-[13px] font-bold text-emerald-300">
                        Sufficient Information Detected!
                      </div>
                      <div className="text-[12px] text-slate-300">
                        Your prompt already has enough detail. You can proceed directly to Step 2.
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => onSkipQuestions?.() || onCompleteGeneration?.(chat.answers || {})}
                    className="flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-[12.5px] font-semibold text-white shadow-md shadow-emerald-700/30 transition-all hover:bg-emerald-500"
                  >
                    <span>Proceed to Step 2</span>
                    <ArrowUpRight className="size-4" />
                  </button>
                </div>
              )}

              {/* Case 5: Interactive Dynamic Question Card - ONLY rendered if dynamic questions arrived from AI and no error */}
              {!activeError && hasDynamicQuestions && currentMeta && (
                <DynamicQuestionCard
                  currentStep={safeStep}
                  totalSteps={totalSteps}
                  stepTitle={currentMeta.title}
                  stepDescription={currentMeta.description}
                  questions={currentMeta.questions}
                  answers={chat.answers || {}}
                  onAnswerChange={handleAnswerChange}
                  onNextStep={handleNextStep}
                  onPrevStep={handlePrevStep}
                  onSkipToStep2={() => onSkipQuestions?.() || onCompleteGeneration?.(chat.answers || {})}
                  isLastStep={safeStep === totalSteps}
                  isSubmitting={chat.isSubmitting}
                  isSufficient={isSufficient}
                />
              )}
            </div>
          </div>

          {/* Bottom Chat Input Bar for follow-up notes */}
          <div className="relative mt-4 rounded-2xl border border-[#1b2742] bg-[#0c1322]/95 p-3 shadow-lg backdrop-blur-xl">
            <div className="flex items-center gap-2">
              <button
                type="button"
                title="Attach document or context"
                className="grid size-8 place-items-center rounded-lg text-slate-400 hover:bg-white/5 hover:text-slate-200 transition-colors"
              >
                <Paperclip className="size-4" />
              </button>

              <input
                type="text"
                value={followUpText}
                onChange={(e) => setFollowUpText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey && followUpText.trim()) {
                    e.preventDefault();
                    handleAnswerChange("additional_context", followUpText);
                    setFollowUpText("");
                  }
                }}
                placeholder="Add extra constraints, code snippets, or error messages..."
                className="flex-1 bg-transparent text-[13px] text-slate-100 placeholder:text-slate-500 outline-none"
              />

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    if (followUpText.trim()) {
                      handleAnswerChange("additional_context", followUpText);
                      setFollowUpText("");
                    }
                  }}
                  disabled={!followUpText.trim()}
                  className="grid size-8 place-items-center rounded-xl bg-blue-600 text-white transition-all hover:bg-blue-500 disabled:opacity-40"
                >
                  <ArrowUpRight className="size-4" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right Rail Panels */}
        <div className="flex flex-col space-y-4">
          {/* Conversation Progress - ONLY rendered when actual AI questions exist and no error */}
          {!activeError && hasDynamicQuestions && totalSteps > 0 && (
            <ConversationProgressPanel
              currentStep={safeStep}
              totalSteps={totalSteps}
              steps={stepsMeta.map((s) => s.title)}
              onSelectStep={handleSelectStepFromProgress}
            />
          )}

          <AIModelSelectorPanel
            selectedModel={selectedModel}
            onSelectModel={onSelectModel}
            apiKey={geminiApiKey}
            onApiKeyChange={onGeminiApiKeyChange}
          />

          <ExpectedOutputPanel />

          <QuickActionsPanel
            onSkipQuestions={() => onSkipQuestions?.() || onCompleteGeneration?.(chat.answers || {})}
            onUseTemplate={() => {
              if (taskDomain === "software_development") {
                onUpdateAnswers?.({
                  programming_language: "TypeScript",
                  framework: "Next.js 14 App Router",
                  database: "PostgreSQL with Prisma ORM",
                  runtime_environment: "Node.js 20 LTS",
                  test_coverage: "Vitest with Jest DOM",
                });
              } else {
                onUpdateAnswers?.({
                  target_audience: "B2B SaaS Founders & Product Managers",
                  channels: ["Organic Social (LinkedIn & X)", "Content Marketing / SEO"],
                  campaign_objective: "User Acquisition & Signups",
                  brand_voice: "Authoritative & Technical",
                  budget: "$1,500/month",
                });
              }
            }}
            onAddContext={() => {
              handleAnswerChange("context_profile", "Production enterprise system, high throughput requirement");
            }}
          />
        </div>
      </div>
    </div>
  );
}
