import {
  LayoutGrid,
  Megaphone,
  Package,
  Code2,
  PenLine,
  FlaskConical,
  User,
  Archive,
} from "lucide-react";

export const LIBRARY_TABS = [
  { id: "all", label: "All Prompts" },
  { id: "folders", label: "Folders" },
  { id: "favorites", label: "Favorites" },
  { id: "shared", label: "Shared with me" },
  { id: "trash", label: "Trash" },
];

export const FOLDERS = [
  { id: "all", label: "All Prompts", count: 128, icon: LayoutGrid, tone: "text-brand" },
  { id: "marketing", label: "Marketing", count: 24, icon: Megaphone, tone: "text-pink" },
  { id: "product", label: "Product", count: 18, icon: Package, tone: "text-amber" },
  { id: "development", label: "Development", count: 22, icon: Code2, tone: "text-good" },
  { id: "content", label: "Content Writing", count: 16, icon: PenLine, tone: "text-purple" },
  { id: "research", label: "Research", count: 12, icon: FlaskConical, tone: "text-cyan" },
  { id: "personal", label: "Personal", count: 8, icon: User, tone: "text-brand" },
  { id: "archived", label: "Archived", count: 6, icon: Archive, tone: "text-muted" },
];

/* Library totals as reported by the mock. Only the first page of rows
   is available locally, so pagination is presentational for now. */
export const LIBRARY_TOTAL = 128;
export const PAGE_SIZE = 6;
export const PAGE_COUNT = 22;

/* Reference "today" for the Date filter, matching the mock's dates. */
export const TODAY = "2025-05-26";

export const FILTERS = [
  {
    id: "model",
    label: "Model",
    options: [
      { value: "all", label: "All Models" },
      { value: "GPT-4o", label: "GPT-4o" },
      { value: "Claude 3.5", label: "Claude 3.5" },
    ],
  },
  {
    id: "tag",
    label: "Tags",
    options: [
      { value: "all", label: "All Tags" },
      ...["Marketing", "Strategy", "Content", "Development", "Email", "Business"].map((tag) => ({
        value: tag,
        label: tag,
      })),
    ],
  },
  {
    id: "createdBy",
    label: "Created By",
    options: [
      { value: "all", label: "Anyone" },
      { value: "you", label: "You" },
      { value: "team", label: "Teammates" },
    ],
  },
  {
    id: "date",
    label: "Date",
    options: [
      { value: "all", label: "Anytime" },
      { value: "today", label: "Today" },
      { value: "week", label: "Last 7 days" },
      { value: "month", label: "Last 30 days" },
    ],
  },
];

export const DEFAULT_FILTERS = Object.fromEntries(FILTERS.map(({ id }) => [id, "all"]));

export const PROMPTS = [
  {
    id: "saas-marketing",
    title: "Marketing strategy for SaaS product",
    createdBy: "you",
    date: "2025-05-26",
    created: "May 26, 2025",
    model: "GPT-4o",
    folder: "marketing",
    tags: ["Marketing", "Strategy", "SaaS"],
    moreTags: 2,
    score: 80,
    favorite: true,
  },
  {
    id: "launch-emails",
    title: "Product launch email sequence",
    createdBy: "you",
    date: "2025-05-25",
    created: "May 25, 2025",
    model: "GPT-4o",
    folder: "marketing",
    tags: ["Marketing", "Email", "Launch"],
    score: 90,
    favorite: false,
    currentVersion: "v3",
    versions: [
      {
        id: "v3",
        date: "May 25, 2025 03:20 PM",
        metrics: { score: 90, words: 1245, clarity: 95, specificity: 90, actionability: 92 },
        sections: [
          {
            id: "role",
            label: "SYSTEM / ROLE",
            type: "text",
            content: "You are an expert email copywriter specializing in product launches.",
          },
          {
            id: "task",
            label: "TASK",
            type: "text",
            content: "Create a 5-email launch sequence for a new productivity app.",
          },
          {
            id: "context",
            label: "CONTEXT",
            type: "list",
            items: [
              { key: "Product Name", text: "FocusFlow" },
              { key: "Launch Date", text: "June 15, 2025" },
              { key: "Target Audience", text: "Remote professionals, freelancers, small teams" },
              { key: "Key Features", text: "Task management, time tracking, analytics, integrations" },
              { key: "Tone", text: "Friendly, professional, and action-oriented" },
            ],
          },
          {
            id: "requirements",
            label: "REQUIREMENTS",
            type: "numbered",
            items: [
              { text: "Write 5 emails (intro, problem, solution, social proof, CTA)." },
              { text: "Each email should have a subject line, preview text, and body." },
              { text: "Keep the tone consistent." },
            ],
          },
        ],
      },
      {
        id: "v2",
        date: "May 24, 2025 10:15 AM",
        metrics: { score: 72, words: null, clarity: 70, specificity: 70, actionability: 75 },
        sections: [
          {
            id: "role",
            label: "SYSTEM / ROLE",
            type: "text",
            content: "You are an expert email copywriter. You write engaging emails that convert.",
          },
          {
            id: "task",
            label: "TASK",
            type: "text",
            content: "Create an email sequence for a new productivity app.",
          },
          {
            id: "context",
            label: "CONTEXT",
            type: "list",
            items: [
              { key: "Product Name", text: "FocusFlow" },
              { key: "Target Audience", text: "Professionals" },
              { key: "Key Features", text: "Task management, time tracking" },
              { key: "Tone", text: "Professional" },
            ],
          },
          {
            id: "requirements",
            label: "REQUIREMENTS",
            type: "numbered",
            items: [
              { text: "Write 4 emails." },
              { text: "Include subject line and body." },
              { text: "Keep it professional." },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "code-review",
    title: "Code review best practices guide",
    createdBy: "you",
    date: "2025-05-25",
    created: "May 25, 2025",
    model: "Claude 3.5",
    folder: "development",
    tags: ["Development", "Code", "Guide"],
    moreTags: 1,
    score: 72,
    favorite: false,
  },
  {
    id: "ai-healthcare-blog",
    title: "Blog on AI in healthcare",
    createdBy: "you",
    date: "2025-05-25",
    created: "May 25, 2025",
    model: "Claude 3.5",
    folder: "content",
    tags: ["Content", "Blog", "AI", "Healthcare"],
    score: 65,
    favorite: false,
  },
  {
    id: "social-calendar",
    title: "Social media content calendar",
    createdBy: "you",
    date: "2025-05-24",
    created: "May 24, 2025",
    model: "GPT-4o",
    folder: "marketing",
    tags: ["Marketing", "Social Media", "Content"],
    score: 78,
    favorite: false,
  },
  {
    id: "competitor-analysis",
    title: "Competitor analysis framework",
    createdBy: "you",
    date: "2025-05-24",
    created: "May 24, 2025",
    model: "GPT-4o",
    folder: "research",
    tags: ["Strategy", "Business", "Analysis"],
    score: 83,
    favorite: false,
  },
];
