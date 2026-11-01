import { FileText, Gauge, Award, Clock, Layers, LayoutList, Users } from "lucide-react";

export const ANALYTICS_TABS = [
  { id: "overview", label: "Overview" },
  { id: "performance", label: "Performance" },
  { id: "usage", label: "Usage Insights" },
  { id: "comparisons", label: "Comparisons" },
];

export const DATE_RANGE = "May 20 – May 26, 2025";
export const COMPARE_PERIOD = "vs last 7 days";

export const SUMMARY_CARDS = [
  {
    id: "total",
    label: "Total Prompts",
    value: "32",
    change: "18%",
    icon: FileText,
    tone: "text-brand",
    tint: "bg-brand/10 ring-brand/20",
  },
  {
    id: "average",
    label: "Avg. Strength Score",
    value: "78",
    change: "12%",
    icon: Gauge,
    tone: "text-purple",
    tint: "bg-purple/10 ring-purple/20",
  },
  {
    id: "high-quality",
    label: "High-Quality Prompts",
    value: "21",
    change: "25%",
    icon: Award,
    tone: "text-good",
    tint: "bg-good/10 ring-good/20",
  },
  {
    id: "time-saved",
    label: "Time Saved",
    value: "12.4 hrs",
    change: "22%",
    icon: Clock,
    tone: "text-amber",
    tint: "bg-amber/10 ring-amber/20",
  },
];

/* Daily series for the line chart. May 24 is the day the mock's tooltip
   calls out, so the chart highlights it until the user hovers elsewhere. */
export const STRENGTH_SERIES = {
  highlight: 4,
  lines: [
    { key: "avg", label: "Average Score", color: "var(--color-brand)" },
    { key: "top", label: "Top Score", color: "var(--color-good)" },
    { key: "low", label: "Lowest Score", color: "var(--color-amber)" },
  ],
  tooltipOrder: ["top", "avg", "low"],
  days: [
    { label: "May 20", date: "May 20, 2025", avg: 74, top: 88, low: 52 },
    { label: "May 21", date: "May 21, 2025", avg: 76, top: 90, low: 58 },
    { label: "May 22", date: "May 22, 2025", avg: 73, top: 86, low: 48 },
    { label: "May 23", date: "May 23, 2025", avg: 79, top: 91, low: 55 },
    { label: "May 24", date: "May 24, 2025", avg: 78, top: 92, low: 45 },
    { label: "May 25", date: "May 25, 2025", avg: 80, top: 89, low: 60 },
    { label: "May 26", date: "May 26, 2025", avg: 86, top: 94, low: 62 },
  ],
};

export const STRENGTH_TREND = {
  score: 85,
  label: "Strong",
  delta: 10,
  bars: [
    { label: "May 20", value: 75 },
    { label: "May 21", value: 77 },
    { label: "May 22", value: 76 },
    { label: "May 23", value: 79 },
    { label: "May 24", value: 81 },
    { label: "May 25", value: 83 },
    { label: "May 26", value: 85 },
  ],
};

/* Donut segment colours, keyed by the metric ids in content.js STRENGTH. */
export const BREAKDOWN_COLORS = {
  clarity: "var(--color-brand)",
  specificity: "var(--color-purple)",
  context: "var(--color-cyan)",
  structure: "var(--color-amber)",
  actionability: "var(--color-good)",
};

export const RECENT_PERFORMANCE = [
  {
    id: "saas-marketing",
    title: "Marketing strategy for SaaS product",
    model: "GPT-4o",
    score: 80,
    clarity: 90,
    specificity: 85,
    actionability: 88,
    createdAt: "May 26, 2025 11:30 AM",
  },
  {
    id: "code-review",
    title: "Code review best practices guide",
    model: "GPT-4o",
    score: 72,
    clarity: 80,
    specificity: 75,
    actionability: 70,
    createdAt: "May 26, 2025 09:15 AM",
  },
  {
    id: "ai-healthcare-blog",
    title: "Blog on AI in healthcare",
    model: "Claude 3.5",
    score: 65,
    clarity: 70,
    specificity: 60,
    actionability: 65,
    createdAt: "May 25, 2025 07:45 PM",
  },
  {
    id: "launch-emails",
    title: "Product launch email sequence",
    model: "GPT-4o",
    score: 90,
    clarity: 95,
    specificity: 90,
    actionability: 92,
    createdAt: "May 25, 2025 03:20 PM",
  },
  {
    id: "time-management",
    title: "Lessons on time management",
    model: "Claude 3.5",
    score: 55,
    clarity: 60,
    specificity: 50,
    actionability: 55,
    createdAt: "May 24, 2025 10:10 AM",
  },
];

export const IMPACT_STYLE = {
  High: "bg-bad/10 text-bad ring-bad/25",
  Medium: "bg-amber/10 text-amber ring-amber/25",
};

export const SUGGESTIONS = [
  { id: "context", text: "Add more context to improve specificity.", impact: "High", icon: Layers },
  { id: "format", text: "Include output format for better structure.", impact: "Medium", icon: LayoutList },
  { id: "audience", text: "Specify audience to increase clarity.", impact: "Medium", icon: Users },
];
