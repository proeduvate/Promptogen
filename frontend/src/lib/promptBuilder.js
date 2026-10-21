/* ---------------------------------------------------------------
   Turns the wizard's answers into a structured prompt (spec §4–5, §45).
   Everything here runs in the browser so the flow works end to end
   before the generation API exists.
   Hand-off point: POST the idea, domain, answers and active profile to
   the prompt-generation service and use its sections instead.
----------------------------------------------------------------*/
import { QUESTION_BANK, PROFILE_PREFILL, TONE_GROUPS } from "../data/questions";
import { TONE_FIELD, profileValue } from "../data/contextProfiles";
import { modelById } from "../data/models";
import { analyzeIntent } from "./analysis";

/* Questions for a domain, adjusted by the user's question settings. */
export const questionsFor = (domain, settings = {}) =>
  (QUESTION_BANK[domain] ?? QUESTION_BANK.general)
    .filter((question) => !question.setting || settings[question.setting])
    .map((question) => (question.name === "outputFormat" && settings.askOutputFormat ? { ...question, importance: "required" } : question));

export const visibleQuestions = (questions, answers) =>
  questions.filter((question) => !question.showIf || question.showIf(answers));

export const emptyAnswer = ({ type }) =>
  type === "multi" ? [] : type === "daterange" ? { from: "", to: "" } : type === "file" ? null : "";

export function isAnswered(question, value) {
  if (value == null) return false;
  if (Array.isArray(value)) return value.length > 0;
  if (question.type === "daterange") return Boolean(value.from || value.to);
  if (question.type === "file") return Boolean(value.name);
  return String(value).trim().length > 0;
}

const optionLabel = (question, value) => question.options?.find((option) => option.value === value)?.label ?? value;

/* Human-readable answer, used in the review list and the CONTEXT section. */
export function formatAnswer(question, value) {
  if (!isAnswered(question, value)) return "";
  switch (question.type) {
    case "multi":
      return value.map((item) => optionLabel(question, item)).join(", ");
    case "single":
    case "select":
      return optionLabel(question, value);
    case "yesno":
      return value === "yes" ? "Yes" : "No";
    case "slider":
      return question.labels ? question.labels[Number(value) - question.min] : String(value);
    case "daterange":
      return [value.from, value.to].filter(Boolean).join(" to ");
    case "file":
      return value.name;
    default:
      return String(value).trim();
  }
}

/* ---------- Readiness (spec §45) ---------- */
const WEIGHTS = { required: 80, recommended: 15, optional: 5 };

const READINESS_LEVELS = [
  { min: 95, label: "Highly Detailed", tone: "text-good", bar: "bg-good" },
  { min: 80, label: "Ready", tone: "text-brand", bar: "bg-brand" },
  { min: 60, label: "Good", tone: "text-amber", bar: "bg-amber" },
  { min: 0, label: "Basic information", tone: "text-muted", bar: "bg-muted" },
];

export function readinessOf(questions, answers) {
  const visible = visibleQuestions(questions, answers);
  const unanswered = visible.filter((question) => !isAnswered(question, answers[question.name]));
  const score = Math.round(
    Object.entries(WEIGHTS).reduce((total, [level, weight]) => {
      const group = visible.filter((question) => question.importance === level);
      if (group.length === 0) return total + weight;
      const done = group.filter((question) => isAnswered(question, answers[question.name])).length;
      return total + (weight * done) / group.length;
    }, 0),
  );
  const level = READINESS_LEVELS.find(({ min }) => score >= min);
  return {
    score,
    ...level,
    missingRequired: unanswered.filter((question) => question.importance === "required"),
    missingRecommended: unanswered.filter((question) => question.importance === "recommended"),
    remaining: unanswered.filter((question) => question.importance !== "required").length,
  };
}

/* ---------- Tone (spec §22) ---------- */
const TONE_WORDS = [
  ["professional", /\b(?:professional|formal|business-like|corporate)\b/i],
  ["academic", /\b(?:academic|scholarly)\b/i],
  ["technical", /\btechnical\b/i],
  ["persuasive", /\b(?:persuasive|convincing|salesy)\b/i],
  ["casual", /\b(?:casual|informal|relaxed|funny|humou?rous|playful|witty)\b/i],
  ["friendly", /\b(?:friendly|warm|approachable)\b/i],
];

export const toneFromText = (text) => TONE_WORDS.find(([, re]) => re.test(text ?? ""))?.[0] ?? "";

export const toneGroup = (tone) =>
  Object.entries(TONE_GROUPS).find(([, tones]) => tones.includes(tone))?.[0] ?? null;

export const toneLabel = (tone) => tone.charAt(0).toUpperCase() + tone.slice(1);

/* The tone saved in the active profile, else the Prompt Defaults one. */
export function savedToneOf(profile, settings) {
  const fromProfile = toneFromText(profileValue(profile, TONE_FIELD));
  if (fromProfile) return { tone: fromProfile, source: profile.name };
  return settings?.tone ? { tone: settings.tone, source: "your Prompt Defaults" } : null;
}

/* ---------- Pre-filling (spec §3, §20) ---------- */
const escape = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const containsWord = (text, word) => new RegExp(`(?:^|[^a-z0-9])${escape(word)}(?![a-z0-9])`, "i").test(text);

/* Fits a free-text value to a question: options are matched by name. */
function coerce(question, value) {
  if (value == null || value === "") return null;
  const options = question.options ?? [];
  const pick = (text) =>
    options
      .filter((option) => [option.value, option.label].some((name) => containsWord(String(text), name)))
      .sort((a, b) => b.label.length - a.label.length)[0]?.value;

  switch (question.type) {
    case "single":
    case "select":
      return options.some((option) => option.value === value) ? value : (pick(value) ?? null);
    case "multi": {
      const items = Array.isArray(value) ? value : String(value).split(/,|\band\b/);
      const picked = [...new Set(items.map((item) => (options.some((option) => option.value === item) ? item : pick(item))).filter(Boolean))];
      return picked.length ? picked : null;
    }
    case "number":
    case "slider": {
      const number = Number.parseInt(value, 10);
      if (Number.isNaN(number)) return null;
      return Math.min(question.max ?? number, Math.max(question.min ?? number, number));
    }
    case "yesno":
      return value === "yes" || value === "no" ? value : null;
    case "text":
    case "textarea":
    case "url":
      return String(value).slice(0, question.maxLength ?? 400);
    default:
      return null;
  }
}

const MARKETS = ["India", "United States", "USA", "UK", "Europe", "Germany", "Canada", "Australia", "Singapore", "Middle East", "Southeast Asia", "Global"];
const FRAMEWORKS = { fastapi: "FastAPI", django: "Django", flask: "Flask", react: "React", vue: "Vue", angular: "Angular", "next.js": "Next.js", nextjs: "Next.js", express: "Express", spring: "Spring", rails: "Rails", laravel: "Laravel" };
const DEV_TASKS = [
  ["Fix a bug", /\b(?:bug|error|fix|crash(?:es|ing)?|exception|not working|fails?|broken|returns? (?:a )?\d{3})\b/i],
  ["Code review", /\breview\b/i],
  ["Refactor", /\brefactor/i],
  ["Write tests", /\b(?:write|add) (?:unit )?tests?\b/i],
  ["Explain code", /\bexplain\b/i],
  ["New feature", /\b(?:build|create|add|implement|develop)\b/i],
];

/* Values the idea already states, keyed by question name. */
export function extractFromIdea(text = "") {
  const found = {};
  const market = MARKETS.find((name) => containsWord(text, name));
  if (market) found.market = market === "USA" ? "United States" : market;

  const span = text.match(/\b(\d+)\s*(month|week|year)s?\b/i);
  if (span) {
    const months = span[2].toLowerCase() === "year" ? Number(span[1]) * 12 : span[2].toLowerCase() === "month" ? Number(span[1]) : 0;
    if (months) found.timeline = `${months} month${months === 1 ? "" : "s"}`;
    if (span[2].toLowerCase() === "week") found.weeks = span[1];
  }

  const budget = text.match(/(?:[$₹€£]|\brs\.?\s?)\s?\d[\d,]*(?:\.\d+)?\s*(?:k|lakhs?|crores?|m)?\b(?:\s*(?:per|a|\/)\s*month)?/i);
  if (budget) found.budget = budget[0].trim();

  found.channels = ["Instagram", "LinkedIn", "Google Ads", "SEO", "Email", "YouTube"].filter((name) => containsWord(text, name));
  found.language = ["TypeScript", "JavaScript", "Python", "Java", "Rust", "PHP", "C#"].find((name) => containsWord(text, name)) ?? (/\bgolang\b/i.test(text) ? "Go" : "");
  const framework = Object.keys(FRAMEWORKS).find((key) => containsWord(text, key));
  if (framework) found.framework = FRAMEWORKS[framework];
  found.database = text.match(/\bpostgres(?:ql)?\b/i) ? "PostgreSQL" : ["MySQL", "MongoDB", "SQLite", "Redis"].find((name) => containsWord(text, name)) ?? "";
  found.devTask = DEV_TASKS.find(([, re]) => re.test(text))?.[0] ?? "";
  found.writingType = ["Email", "Blog post", "Article", "Letter"].find((name) => containsWord(text, name)) ?? (/\b(?:post|caption|tweet)\b/i.test(text) ? "Social post" : "");
  found.careerTask = [["Cover letter", /cover letter/i], ["Resume", /\b(?:resume|cv)\b/i], ["Interview prep", /interview/i], ["LinkedIn profile", /linkedin profile/i], ["Salary negotiation", /salary/i]].find(([, re]) => re.test(text))?.[0] ?? "";
  found.level = ["Beginner", "Intermediate", "Advanced"].find((name) => new RegExp(`\\b${name}s?\\b`, "i").test(text)) ?? "";
  found.topic = text.match(/\b(?:teach|learn|learning|about|on|regarding)\s+([A-Za-z0-9+#.\- ]{2,40}?)(?=\s+(?:to|for|over|in|with|by|from|that|so)\b|[.,!?]|$)/i)?.[1]?.trim() ?? "";
  found.tone = toneFromText(text);
  return found;
}

/* Starting answers for a domain plus where each pre-filled value came from. */
export function prefillAnswers(domain, { idea = "", profile, settings }) {
  const questions = questionsFor(domain, settings);
  const answers = Object.fromEntries(questions.map((question) => [question.name, emptyAnswer(question)]));
  const sources = {};
  const set = (name, value, source) => {
    const question = questions.find((item) => item.name === name);
    if (!question || isAnswered(question, answers[name])) return;
    const fitted = coerce(question, value);
    if (fitted == null || !isAnswered(question, fitted)) return;
    answers[name] = fitted;
    if (source) sources[name] = source;
  };

  set("goal", idea.trim());
  Object.entries(extractFromIdea(idea)).forEach(([name, value]) => set(name, value, "your request"));
  profile?.fields.forEach(({ label, value }) =>
    (PROFILE_PREFILL[label.toLowerCase()] ?? []).forEach((name) => set(name, value, profile.name)),
  );
  const saved = savedToneOf(profile, settings);
  if (saved) set("tone", saved.tone, saved.source);
  if (settings?.preferSteps) set("outputFormat", "steps", "your learned preferences");
  set("outputFormat", settings?.outputStyle, "your Prompt Defaults");
  if (settings?.preferExamples) set("examples", "yes", "your learned preferences");
  set("detail", { concise: 1, balanced: 2, detailed: 3 }[settings?.length], "your Prompt Defaults");
  return { answers, sources };
}

/* ---------- Building the prompt ---------- */
const ROLES = {
  marketing:
    "You are an expert marketing strategist with 10+ years of experience in digital marketing, brand positioning and growth. You give data-driven, practical recommendations tailored to the business goal.",
  business:
    "You are an experienced business consultant who turns goals and constraints into clear, decision-ready deliverables.",
  data: "You are a senior data analyst who finds the signal in data, states assumptions explicitly and explains findings in plain language.",
  education:
    "You are an expert instructional designer who builds structured, motivating learning plans matched to the learner's level.",
  writing: "You are a skilled writer and editor who adapts voice and structure to the reader and the purpose.",
  research:
    "You are a meticulous research assistant who relies on credible sources, separates evidence from opinion and cites what it uses.",
  career: "You are an experienced career coach and recruiter who knows what hiring managers look for.",
  general: "You are a knowledgeable assistant who gives accurate, well-structured and practical answers.",
};

const developerRole = ({ language, framework }) =>
  `You are a senior ${language && language !== "Other" ? `${language} ` : "software "}engineer${framework ? ` experienced with ${framework}` : ""}. You write clean, secure and well-tested code, explain the root cause before proposing a fix and follow the conventions of the stack in use.`;

const DEV_REQUIREMENTS = {
  "Fix a bug": ["Identify the most likely root cause", "Provide the corrected code", "Explain why the fix works", "Suggest how to prevent similar issues"],
  "Code review": ["Flag bugs and risky patterns", "Point out security and performance issues", "Suggest concrete improvements with code"],
  Refactor: ["Keep the existing behaviour unchanged", "Improve structure and naming", "Explain each significant change"],
  "Write tests": ["Cover the main paths and edge cases", "Use the project's test framework", "Explain what each test protects against"],
  "Explain code": ["Summarise what the code does", "Walk through the key parts step by step", "Call out anything surprising or risky"],
  "New feature": ["Propose an implementation approach", "Provide complete, working code", "Explain key design decisions", "Handle edge cases and errors"],
};

function requirementsFor(domain, answers) {
  const has = (name) => isAnswered({ type: Array.isArray(answers[name]) ? "multi" : "text" }, answers[name]);
  switch (domain) {
    case "marketing":
      return [
        "Market and competitor analysis",
        "Target audience personas",
        "Positioning and key messaging",
        has("budget") ? "Channel strategy with a budget split" : "Channel strategy",
        "Content and campaign ideas",
        "KPIs and how to measure them",
        has("timeline") ? `Execution roadmap covering ${answers.timeline}` : "Execution roadmap",
      ];
    case "development":
      return [
        ...(DEV_REQUIREMENTS[answers.devTask] ?? DEV_REQUIREMENTS["New feature"]),
        ...(answers.tests === "yes" ? ["Include unit tests"] : []),
        ...(answers.edgeCases === "yes" ? ["Handle edge cases: empty input, very large inputs, timeouts and concurrent requests"] : []),
        ...(answers.qualities?.length ? [`Prioritise ${answers.qualities.join(", ").toLowerCase()}`] : []),
      ];
    case "business":
      return ["Executive summary", "Situation analysis", "Recommendations with rationale", "Risks and mitigations", "Next steps with owners"];
    case "data":
      return ["Summarise the dataset and any quality issues", "Answer the analysis question with evidence", "Highlight key trends and outliers", "Recommend actions based on the findings", "Suggest charts that best show the results"];
    case "education":
      return ["Week-by-week plan", "Learning objectives for each week", "Recommended resources", ...(answers.quizzes === "yes" ? ["Quizzes or exercises to check progress"] : []), "Milestones to track progress"];
    case "writing":
      return ["Open by stating the purpose", ...(has("keyPoints") ? ["Cover every key point listed in the context"] : []), ...(has("cta") ? ["End with the call to action"] : ["Close appropriately for the reader"])];
    case "research":
      return ["Summarise the current state of knowledge", "Answer the research question directly", "Compare key viewpoints or findings", "Note limitations and open questions", ...(answers.citation && answers.citation !== "None" ? [`Cite sources in ${answers.citation} style`] : [])];
    case "career":
      return ["Tailor everything to the target role", "Lead with measurable achievements", "Use keywords hiring managers look for", "Keep it honest and specific"];
    default:
      return ["Answer the request directly", "Organise the answer logically", "Call out any assumptions"];
  }
}

const DETAIL_CONSTRAINTS = {
  1: "Keep it concise and focus on the essentials",
  2: "Balance depth with brevity",
  3: "Be thorough and cover each point in depth",
};

const OUTPUT_FORMATS = {
  structured: "Structured sections with clear headings",
  bullets: "Bulleted list",
  table: "Table where it helps comparison",
  steps: "Numbered step-by-step instructions",
  prose: "Flowing prose in short paragraphs",
};

const TAIL = new Set(["goal", "outputFormat", "tone", "detail", "examples", "tests", "quizzes", "edgeCases"]);

const sentence = (text) => {
  const trimmed = text.trim().replace(/\s+/g, " ");
  if (!trimmed) return "";
  const capped = trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
  return /[.!?]$/.test(capped) ? capped : `${capped}.`;
};

export const slugify = (text) =>
  text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60) || "prompt";

export function titleFrom(goal) {
  const { intent } = analyzeIntent(goal);
  const title = (intent || "Untitled prompt").replace(/\s+/g, " ").replace(/,?\s+(?:etc\.?|and so on)$/i, "").trim();
  return title.length > 60 ? `${title.slice(0, 57).replace(/\s+\S*$/, "")}…` : title;
}

/* -> { slug, title, model, modelId, domain, sections, … } in the same shape
   as GENERATED_PROMPT, so the workspace renders either. */
export function buildPrompt({ domain, answers, profile, settings, attachments = [] }) {
  const questions = visibleQuestions(questionsFor(domain, settings), answers);
  const answered = (name) => {
    const question = questions.find((item) => item.name === name);
    return question ? formatAnswer(question, answers[name]) : "";
  };

  const context = questions
    .filter((question) => question.context && !TAIL.has(question.name))
    .map((question) => ({ key: question.context, text: formatAnswer(question, answers[question.name]) }))
    .filter((item) => item.text);
  if (attachments.length) context.push({ key: "Attached files", text: attachments.map((file) => file.name).join(", ") });

  const constraints = [
    ...(answers.tone ? [`Use a${/^[aeiou]/.test(answers.tone) ? "n" : ""} ${answers.tone} tone`] : []),
    ...(answers.detail ? [DETAIL_CONSTRAINTS[answers.detail]] : []),
    ...(answered("length") ? [`Length: ${answered("length")}`] : []),
    ...(answered("budget") ? ["Keep recommendations within the stated budget"] : []),
    ...(answered("constraints") ? [sentence(answered("constraints")).replace(/\.$/, "")] : []),
    ...(profileValue(profile, "Coding Standards") && domain === "development" ? [`Follow these coding standards: ${profileValue(profile, "Coding Standards")}`] : []),
    "If information is missing, state your assumptions instead of inventing facts",
  ].map((text) => ({ text }));

  const output = [
    { key: "Format", text: OUTPUT_FORMATS[answers.outputFormat] ?? OUTPUT_FORMATS.structured },
    ...(answers.examples ? [{ key: "Examples", text: answers.examples === "yes" ? "Include concrete examples" : "Not needed" }] : []),
    { key: "Length", text: answered("detail") || "Balanced" },
    { key: "Language", text: "English" },
  ];

  const role = domain === "development" ? developerRole(answers) : ROLES[domain] ?? ROLES.general;
  const goal = answers.goal ?? "";
  const title = titleFrom(goal);
  const model = modelById(settings?.model) ?? modelById("gpt-4o");

  const sections = [
    { id: "role", label: "SYSTEM / ROLE", type: "text", content: role },
    { id: "objective", label: "OBJECTIVE", type: "text", content: sentence(goal) },
    ...(context.length ? [{ id: "context", label: "CONTEXT", type: "list", items: context }] : []),
    { id: "requirements", label: "REQUIREMENTS", type: "numbered", items: requirementsFor(domain, answers).map((text) => ({ text })) },
    { id: "constraints", label: "CONSTRAINTS", type: "list", items: constraints },
    { id: "output", label: "OUTPUT FORMAT", type: "list", items: output },
  ];

  return {
    slug: slugify(title),
    title,
    domain,
    model: model.name,
    modelId: model.id,
    generatedAt: "Just now",
    tip: "Use this prompt with any AI model to get high-quality results.",
    sections,
  };
}
