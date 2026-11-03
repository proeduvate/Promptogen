import { useMemo } from "react";
import PromptComposer from "../components/PromptComposer";
import ExampleCards from "../components/ExampleCards";
import PromptStrengthOverview from "../components/PromptStrengthOverview";
import AmbientWaves from "../components/AmbientWaves";

export default function HomePage({
  idea,
  onIdeaChange,
  onSubmitIdea,
  isGenerating,
  strengthData,
  onViewAnalytics,
  onViewAllExamples,
  selectedModel = "gemini-2.5-flash",
  onSelectModel,
  chats = [],
  user = null,
  rateLimitStatus = null,
  onNavigateLogin = null,
}) {
  // Extract previous generated prompt from chats (new user has 0 completed prompts -> null)
  const previousPrompt = useMemo(() => {
    if (!chats || chats.length === 0) return null;
    const completed = chats
      .flatMap((g) => g.items || [])
      .filter((item) => (item.isComplete || item.score != null) && item.score != null);
    return completed[0] || null;
  }, [chats]);

  const currentStrength = useMemo(() => {
    if (strengthData) return strengthData;
    if (!previousPrompt) return null; // New user with no prompt generated yet -> null

    const score = previousPrompt.score ?? 85;
    const label =
      score >= 90
        ? "Excellent"
        : score >= 80
        ? "Strong"
        : score >= 70
        ? "Good"
        : "Moderate";

    return {
      score,
      label,
      note: previousPrompt.title
        ? `Score from: "${previousPrompt.title}"`
        : "Quality calculated based on your previous generated prompt.",
      metrics: previousPrompt.metrics || {
        clarity: score,
        specificity: score,
        context: Math.max(70, score - 5),
        structure: score,
        actionability: score,
      },
    };
  }, [strengthData, previousPrompt]);

  return (
    <div className="relative min-h-[calc(100vh-80px)] px-6 pb-24 pt-2">
      {/* Background ambient waves */}
      <AmbientWaves />

      {/* Main Grid: Left/Center Hero & Examples (flex-1), Right Rail: Prompt Strength Overview */}
      <div className="relative z-10 mx-auto max-w-7xl grid grid-cols-1 items-start gap-8 xl:grid-cols-[minmax(0,1fr)_310px]">
        {/* Left / Center Column */}
        <div className="flex flex-col">
          {/* Guest Status Banner */}
          {!user && rateLimitStatus && (
            <div className="mb-4 flex items-center justify-between px-4 py-2.5 rounded-2xl bg-[#0c1322]/90 border border-[#1b2740] backdrop-blur-sm text-xs animate-in fade-in">
              <div className="flex items-center gap-2 text-slate-300">
                <span className={`size-2 rounded-full ${rateLimitStatus.locked ? "bg-amber-400" : "bg-blue-400"} animate-pulse`} />
                <span>
                  Guest Session:{" "}
                  <strong className={rateLimitStatus.locked ? "text-amber-400 font-semibold" : "text-white font-semibold"}>
                    {rateLimitStatus.used}/{rateLimitStatus.limit || 2} prompts used today
                  </strong>
                  {rateLimitStatus.locked ? " (Limit Reached)" : ""}
                </span>
              </div>
              <button
                type="button"
                onClick={onNavigateLogin}
                className="text-blue-400 hover:text-blue-300 font-semibold hover:underline flex items-center gap-1 transition-colors"
              >
                <span>Sign in for unlimited</span>
                <span>→</span>
              </button>
            </div>
          )}

          <PromptComposer
            value={idea}
            onChange={onIdeaChange}
            onSubmit={(val, attachment) => onSubmitIdea(val || idea, attachment)}
            isGenerating={isGenerating}
            selectedModel={selectedModel}
            onSelectModel={onSelectModel}
          />

          <ExampleCards
            onSelectExample={(text) => {
              onIdeaChange(text);
              requestAnimationFrame(() => {
                document.getElementById("pg-prompt-input")?.focus();
              });
            }}
            onViewAll={onViewAllExamples || onViewAnalytics}
          />
        </div>

        {/* Right Rail: Prompt Strength Overview */}
        <div className="w-full xl:pt-14">
          <PromptStrengthOverview
            score={currentStrength?.score ?? null}
            label={currentStrength?.label ?? null}
            metrics={currentStrength?.metrics ?? null}
            note={currentStrength?.note ?? null}
            onViewAnalytics={onViewAnalytics}
          />
        </div>
      </div>
    </div>
  );
}
