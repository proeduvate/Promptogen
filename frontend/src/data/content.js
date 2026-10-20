import {
  Home,
  LineChart,
  FileText,
  BarChart3,
  History,
  Heart,
  HelpCircle,
  FlaskConical,
  Code2,
  PenLine,
  GraduationCap,
  Compass,
  TrendingUp,
  Folder,
  Lightbulb,
  ListOrdered,
  PenTool,
  LayoutGrid,
  Megaphone,
  Search,
  ListChecks,
  Briefcase,
  Palette,
  Sparkles,
} from "lucide-react";

/* Sidebar navigation. `id` is what App tracks as the active route.
   Settings and Profile open from the profile menu instead (ProfileMenu). */
export const NAV_ITEMS = [
  { id: "home", label: "Home", icon: Home },
  { id: "my-prompts", label: "My Prompts", icon: LineChart },
  { id: "templates", label: "Templates", icon: FileText },
  { id: "analytics", label: "Analytics", icon: BarChart3 },
  { id: "favorites", label: "Favorites", icon: Heart },
  { id: "model-lab", label: "Model Lab", icon: FlaskConical },
  { id: "history", label: "History", icon: History },
  { id: "guide", label: "Guide & Help", icon: HelpCircle },
];

/* Suggested prompt categories under the composer (spec §2). `seed` drops a
   starting idea into the composer when the chip is clicked. */
export const SUGGESTED_CATEGORIES = [
  { id: "writing", label: "Writing", icon: PenLine, tone: "text-purple", seed: "Write an email requesting leave." },
  { id: "marketing", label: "Marketing", icon: Megaphone, tone: "text-pink", seed: "Create a marketing plan for my business." },
  { id: "research", label: "Research", icon: Search, tone: "text-cyan", seed: "Summarize recent research on remote work and productivity." },
  { id: "data", label: "Data Analysis", icon: BarChart3, tone: "text-brand", seed: "Analyze my sales data." },
  { id: "productivity", label: "Productivity", icon: ListChecks, tone: "text-good", seed: "Plan my week so I can finish a product launch on time." },
  { id: "coding", label: "Coding", icon: Code2, tone: "text-good", seed: "Help me debug my FastAPI application." },
  { id: "business", label: "Business", icon: Briefcase, tone: "text-amber", seed: "Write a one-page business proposal for a new client." },
  { id: "learning", label: "Learning", icon: GraduationCap, tone: "text-amber", seed: "Create a study plan for learning Python." },
  { id: "creative", label: "Creative Work", icon: Palette, tone: "text-pink", seed: "Create Instagram content for my product." },
  { id: "general", label: "General", icon: Sparkles, tone: "text-brand", seed: "Explain a complex topic in simple terms." },
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
  title: "COO",
  organization: "ProEduvate",
  email: "dhanush@proeduvate.com",
  initial: "D",
};
