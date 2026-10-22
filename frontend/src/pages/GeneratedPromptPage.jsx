import { useState, useEffect } from "react";
import { Copy, FileText, FileDown, FileJson, FolderOpen, LayoutTemplate } from "lucide-react";
import PageShell from "../components/PageShell";
import StrengthPanel from "../components/StrengthPanel";
import ResultToolbar from "../components/prompt/ResultToolbar";
import GeneratedPromptCard from "../components/prompt/GeneratedPromptCard";
import AdditionalTools from "../components/prompt/AdditionalTools";
import RecentPromptsCard from "../components/prompt/RecentPromptsCard";
import { GENERATED_PROMPT } from "../data/generated";
import { copyText, downloadFile, promptToMarkdown, promptToText } from "../lib/promptText";
import { saveLibraryPrompt, toggleFavoritePrompt } from "../lib/api";

export default function GeneratedPromptPage({
  chrome,
  data = null,
  onBack,
  onNewPrompt,
  onViewAnalytics,
  onOpenLibrary,
}) {
  const currentPrompt = data || GENERATED_PROMPT;
  const slug = currentPrompt.slug || currentPrompt.prompt_title?.toLowerCase().replace(/\s+/g, "-") || "generated-prompt";
  const model = currentPrompt.model || "GPT-4o";
  const generatedAt = currentPrompt.generatedAt || "Just now";
  const tip = currentPrompt.tip || "Use this prompt with any AI model to get high-quality results.";
  const title = currentPrompt.prompt_title || currentPrompt.title || "Generated Prompt";

  const [sections, setSections] = useState(currentPrompt.sections || GENERATED_PROMPT.sections);
  const [savedId, setSavedId] = useState(currentPrompt.id || null);
  const [saved, setSaved] = useState(Boolean(currentPrompt.id));
  const [favorite, setFavorite] = useState(Boolean(currentPrompt.favorite));
  const [saveStatus, setSaveStatus] = useState("");

  useEffect(() => {
    if (data?.sections) {
      setSections(data.sections);
    }
  }, [data]);

  const handleToggleSave = async () => {
    if (saved) return;
    try {
      setSaveStatus("Saving...");
      const savedRes = await saveLibraryPrompt({
        title,
        model,
        folder: "marketing",
        tags: ["AI", "Generated"],
        score: currentPrompt.overall_score || 85,
        sections,
      });
      setSavedId(savedRes.id);
      setSaved(true);
      setSaveStatus("Saved to My Prompts");
      setTimeout(() => setSaveStatus(""), 3000);
    } catch (err) {
      console.warn("Failed to save prompt:", err.message);
      setSaved(true); // local fallback
    }
  };

  const handleToggleFavorite = async () => {
    const next = !favorite;
    setFavorite(next);
    if (savedId) {
      try {
        await toggleFavoritePrompt(savedId);
      } catch (err) {
        console.warn("Failed to toggle favorite:", err.message);
      }
    }
  };

  const handleTool = (toolId) => {
    if (toolId === "compare") {
      onOpenLibrary();
      return;
    }
    console.log("Prompt tool", toolId, sections);
  };

  const copyMarkdown = {
    id: "copy-md",
    label: "Copy as Markdown",
    icon: Copy,
    onSelect: () => copyText(promptToMarkdown(sections)),
  };

  const exportItems = [
    copyMarkdown,
    {
      id: "txt",
      label: "Download .txt",
      icon: FileText,
      onSelect: () => downloadFile(`${slug}.txt`, promptToText(sections)),
    },
    {
      id: "md",
      label: "Download .md",
      icon: FileDown,
      onSelect: () => downloadFile(`${slug}.md`, promptToMarkdown(sections), "text/markdown"),
    },
    {
      id: "json",
      label: "Download .json",
      icon: FileJson,
      onSelect: () =>
        downloadFile(`${slug}.json`, JSON.stringify({ model, sections }, null, 2), "application/json"),
    },
  ];

  const moreItems = [
    copyMarkdown,
    { id: "template", label: "Convert to Template", icon: LayoutTemplate, onSelect: () => handleTool("template") },
    { id: "library", label: "Open My Prompts", icon: FolderOpen, onSelect: onOpenLibrary },
  ];

  const overallScore = currentPrompt.overall_score || currentPrompt.score || 85;
  const strengthData = {
    score: overallScore,
    label: overallScore >= 80 ? "Strong" : overallScore >= 60 ? "Good" : "Needs Work",
    note: currentPrompt.strengthNote || "Great job! Your prompt is well-structured and optimized.",
    metrics: [
      { id: "clarity", label: "Clarity", value: currentPrompt.clarity || 90 },
      { id: "specificity", label: "Specificity", value: currentPrompt.specificity || 85 },
      { id: "context", label: "Context", value: currentPrompt.context || 80 },
      { id: "structure", label: "Structure", value: currentPrompt.structure || 85 },
      { id: "actionability", label: "Actionability", value: currentPrompt.actionability || 90 },
    ],
  };

  return (
    <PageShell
      chrome={chrome}
      header={
        <div className="flex flex-col gap-2">
          <ResultToolbar
            model={model}
            generatedAt={generatedAt}
            saved={saved}
            favorite={favorite}
            exportItems={exportItems}
            onBack={onBack}
            onToggleSave={handleToggleSave}
            onToggleFavorite={handleToggleFavorite}
            onNewPrompt={onNewPrompt}
          />
          {saveStatus && (
            <div className="self-end rounded-md bg-good/15 px-3 py-1 text-[12px] font-medium text-good">
              {saveStatus}
            </div>
          )}
        </div>
      }
    >
      <div className="grid grid-cols-1 items-start gap-5 xl:grid-cols-[minmax(0,1fr)_312px]">
        <GeneratedPromptCard
          sections={sections}
          onChange={setSections}
          tip={tip}
          moreItems={moreItems}
          onRegenerate={() => handleTool("regenerate")}
          onImprove={() => handleTool("improve")}
        />
        <StrengthPanel
          title="Prompt Strength"
          strength={strengthData}
          note={strengthData.note}
          onViewAnalytics={onViewAnalytics}
        />
        <AdditionalTools onSelect={handleTool} />
        <RecentPromptsCard onOpen={onOpenLibrary} />
      </div>
    </PageShell>
  );
}
