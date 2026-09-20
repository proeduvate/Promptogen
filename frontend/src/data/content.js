import {
  Home,
  LineChart,
  FileText,
  BarChart3,
  History,
  Heart,
  Settings,
  HelpCircle,
  Code2,
  PenLine,
  Package,
  GraduationCap,
  Compass,
  TrendingUp,
  Folder,
  Lightbulb,
  ListOrdered,
  PenTool,
  LayoutGrid,
} from "lucide-react";

/* Sidebar navigation. `id` is what App tracks as the active route. */
export const NAV_ITEMS = [
  { id: "home", label: "Home", icon: Home },
  { id: "my-prompts", label: "My Prompts", icon: LineChart },
  { id: "templates", label: "Templates", icon: FileText },
  { id: "analytics", label: "Analytics", icon: BarChart3 },
  { id: "history", label: "History", icon: History },
  { id: "favorites", label: "Favorites", icon: Heart },
  { id: "settings", label: "Settings", icon: Settings },
  { id: "guide", label: "Guide & Help", icon: HelpCircle },
];

/* Quick-start chips under the hero input. `seed` is dropped straight
   into the textarea when the chip is clicked. */
export const EXAMPLE_CHIPS = [
  {
    id: "marketing",
    label: "Marketing Campaign",
    icon: FileText,
    tone: "text-brand",
    seed: "Write a prompt for an AI to create a full marketing campaign for a new product launch.",
  },
  {
    id: "code",
    label: "Code Generator",
    icon: Code2,
    tone: "text-cyan",
    seed: "Write a prompt for an AI to generate production-ready code from a feature description.",
  },
  {
    id: "blog",
    label: "Blog Writer",
    icon: PenLine,
    tone: "text-purple",
    seed: "Write a prompt for an AI to draft a long-form blog post with an SEO-friendly structure.",
  },
  {
    id: "product",
    label: "Product Description",
    icon: Package,
    tone: "text-amber",
    seed: "Write a prompt for an AI to write persuasive e-commerce product descriptions.",
  },
  {
    id: "lesson",
    label: "Lesson Plan",
    icon: GraduationCap,
    tone: "text-good",
    seed: "Write a prompt for an AI to build a lesson plan with objectives, activities and assessment.",
  },
];

export const FEATURE_CARDS = [
  {
    id: "smart-questions",
    title: "Smart Questions",
    body: "Our AI asks the right questions to understand your needs.",
    icon: Compass,
    tone: "text-purple",
    tint: "bg-purple/10 ring-purple/20",
  },
  {
    id: "structured",
    title: "Structured Prompts",
    body: "Get expertly crafted prompts ready to use anywhere.",
    icon: FileText,
    tone: "text-brand",
    tint: "bg-brand/10 ring-brand/20",
  },
  {
    id: "analytics",
    title: "Prompt Analytics",
    body: "Evaluate the strength and clarity of your prompts.",
    icon: TrendingUp,
    tone: "text-good",
    tint: "bg-good/10 ring-good/20",
  },
  {
    id: "organize",
    title: "Save & Organize",
    body: "Store, manage and reuse your best prompts.",
    icon: Folder,
    tone: "text-amber",
    tint: "bg-amber/10 ring-amber/20",
  },
];

/* Right-rail score breakdown. Bars turn amber below 85 to match the mock. */
export const STRENGTH = {
  score: 85,
  label: "Strong",
  note: "Your last prompt is strong!",
  metrics: [
    { id: "clarity", label: "Clarity", value: 90 },
    { id: "specificity", label: "Specificity", value: 85 },
    { id: "context", label: "Context", value: 80 },
    { id: "structure", label: "Structure", value: 85 },
    { id: "actionability", label: "Actionability", value: 90 },
  ],
};

export const BENEFITS = [
  "Saves time and boosts productivity",
  "Improves AI output quality",
  "Perfect for all AI models",
  "Built for creators, developers, marketers and more",
];

export const WIZARD_STEPS = ["Goal", "Context", "Requirements", "Preferences"];

export const OUTPUT_TYPES = [
  { id: "analysis", label: "Analysis / Insight", icon: Lightbulb, tone: "text-purple" },
  { id: "guide", label: "Step-by-step Guide", icon: ListOrdered, tone: "text-brand" },
  { id: "creative", label: "Creative Content", icon: PenTool, tone: "text-pink" },
  { id: "technical", label: "Code / Technical", icon: Code2, tone: "text-good" },
  { id: "other", label: "Other", icon: LayoutGrid, tone: "text-amber" },
];

export const USER = {
  name: "Dhanush C",
  role: "COO · ProEduvate",
  initial: "D",
};
