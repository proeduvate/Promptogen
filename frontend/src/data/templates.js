import {
  Megaphone,
  Code2,
  PenLine,
  GraduationCap,
  Briefcase,
  FlaskConical,
  ListChecks,
  Palette,
  BarChart3,
  UserRound,
} from "lucide-react";

/* Template categories drive the filter chips and each card's icon tile. */
export const TEMPLATE_CATEGORIES = [
  { id: "marketing", label: "Marketing", icon: Megaphone, tone: "text-pink", tint: "bg-pink/10 ring-pink/20" },
  { id: "development", label: "Development", icon: Code2, tone: "text-good", tint: "bg-good/10 ring-good/20" },
  { id: "writing", label: "Writing", icon: PenLine, tone: "text-purple", tint: "bg-purple/10 ring-purple/20" },
  { id: "education", label: "Education", icon: GraduationCap, tone: "text-amber", tint: "bg-amber/10 ring-amber/20" },
  { id: "business", label: "Business", icon: Briefcase, tone: "text-brand", tint: "bg-brand/10 ring-brand/20" },
  { id: "research", label: "Research", icon: FlaskConical, tone: "text-cyan", tint: "bg-cyan/10 ring-cyan/20" },
  { id: "productivity", label: "Productivity", icon: ListChecks, tone: "text-good", tint: "bg-good/10 ring-good/20" },
  { id: "creative", label: "Creative", icon: Palette, tone: "text-pink", tint: "bg-pink/10 ring-pink/20" },
  { id: "data", label: "Data Analysis", icon: BarChart3, tone: "text-brand", tint: "bg-brand/10 ring-brand/20" },
  { id: "career", label: "Career", icon: UserRound, tone: "text-amber", tint: "bg-amber/10 ring-amber/20" },
];

/* Smart templates (spec §28–29). {{variables}} are asked for before the
   filled prompt goes to the Home composer (500-character limit), so keep
   prompts short. To add a template, append an object here. */
export const TEMPLATES = [
  {
    id: "launch-campaign",
    title: "Product Launch Campaign",
    description: "Plan a multi-channel launch with messaging, a timeline and the KPIs to track.",
    category: "marketing",
    tags: ["Launch", "Campaign", "Strategy"],
    prompt:
      "Plan a multi-channel launch campaign for {{product}}. Include the target audience, key messaging, channel mix, a week-by-week timeline and the KPIs to track.",
  },
  {
    id: "social-calendar",
    title: "Social Media Content Calendar",
    description: "A month of platform-specific posts with hooks, captions and hashtags.",
    category: "marketing",
    tags: ["Social Media", "Content", "Calendar"],
    prompt:
      "Create a 4-week social media content calendar for {{brand}} on {{platforms}}, with post ideas, hooks, captions, hashtags and the best time to publish each post.",
  },
  {
    id: "email-nurture",
    title: "Email Nurture Sequence",
    description: "A short email series that moves new sign-ups toward their first purchase.",
    category: "marketing",
    tags: ["Email", "Automation", "Conversion"],
    prompt:
      "Draft a 5-email nurture sequence for new sign-ups to {{product}}, with a subject line, goal and call to action for each email.",
  },
  {
    id: "code-review",
    title: "Code Review Assistant",
    description: "Review a diff for bugs, security issues, performance and readability.",
    category: "development",
    tags: ["Code Review", "Quality", "Security"],
    prompt:
      "Review a {{language}} code change for bugs, security issues, performance problems and readability, and return findings ranked by severity with suggested fixes.",
  },
  {
    id: "api-docs",
    title: "API Documentation Writer",
    description: "Turn endpoint details into clear reference docs with request and response examples.",
    category: "development",
    tags: ["Docs", "API", "REST"],
    prompt:
      "Write reference documentation for the {{api_name}} endpoints, covering purpose, parameters, request and response examples, error codes and authentication.",
  },
  {
    id: "bug-triage",
    title: "Bug Report Triage",
    description: "Turn a vague bug report into repro steps, likely causes and next actions.",
    category: "development",
    tags: ["Debugging", "Triage", "QA"],
    prompt:
      "Triage a bug report for {{app}}, producing clear reproduction steps, expected vs actual behaviour, likely root causes and a suggested priority.",
  },
  {
    id: "seo-blog",
    title: "SEO Blog Post",
    description: "A long-form article outline and draft built around a target keyword.",
    category: "writing",
    tags: ["SEO", "Blog", "Long-form"],
    prompt:
      "Write a 1,500-word SEO blog post about {{topic}} targeting the keyword {{keyword}}, with an outline, H2/H3 headings, meta description and a closing call to action.",
  },
  {
    id: "product-description",
    title: "Product Description",
    description: "Persuasive e-commerce copy that leads with benefits, not features.",
    category: "writing",
    tags: ["E-commerce", "Copywriting"],
    prompt:
      "Write a persuasive product description for {{product}} aimed at {{audience}}, leading with benefits, then key features, and ending with a short call to action.",
  },
  {
    id: "lesson-plan",
    title: "Lesson Plan Builder",
    description: "Objectives, activities and assessment for a single class session.",
    category: "education",
    tags: ["Lesson Plan", "Teaching", "Assessment"],
    prompt:
      "Build a {{duration}} lesson plan on {{topic}} for {{grade_level}}, with learning objectives, a warm-up, main activities, differentiation ideas and an assessment.",
  },
  {
    id: "quiz-generator",
    title: "Quiz Generator",
    description: "Mixed-format questions with an answer key and short explanations.",
    category: "education",
    tags: ["Quiz", "Assessment", "Study"],
    prompt:
      "Generate a 10-question quiz on {{topic}} for {{level}}, mixing multiple choice and short answer, with an answer key and a one-line explanation per answer.",
  },
  {
    id: "meeting-summary",
    title: "Meeting Summary & Action Items",
    description: "Condense a transcript into decisions, owners and deadlines.",
    category: "business",
    tags: ["Meetings", "Summary", "Productivity"],
    prompt:
      "Summarise a meeting transcript into key decisions, open questions and action items, each with an owner and a deadline.",
  },
  {
    id: "competitor-analysis",
    title: "Competitor Analysis",
    description: "Compare competitors on positioning, pricing, strengths and gaps.",
    category: "business",
    tags: ["Strategy", "Market", "SWOT"],
    prompt:
      "Analyse {{competitors}} against {{product}}, comparing positioning, pricing, features, strengths and weaknesses, and ending with a SWOT summary and opportunities.",
  },
  {
    id: "literature-review",
    title: "Literature Review Outline",
    description: "Structure the key themes, debates and gaps in a research area.",
    category: "research",
    tags: ["Academic", "Citations", "Outline"],
    prompt:
      "Outline a literature review on {{research_question}}, grouping sources by theme, summarising key findings and debates, and identifying gaps for future work.",
  },
  {
    id: "interview-synthesis",
    title: "Customer Interview Synthesis",
    description: "Pull themes, quotes and opportunities out of user interview notes.",
    category: "research",
    tags: ["UX", "Interviews", "Insights"],
    prompt:
      "Synthesise notes from {{number}} customer interviews into recurring themes, supporting quotes, pain points and prioritised product opportunities.",
  },
  {
    id: "weekly-plan",
    title: "Weekly Priorities Plan",
    description: "Turn a messy to-do list into a focused, time-blocked week.",
    category: "productivity",
    tags: ["Planning", "Focus", "Time Blocking"],
    prompt:
      "Create a weekly plan from my task list: {{tasks}}. I have {{hours}} hours of focus time. Prioritise by impact, time-block each day and flag what to drop or delegate.",
  },
  {
    id: "meeting-agenda",
    title: "Meeting Agenda Builder",
    description: "A timed agenda with goals, owners and decisions to make.",
    category: "productivity",
    tags: ["Meetings", "Agenda", "Teams"],
    prompt:
      "Create a {{duration}} meeting agenda about {{topic}} for {{attendees}}, with a goal, timed items, an owner per item and the decisions we need to leave with.",
  },
  {
    id: "story-starter",
    title: "Short Story Starter",
    description: "An opening scene with a hook, a voice and a clear conflict.",
    category: "creative",
    tags: ["Fiction", "Storytelling", "Hook"],
    prompt:
      "Write the opening scene of a {{genre}} short story about {{premise}}, told in {{point_of_view}}, ending on a hook that sets up the central conflict.",
  },
  {
    id: "brand-names",
    title: "Brand Name Ideas",
    description: "Name options with meaning, tone and domain-friendly variants.",
    category: "creative",
    tags: ["Naming", "Branding", "Ideas"],
    prompt:
      "Suggest 15 brand names for {{product}} aimed at {{audience}}. Group them by style, explain each name's meaning and avoid names that are hard to spell.",
  },
  {
    id: "sales-analysis",
    title: "Sales Data Analysis",
    description: "Trends, outliers and recommendations from a sales export.",
    category: "data",
    tags: ["Sales", "Trends", "Insights"],
    prompt:
      "Analyse our sales data for {{period}} ({{columns}}). Identify trends, top and bottom performers and outliers, and recommend three actions with the numbers that support them.",
  },
  {
    id: "kpi-definitions",
    title: "Dashboard KPI Definitions",
    description: "Clear KPI definitions with formulas, targets and owners.",
    category: "data",
    tags: ["KPIs", "Dashboards", "Metrics"],
    prompt:
      "Define 8 KPIs for a {{team}} dashboard. For each, give the formula, data source, target, review cadence and an owner.",
  },
  {
    id: "resume-tailoring",
    title: "Tailor My Resume",
    description: "Rewrite resume bullets to match a specific job posting.",
    category: "career",
    tags: ["Resume", "Job Search", "Keywords"],
    prompt:
      "Tailor my resume for the {{role}} role at {{company}}. Rewrite my bullets as measurable achievements and match the keywords in this job description: {{job_description}}.",
  },
  {
    id: "interview-prep",
    title: "Interview Preparation",
    description: "Likely questions with strong, structured sample answers.",
    category: "career",
    tags: ["Interview", "STAR", "Practice"],
    prompt:
      "Prepare me for a {{role}} interview. List the 10 most likely questions, give STAR-format sample answers based on my experience ({{experience}}) and three questions I should ask.",
  },
];

/* {{variable}} names used in a template prompt, in order of appearance. */
export const variablesOf = (text) => [...new Set([...text.matchAll(/\{\{\s*(\w+)\s*\}\}/g)].map((match) => match[1]))];

export const variableLabel = (name) => name.replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase());

export const fillVariables = (text, values) => text.replace(/\{\{\s*(\w+)\s*\}\}/g, (match, name) => values[name]?.trim() || match);
