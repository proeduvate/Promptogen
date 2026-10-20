/* ---------------------------------------------------------------
   Client-side prompt checks used across Home, the question wizard and
   the workspace. They are deliberately simple heuristics so the UI works
   before the analysis API exists. Hand-off point: replace with the
   intent / quality / security services when they're available.
----------------------------------------------------------------*/
export { estimateTokens } from "./simulate";

/* ---------- Security scanner (spec §42) ---------- */
const SECRET_PATTERNS = [
  { label: "API key", re: /\bsk-(?:proj-|ant-)?[A-Za-z0-9_-]{16,}/g },
  { label: "API key", re: /\bAIza[0-9A-Za-z_-]{30,}/g },
  { label: "access key", re: /\bAKIA[0-9A-Z]{16}\b/g },
  { label: "access token", re: /\bgh[pousr]_[A-Za-z0-9]{30,}/g },
  { label: "access token", re: /\bxox[abpr]-[A-Za-z0-9-]{10,}/g },
  { label: "access token", re: /\bBearer\s+[A-Za-z0-9._-]{20,}/gi },
  { label: "access token", re: /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/g },
  { label: "private key", re: /-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?(?:-----END [A-Z ]*PRIVATE KEY-----|$)/g },
  { label: "password", re: /\b(?:password|passwd|pwd)\s*[:=]\s*\S{4,}/gi },
];
const PERSONAL_PATTERNS = [
  { label: "email address", re: /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi },
  { label: "phone number", re: /(?:\+\d{1,3}[\s-]?)?\b\d{3,5}[\s-]?\d{3,4}[\s-]?\d{3,4}\b/g },
];
const SUSPICIOUS_URL = /\bhttps?:\/\/(?:\d{1,3}(?:\.\d{1,3}){3}|[^\s/]*(?:bit\.ly|tinyurl\.com|goo\.gl|ngrok(?:-free)?\.(?:io|app)))[^\s]*/gi;
const INJECTION = /\b(?:ignore (?:all |any )?(?:the )?(?:previous|above|prior) instructions|disregard (?:the )?(?:system|previous) (?:prompt|instructions)|reveal (?:your|the) system prompt)\b/gi;
const EXTERNAL_CONTENT = /\b(?:the following (?:email|document|article|text|content|review|message)s?|pasted (?:text|content)|user[- ]submitted|scraped|web ?page content|from the (?:website|url|uploaded file))\b/i;

const matchesOf = (text, re) => [...text.matchAll(new RegExp(re.source, re.flags.includes("g") ? re.flags : `${re.flags}g`))];

/* Findings: { severity: "high" | "medium", kind, title, body, matches } */
export function scanSecurity(text) {
  if (!text?.trim()) return [];
  const findings = [];

  const secretLabels = new Map();
  SECRET_PATTERNS.forEach(({ label, re }) => {
    const found = matchesOf(text, re).map((match) => match[0]);
    if (found.length) secretLabels.set(label, [...(secretLabels.get(label) ?? []), ...found]);
  });
  secretLabels.forEach((found, label) => {
    findings.push({
      severity: "high",
      kind: "secret",
      title: "Sensitive information detected",
      body: `Your prompt appears to contain ${/^[aeiou]/i.test(label) ? "an" : "a"} ${label}. We recommend removing it before continuing.`,
      matches: found,
    });
  });

  PERSONAL_PATTERNS.forEach(({ label, re }) => {
    const found = matchesOf(text, re).map((match) => match[0]);
    if (found.length) {
      findings.push({
        severity: "medium",
        kind: "personal",
        title: "Potential personal data",
        body: `Your prompt includes ${found.length === 1 ? `an ${label}` : `${found.length} ${label}s`}. Make sure you're allowed to share it with an AI model.`,
        matches: found,
      });
    }
  });

  const urls = matchesOf(text, SUSPICIOUS_URL).map((match) => match[0]);
  if (urls.length) {
    findings.push({ severity: "medium", kind: "url", title: "Suspicious URL", body: "A link uses a raw IP address, a URL shortener or a tunnel. Check that it's trustworthy.", matches: urls });
  }

  const injected = matchesOf(text, INJECTION).map((match) => match[0]);
  if (injected.length) {
    findings.push({ severity: "medium", kind: "injection", title: "Untrusted external instructions", body: "The prompt contains text that tries to override instructions. If it came from another source, treat it as data, not commands.", matches: injected });
  }
  return findings;
}

/* Replace every matched secret / personal value with a placeholder. */
export function redact(text, findings) {
  let result = text;
  findings.forEach(({ matches = [], kind }) => {
    matches.forEach((match) => {
      result = result.split(match).join(kind === "secret" ? "[REDACTED]" : "[REMOVED]");
    });
  });
  return result;
}

/* Prompt injection awareness (spec §43). */
export const usesExternalContent = (text) => EXTERNAL_CONTENT.test(text ?? "");

/* ---------- Contradiction detection (spec §44) ---------- */
const CONTRADICTIONS = [
  {
    a: /\b(?:comprehensive|detailed|in-depth|thorough|exhaustive)\b/i,
    b: /\b(?:under|fewer than|less than|no more than|max(?:imum)? of)\s+\d+\s+words\b|\b(?:very brief|one[- ]line|one sentence|keep it short)\b/i,
    note: "These requirements may be difficult to satisfy simultaneously.",
  },
  {
    a: /\b(?:formal|professional tone)\b/i,
    b: /\b(?:casual|funny|humorous|slang|playful)\b/i,
    note: "The tone instructions point in opposite directions.",
  },
  {
    a: /\b(?:bullet points?|bulleted list)\b/i,
    b: /\b(?:no bullet points?|avoid bullets|paragraphs only|prose only)\b/i,
    note: "The format instructions conflict.",
  },
];

const sentenceAround = (text, index) => {
  const start = Math.max(text.lastIndexOf(".", index - 1), text.lastIndexOf("\n", index - 1)) + 1;
  const ends = [text.indexOf(".", index), text.indexOf("\n", index)].filter((value) => value !== -1);
  const end = ends.length ? Math.min(...ends) + 1 : text.length;
  return text.slice(start, end).trim();
};

/* [{ first, second, note }] quoting the conflicting instructions. */
export function detectContradictions(text) {
  if (!text) return [];
  return CONTRADICTIONS.flatMap(({ a, b, note }) => {
    const first = text.match(a);
    const second = text.match(b);
    if (!first || !second) return [];
    return [{ first: sentenceAround(text, first.index), second: sentenceAround(text, second.index), note }];
  });
}

/* ---------- Complexity (spec §47) ---------- */
const STEP_MARKERS = /\b(?:then|after that|next|finally|step \d|workflow|pipeline|stage|phase)\b/gi;

export function complexityOf(text) {
  const words = (text ?? "").trim().split(/\s+/).filter(Boolean).length;
  const steps = matchesOf(text ?? "", STEP_MARKERS).length;
  if (words === 0) return null;
  if (steps >= 3 || words > 220) return { level: "Advanced Workflow", tone: "text-pink" };
  if (words > 90 || steps >= 2) return { level: "Complex", tone: "text-amber" };
  if (words > 18) return { level: "Moderate", tone: "text-brand" };
  return { level: "Simple", tone: "text-good" };
}

/* ---------- Domain + intent (spec §3, §52) ---------- */
export const DOMAINS = {
  development: { label: "Development", keywords: /\b(?:code|coding|debug|bug|api|fastapi|django|flask|react|python|javascript|typescript|java|sql|database|deploy|backend|frontend|function|error|exception|refactor|unit tests?|app(?:lication)? (?:crash|error))\b/i },
  marketing: { label: "Marketing", keywords: /\b(?:marketing|campaign|brand|instagram|linkedin|seo|ads?|advertis|audience|launch|social media|content calendar|newsletter|promotion|go-to-market)\b/i },
  business: { label: "Business", keywords: /\b(?:business plan|strategy|stakeholders?|proposal|okrs?|revenue|pricing|competitor|market analysis|report for (?:the )?(?:board|management)|operations)\b/i },
  data: { label: "Data Analysis", keywords: /\b(?:analy[sz]e|analysis|data(?:set)?|sales data|spreadsheet|csv|excel|chart|metrics|kpis?|dashboard|trend)\b/i },
  research: { label: "Research", keywords: /\b(?:research|literature|study|paper|sources|citations?|survey|hypothesis|findings)\b/i },
  education: { label: "Education", keywords: /\b(?:lesson|study plan|learn(?:ing)?|teach|students?|course|quiz|curriculum|exam|syllabus)\b/i },
  writing: { label: "Writing", keywords: /\b(?:write|email|blog|article|essay|story|letter|copy|post|leave request|cover letter|rewrite|summari[sz]e)\b/i },
  career: { label: "Career", keywords: /\b(?:resume|cv|interview|job|career|linkedin profile|promotion|salary)\b/i },
};

export function detectDomain(text) {
  if (!text?.trim()) return "general";
  const scores = Object.entries(DOMAINS).map(([id, { keywords }]) => [id, matchesOf(text, keywords).length]);
  const [best, hits] = scores.sort((a, b) => b[1] - a[1])[0];
  return hits > 0 ? best : "general";
}

export const domainLabel = (id) => DOMAINS[id]?.label ?? "General";

/* What the request already says, per piece of information a domain needs. */
export const INFO_DETECTORS = {
  Product: /\b(?:app|product|service|platform|tool|saas|startup|store|brand)\b/i,
  "Target audience": /\b(?:for|targeting|aimed at|audience|customers|users|students|professionals|teams)\b\s+\w+/i,
  Market: /\b(?:india|usa|us|uk|europe|germany|canada|australia|global|local|asia|middle east|singapore)\b/i,
  Budget: /(?:[$₹€£]\s?\d|\bbudget\b|\brs\.?\s?\d)/i,
  Timeline: /\b\d+\s*(?:day|week|month|quarter|year)s?\b|\b(?:q[1-4]|this (?:week|month|quarter)|next (?:week|month|quarter))\b/i,
  Channels: /\b(?:instagram|linkedin|google ads|seo|email|youtube|facebook|tiktok|twitter|whatsapp)\b/i,
  Objective: /\b(?:awareness|leads?|sales|downloads|retention|sign-?ups?|growth|conversions?)\b/i,
  Language: /\b(?:python|javascript|typescript|java|golang|go|rust|c#|php|ruby|kotlin|swift)\b/i,
  Framework: /\b(?:fastapi|django|flask|react|vue|angular|next\.?js|express|spring|rails|laravel)\b/i,
  Database: /\b(?:postgres(?:ql)?|mysql|mongodb|sqlite|redis|dynamodb)\b/i,
  "Error message": /\b(?:error|exception|traceback|stack ?trace|returns? \d{3})\b/i,
  "Expected behavior": /\b(?:should|expected|supposed to)\b/i,
  Company: /\b(?:company|business|organi[sz]ation|firm|my startup)\b/i,
  Deliverable: /\b(?:report|plan|deck|presentation|document|memo|proposal|summary)\b/i,
  Data: /\b(?:data|dataset|csv|spreadsheet|numbers|figures)\b/i,
  "Output format": /\b(?:table|bullet|list|markdown|json|slides?|steps?)\b/i,
  Tone: /\b(?:formal|casual|friendly|professional|funny|persuasive)\b/i,
  Recipient: /\b(?:to my|to the|manager|boss|client|team|hr)\b/i,
  Level: /\b(?:beginner|intermediate|advanced|grade \d+|class \d+)\b/i,
  Duration: /\b\d+\s*(?:minutes?|hours?|days?|weeks?|months?)\b/i,
  Topic: /\b(?:about|on|regarding)\s+\w+/i,
};

export const DOMAIN_NEEDS = {
  marketing: ["Product", "Target audience", "Market", "Budget", "Objective", "Channels", "Timeline", "Output format"],
  development: ["Language", "Framework", "Database", "Error message", "Expected behavior", "Output format"],
  business: ["Company", "Objective", "Target audience", "Timeline", "Budget", "Deliverable"],
  data: ["Data", "Objective", "Timeline", "Output format"],
  research: ["Topic", "Target audience", "Deliverable", "Output format"],
  education: ["Topic", "Level", "Duration", "Output format"],
  writing: ["Topic", "Recipient", "Tone", "Output format"],
  career: ["Objective", "Target audience", "Tone", "Output format"],
  general: ["Objective", "Target audience", "Output format", "Tone"],
};

const firstClause = (text) => text.trim().split(/[.!?\n]/)[0].replace(/^(?:please|can you|could you|help me|i want to|i need to)\s+/i, "");

/* { domain, intent, known: [label], missing: [label] } — spec §3. */
export function analyzeIntent(text) {
  const domain = detectDomain(text);
  const needs = DOMAIN_NEEDS[domain];
  const known = needs.filter((label) => INFO_DETECTORS[label]?.test(text));
  const missing = needs.filter((label) => !known.includes(label));
  const clause = firstClause(text);
  const intent = clause ? clause.charAt(0).toUpperCase() + clause.slice(1) : "";
  return { domain, intent, known, missing };
}
