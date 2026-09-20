import {
  UserCog,
  Target,
  Layers,
  ListChecks,
  SlidersHorizontal,
  Wand2,
  LayoutTemplate,
  GitCompare,
  PlayCircle,
} from "lucide-react";

/* Label colour + icon per prompt section. Shared by the generated
   prompt card and the version compare panel. */
export const SECTION_STYLE = {
  role: { icon: UserCog, tone: "text-purple" },
  task: { icon: Target, tone: "text-brand" },
  context: { icon: Layers, tone: "text-cyan" },
  requirements: { icon: ListChecks, tone: "text-amber" },
  preferences: { icon: SlidersHorizontal, tone: "text-good" },
};

export const GENERATED_PROMPT = {
  slug: "focusflow-marketing-strategy",
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

export const ADDITIONAL_TOOLS = [
  {
    id: "improve",
    title: "Improve with AI",
    body: "Enhance clarity, detail & impact",
    icon: Wand2,
    tone: "text-purple",
    tint: "bg-purple/10 ring-purple/20",
  },
  {
    id: "template",
    title: "Convert to Template",
    body: "Use as a reusable template",
    icon: LayoutTemplate,
    tone: "text-brand",
    tint: "bg-brand/10 ring-brand/20",
  },
  {
    id: "compare",
    title: "Compare Prompts",
    body: "Compare with another prompt",
    icon: GitCompare,
    tone: "text-amber",
    tint: "bg-amber/10 ring-amber/20",
  },
  {
    id: "test",
    title: "Test Prompt",
    body: "Run & preview with AI model",
    icon: PlayCircle,
    tone: "text-good",
    tint: "bg-good/10 ring-good/20",
  },
];

export const RECENT_PROMPTS = [
  {
    id: "saas-marketing",
    title: "Marketing strategy for SaaS product",
    when: "Generated 2h ago",
    score: 80,
  },
];
