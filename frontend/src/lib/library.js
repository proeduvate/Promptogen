/* ---------------------------------------------------------------
   Turning prompts into My Prompts records, suggested tags (spec §25) and
   parsing pasted prompts into sections (spec §31).
   Hand-off point: the prompts API stores records and suggests tags.
----------------------------------------------------------------*/
import { domainLabel } from "./analysis";
import { analyzeQuality } from "./quality";
import { promptToText } from "./promptText";
import { SECTION_TEMPLATES, uniqueId } from "./sections";

const FOLDERS = { marketing: "marketing", development: "development", writing: "content", research: "research", business: "business", education: "education" };

const TAG_WORDS = ["Instagram", "LinkedIn", "SEO", "Email", "YouTube", "SaaS", "Launch", "Campaign", "Python", "JavaScript", "TypeScript", "FastAPI", "React", "Django", "SQL", "API", "Testing", "Resume", "Interview", "Lesson", "Research", "Report", "Budget", "KPIs"];

/* Domain plus up to three keywords found in the prompt. */
export function suggestTags(sections, domain) {
  const text = promptToText(sections);
  const words = TAG_WORDS.filter((word) => new RegExp(`\\b${word}\\b`, "i").test(text));
  return [...new Set([domainLabel(domain), ...words])].slice(0, 4);
}

const formatDate = (time) => new Date(time).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" });
const wordCount = (sections) => promptToText(sections).split(/\s+/).filter(Boolean).length;

/* -> a record in the shape My Prompts, Favorites and Model Lab expect. */
export function toLibraryRecord({ id, title, domain, model, versions, currentVersion, favorite = false, tested = null, tags }) {
  const now = new Date();
  const current = versions.find((version) => version.id === currentVersion) ?? versions[versions.length - 1];
  return {
    id,
    title,
    createdBy: "you",
    date: now.toISOString().slice(0, 10),
    created: now.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
    modifiedAt: now.getTime(),
    model,
    folder: FOLDERS[domain] ?? "personal",
    domain,
    tags: tags ?? suggestTags(current.sections, domain),
    score: analyzeQuality(current.sections, domain).overall,
    tested,
    favorite,
    currentVersion: current.id,
    versions: [...versions].reverse().map((version) => {
      const report = analyzeQuality(version.sections, domain);
      const dimension = (key) => report.dimensions.find((item) => item.id === key).score;
      return {
        id: version.id,
        date: formatDate(version.createdAt ?? Date.now()),
        metrics: { score: report.overall, words: wordCount(version.sections), clarity: dimension("clarity"), specificity: dimension("specificity"), actionability: dimension("actionability") },
        sections: version.sections,
      };
    }),
  };
}

/* ---------- Import (spec §31) ---------- */
const HEADING_KINDS = [
  [/^(?:system(?:\s*\/\s*role)?|role|persona|act as)$/i, "role"],
  [/^(?:task|objective|goal|instructions?|request)$/i, "objective"],
  [/^(?:context|background|details|information|inputs?)$/i, "context"],
  [/^(?:requirements?|deliverables?|steps|must include|include)$/i, "requirements"],
  [/^(?:constraints?|rules|guidelines|limitations|restrictions)$/i, "constraints"],
  [/^(?:output(?: format)?|format|response format|preferences|style)$/i, "output"],
  [/^(?:examples?|sample)$/i, "examples"],
];
const LIST_KINDS = new Set(["context", "requirements", "constraints", "output"]);
const CONSTRAINT = /\b(?:tone|avoid|don't|do not|never|must not|no more than|under \d+ words|keep (?:it|the)|limit|without)\b/i;
const FORMAT = /\b(?:format|table|bullet|json|markdown|headings?|respond (?:with|in)|output|word count|length)\b/i;
const ROLE = /^(?:you are|act as|as an?|imagine you are)\b/i;
const BULLET = /^\s*(?:[-*•]|\d+[.)])\s+/;

const kindOfHeading = (text) => HEADING_KINDS.find(([re]) => re.test(text.trim()))?.[1];

function headingOf(line) {
  const trimmed = line.trim();
  const match =
    trimmed.match(/^#{1,6}\s*(.+?)\s*:?$/) ?? trimmed.match(/^\*\*(.+?)\*\*:?$/) ?? trimmed.match(/^([A-Za-z][A-Za-z /]{1,30}):$/) ?? trimmed.match(/^([A-Z][A-Z /]{2,30})$/);
  return match ? kindOfHeading(match[1]) : null;
}

const toItem = (line) => {
  const text = line.replace(BULLET, "").trim();
  const keyed = text.match(/^([A-Za-z][\w /]{1,30}):\s+(.+)$/);
  return keyed ? { key: keyed[1].trim(), text: keyed[2].trim() } : { text };
};

function buildSections(groups) {
  const sections = [];
  // "You are…" lines before the first heading are the role, not the task.
  const split = groups.flatMap((group) =>
    group.kind === "objective" && group.lines.some((line) => ROLE.test(line.trim()))
      ? [
          { kind: "role", lines: group.lines.filter((line) => ROLE.test(line.trim())) },
          { kind: "objective", lines: group.lines.filter((line) => !ROLE.test(line.trim())) },
        ]
      : [group],
  );
  split.forEach(({ kind, lines }) => {
    const clean = lines.map((line) => line.trim()).filter(Boolean);
    if (!clean.length) return;
    const template = SECTION_TEMPLATES[kind] ?? SECTION_TEMPLATES.custom;
    const id = uniqueId(sections, kind);
    const type = kind === "requirements" ? "numbered" : LIST_KINDS.has(kind) ? "list" : "text";
    sections.push(type === "text" ? { id, label: template.label, type, content: clean.join(" ") } : { id, label: template.label, type, items: clean.map(toItem) });
  });
  return sections;
}

/* Splits a pasted prompt into sections, using its headings when it has them. */
export function parsePrompt(raw) {
  const lines = raw.replace(/\r/g, "").split("\n");
  if (lines.some((line) => headingOf(line))) {
    const groups = [];
    let current = { kind: "objective", lines: [] };
    lines.forEach((line) => {
      const inline = line.trim().match(/^([A-Za-z][A-Za-z /]{1,30}):\s+(.+)$/);
      const heading = headingOf(line);
      if (heading) {
        groups.push(current);
        current = { kind: heading, lines: [] };
      } else if (inline && kindOfHeading(inline[1])) {
        groups.push(current);
        current = { kind: kindOfHeading(inline[1]), lines: [inline[2]] };
      } else current.lines.push(line);
    });
    groups.push(current);
    return buildSections(groups);
  }

  // No headings: sort lines (or sentences) by what they look like.
  const units = lines.filter((line) => line.trim()).length > 1 ? lines : (raw.match(/[^.!?\n]+[.!?]*/g) ?? [raw]);
  const buckets = { role: [], objective: [], context: [], requirements: [], constraints: [], output: [] };
  units.forEach((unit) => {
    const text = unit.trim();
    if (!text) return;
    if (ROLE.test(text)) buckets.role.push(text);
    else if (CONSTRAINT.test(text)) buckets.constraints.push(text);
    else if (FORMAT.test(text)) buckets.output.push(text);
    else if (BULLET.test(unit)) buckets.requirements.push(text);
    else if (/^[A-Za-z][\w /]{1,30}:\s+\S/.test(text)) buckets.context.push(text);
    else if (!buckets.objective.length) buckets.objective.push(text);
    else buckets.context.push(text);
  });
  return buildSections(Object.entries(buckets).map(([kind, items]) => ({ kind, lines: items })));
}
