import {
  Megaphone,
  Code2,
  PenLine,
  GraduationCap,
  Briefcase,
  FlaskConical,
} from "lucide-react";

/* Template categories drive the filter chips and each card's icon tile. */
export const TEMPLATE_CATEGORIES = [
  { id: "marketing", label: "Marketing", icon: Megaphone, tone: "text-pink", tint: "bg-pink/10 ring-pink/20" },
  { id: "development", label: "Development", icon: Code2, tone: "text-good", tint: "bg-good/10 ring-good/20" },
  { id: "writing", label: "Writing", icon: PenLine, tone: "text-purple", tint: "bg-purple/10 ring-purple/20" },
  { id: "education", label: "Education", icon: GraduationCap, tone: "text-amber", tint: "bg-amber/10 ring-amber/20" },
  { id: "business", label: "Business", icon: Briefcase, tone: "text-brand", tint: "bg-brand/10 ring-brand/20" },
  { id: "research", label: "Research", icon: FlaskConical, tone: "text-cyan", tint: "bg-cyan/10 ring-cyan/20" },
];

/* Prompt presets. "Use template" drops `prompt` into the Home composer
   (500-character limit), so keep it under that and leave [placeholders]
   for the user to fill in. To add a template, append an object here. */
export const TEMPLATES = [
  {
    id: "launch-campaign",
    title: "Product Launch Campaign",
    description: "Plan a multi-channel launch with messaging, a timeline and the KPIs to track.",
    category: "marketing",
    tags: ["Launch", "Campaign", "Strategy"],
    prompt:
      "Write a prompt for an AI to plan a multi-channel launch campaign for [product]. Include the target audience, key messaging, channel mix, a week-by-week timeline and the KPIs to track.",
  },
  {
    id: "social-calendar",
    title: "Social Media Content Calendar",
    description: "A month of platform-specific posts with hooks, captions and hashtags.",
    category: "marketing",
    tags: ["Social Media", "Content", "Calendar"],
    prompt:
      "Write a prompt for an AI to create a 4-week social media content calendar for [brand] on [platforms], with post ideas, hooks, captions, hashtags and the best time to publish each post.",
  },
  {
    id: "email-nurture",
    title: "Email Nurture Sequence",
    description: "A short email series that moves new sign-ups toward their first purchase.",
    category: "marketing",
    tags: ["Email", "Automation", "Conversion"],
    prompt:
      "Write a prompt for an AI to draft a 5-email nurture sequence for new sign-ups to [product], with a subject line, goal and call to action for each email.",
  },
  {
    id: "code-review",
    title: "Code Review Assistant",
    description: "Review a diff for bugs, security issues, performance and readability.",
    category: "development",
    tags: ["Code Review", "Quality", "Security"],
    prompt:
      "Write a prompt for an AI to review a [language] code change for bugs, security issues, performance problems and readability, and return findings ranked by severity with suggested fixes.",
  },
  {
    id: "api-docs",
    title: "API Documentation Writer",
    description: "Turn endpoint details into clear reference docs with request and response examples.",
    category: "development",
    tags: ["Docs", "API", "REST"],
    prompt:
      "Write a prompt for an AI to write reference documentation for the [API name] endpoints, covering purpose, parameters, request and response examples, error codes and authentication.",
  },
  {
    id: "bug-triage",
    title: "Bug Report Triage",
    description: "Turn a vague bug report into repro steps, likely causes and next actions.",
    category: "development",
    tags: ["Debugging", "Triage", "QA"],
    prompt:
      "Write a prompt for an AI to triage a bug report for [app], producing clear reproduction steps, expected vs actual behaviour, likely root causes and a suggested priority.",
  },
  {
    id: "seo-blog",
    title: "SEO Blog Post",
    description: "A long-form article outline and draft built around a target keyword.",
    category: "writing",
    tags: ["SEO", "Blog", "Long-form"],
    prompt:
      "Write a prompt for an AI to write a 1,500-word SEO blog post about [topic] targeting the keyword [keyword], with an outline, H2/H3 headings, meta description and a closing call to action.",
  },
  {
    id: "product-description",
    title: "Product Description",
    description: "Persuasive e-commerce copy that leads with benefits, not features.",
    category: "writing",
    tags: ["E-commerce", "Copywriting"],
    prompt:
      "Write a prompt for an AI to write a persuasive product description for [product] aimed at [audience], leading with benefits, then key features, and ending with a short call to action.",
  },
  {
    id: "lesson-plan",
    title: "Lesson Plan Builder",
    description: "Objectives, activities and assessment for a single class session.",
    category: "education",
    tags: ["Lesson Plan", "Teaching", "Assessment"],
    prompt:
      "Write a prompt for an AI to build a [duration] lesson plan on [topic] for [grade level], with learning objectives, a warm-up, main activities, differentiation ideas and an assessment.",
  },
  {
    id: "quiz-generator",
    title: "Quiz Generator",
    description: "Mixed-format questions with an answer key and short explanations.",
    category: "education",
    tags: ["Quiz", "Assessment", "Study"],
    prompt:
      "Write a prompt for an AI to generate a 10-question quiz on [topic] for [level], mixing multiple choice and short answer, with an answer key and a one-line explanation per answer.",
  },
  {
    id: "meeting-summary",
    title: "Meeting Summary & Action Items",
    description: "Condense a transcript into decisions, owners and deadlines.",
    category: "business",
    tags: ["Meetings", "Summary", "Productivity"],
    prompt:
      "Write a prompt for an AI to summarise a meeting transcript into key decisions, open questions and action items, each with an owner and a deadline.",
  },
  {
    id: "competitor-analysis",
    title: "Competitor Analysis",
    description: "Compare competitors on positioning, pricing, strengths and gaps.",
    category: "business",
    tags: ["Strategy", "Market", "SWOT"],
    prompt:
      "Write a prompt for an AI to analyse [competitors] against [our product], comparing positioning, pricing, features, strengths and weaknesses, and ending with a SWOT summary and opportunities.",
  },
  {
    id: "literature-review",
    title: "Literature Review Outline",
    description: "Structure the key themes, debates and gaps in a research area.",
    category: "research",
    tags: ["Academic", "Citations", "Outline"],
    prompt:
      "Write a prompt for an AI to outline a literature review on [research question], grouping sources by theme, summarising key findings and debates, and identifying gaps for future work.",
  },
  {
    id: "interview-synthesis",
    title: "Customer Interview Synthesis",
    description: "Pull themes, quotes and opportunities out of user interview notes.",
    category: "research",
    tags: ["UX", "Interviews", "Insights"],
    prompt:
      "Write a prompt for an AI to synthesise notes from [number] customer interviews into recurring themes, supporting quotes, pain points and prioritised product opportunities.",
  },
];
