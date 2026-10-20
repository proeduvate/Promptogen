import {
  UserCog,
  Target,
  Layers,
  ListChecks,
  SlidersHorizontal,
  ShieldAlert,
  LayoutList,
  Lightbulb,
  StickyNote,
  Wand2,
  LayoutTemplate,
  GitCompare,
  PlayCircle,
  Cpu,
  Share2,
} from "lucide-react";

/* Label colour + icon per prompt section. Shared by the generated
   prompt card and the version compare panel. */
export const SECTION_STYLE = {
  role: { icon: UserCog, tone: "text-purple" },
  task: { icon: Target, tone: "text-brand" },
  context: { icon: Layers, tone: "text-cyan" },
  requirements: { icon: ListChecks, tone: "text-amber" },
  preferences: { icon: SlidersHorizontal, tone: "text-good" },
  objective: { icon: Target, tone: "text-brand" },
  constraints: { icon: ShieldAlert, tone: "text-pink" },
  output: { icon: LayoutList, tone: "text-good" },
  examples: { icon: Lightbulb, tone: "text-amber" },
  custom: { icon: StickyNote, tone: "text-muted" },
};

export const GENERATED_PROMPT = {
  slug: "focusflow-marketing-strategy",
  title: "FocusFlow marketing strategy",
  model: "GPT-4o",
  generatedAt: "Just now",
  strengthNote: "Great job! Your prompt is well-structured and optimized for high-quality outputs.",
  tip: "Use this prompt with any AI model to get high-quality results.",
  sections: [
    {
      id: "role",
      label: "SYSTEM / ROLE",
      type: "text",
      content:
        "You are an expert AI Marketing Strategist with 10+ years of experience in digital marketing, brand positioning, and growth strategy. You provide data-driven, practical, and innovative marketing strategies tailored to business goals.",
    },
    {
      id: "task",
      label: "TASK",
      type: "text",
      content:
        "Create a comprehensive marketing strategy for the product launch of a new productivity app aimed at remote professionals.",
    },
    {
      id: "context",
      label: "CONTEXT",
      type: "list",
      items: [
        { key: "Product Name", text: "FocusFlow" },
        { key: "Product Type", text: "Productivity app (task management, focus timer, analytics)" },
        { key: "Target Audience", text: "Remote professionals, freelancers, and small teams" },
        { key: "Unique Value Proposition", text: "AI-powered focus insights, minimal UI, seamless integrations" },
        { key: "Launch Timeline", text: "3 months" },
        { key: "Budget", text: "Medium" },
        { key: "Primary Goal", text: "Drive adoption and build brand awareness" },
      ],
    },
    {
      id: "requirements",
      label: "REQUIREMENTS",
      type: "numbered",
      items: [
        { text: "Market and competitor analysis" },
        { text: "Target audience personas" },
        { text: "Positioning and messaging framework" },
        { text: "Go-to-market strategy" },
        { text: "Channel and content strategy" },
        { text: "Launch campaign ideas" },
        { text: "KPI and measurement plan" },
        { text: "90-day execution roadmap" },
      ],
    },
    {
      id: "preferences",
      label: "PREFERENCES",
      type: "list",
      items: [
        { key: "Tone", text: "Professional, clear, and actionable" },
        { key: "Format", text: "Structured with headings, bullet points, and tables where relevant" },
        { key: "Language", text: "English" },
        { key: "Length", text: "Detailed but concise" },
      ],
    },
  ],
};

/* Workspace tools (spec §67). */
export const ADDITIONAL_TOOLS = [
  { id: "improve", title: "Improve with AI", body: "Optimize for a specific goal", icon: Wand2, tone: "text-purple", tint: "bg-purple/10 ring-purple/20" },
  { id: "test", title: "Test Prompt", body: "Run it against success criteria", icon: PlayCircle, tone: "text-good", tint: "bg-good/10 ring-good/20" },
  { id: "compare", title: "Compare Versions", body: "See what changed between versions", icon: GitCompare, tone: "text-amber", tint: "bg-amber/10 ring-amber/20" },
  { id: "model", title: "Optimize for Model", body: "Tune it for the model you use", icon: Cpu, tone: "text-cyan", tint: "bg-cyan/10 ring-cyan/20" },
  { id: "template", title: "Convert to Template", body: "Reuse it with variables", icon: LayoutTemplate, tone: "text-brand", tint: "bg-brand/10 ring-brand/20" },
  { id: "share", title: "Share Prompt", body: "Send a link with permissions", icon: Share2, tone: "text-pink", tint: "bg-pink/10 ring-pink/20" },
];
