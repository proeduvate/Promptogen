import { useState } from "react";
import { Copy, FileText, FileDown, FileJson, FolderOpen, LayoutTemplate } from "lucide-react";
import PageShell from "../components/PageShell";
import StrengthPanel from "../components/StrengthPanel";
import ResultToolbar from "../components/prompt/ResultToolbar";
import GeneratedPromptCard from "../components/prompt/GeneratedPromptCard";
import AdditionalTools from "../components/prompt/AdditionalTools";
import RecentPromptsCard from "../components/prompt/RecentPromptsCard";
import { GENERATED_PROMPT } from "../data/generated";
import { copyText, downloadFile, promptToMarkdown, promptToText } from "../lib/promptText";

export default function GeneratedPromptPage({
  chrome,
  onBack,
  onNewPrompt,
  onViewAnalytics,
  onOpenLibrary,
}) {
  const { slug, model, generatedAt, strengthNote, tip } = GENERATED_PROMPT;
  const [sections, setSections] = useState(GENERATED_PROMPT.sections);
  const [saved, setSaved] = useState(false);
  const [favorite, setFavorite] = useState(false);

  // Hand-off point for the AI tools. "Compare" already has a screen:
  // version compare lives in My Prompts.
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

  return (
    <PageShell
      chrome={chrome}
      header={
        <ResultToolbar
          model={model}
          generatedAt={generatedAt}
          saved={saved}
          favorite={favorite}
          exportItems={exportItems}
          onBack={onBack}
          onToggleSave={() => setSaved((value) => !value)}
          onToggleFavorite={() => setFavorite((value) => !value)}
          onNewPrompt={onNewPrompt}
        />
      }
    >
      {/* Same grid as the Home dashboard: main column + 312px rail */}
      <div className="grid grid-cols-1 items-start gap-5 xl:grid-cols-[minmax(0,1fr)_312px]">
        <GeneratedPromptCard
          sections={sections}
          onChange={setSections}
          tip={tip}
          moreItems={moreItems}
          onRegenerate={() => handleTool("regenerate")}
          onImprove={() => handleTool("improve")}
        />
        <StrengthPanel title="Prompt Strength" note={strengthNote} onViewAnalytics={onViewAnalytics} />
        <AdditionalTools onSelect={handleTool} />
        <RecentPromptsCard onOpen={onOpenLibrary} />
      </div>
    </PageShell>
  );
}
