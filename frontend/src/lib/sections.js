/* ---------------------------------------------------------------
   Helpers for working with a prompt's sections (see lib/promptText for
   the section shape). A section's kind is its id without the "-2"
   suffix duplicates get, so "context-2" is still a context section.
----------------------------------------------------------------*/
import { sectionBody } from "./promptText";

export const kindOf = (section) => section.id.split("-")[0];

/* Order models follow best; new sections are inserted at their place in it. */
export const CANONICAL = ["role", "objective", "task", "context", "requirements", "constraints", "preferences", "output", "examples", "custom"];

export const SECTION_TEMPLATES = {
  role: { label: "SYSTEM / ROLE", type: "text", content: "You are an expert in this field who gives accurate, practical answers." },
  objective: { label: "OBJECTIVE", type: "text", content: "Describe the task in one or two sentences." },
  context: { label: "CONTEXT", type: "list", items: [{ key: "Background", text: "Add what the AI should know" }] },
  requirements: { label: "REQUIREMENTS", type: "numbered", items: [{ text: "Add what the response must include" }] },
  constraints: { label: "CONSTRAINTS", type: "list", items: [{ text: "Add limits such as tone, length or what to avoid" }] },
  output: { label: "OUTPUT FORMAT", type: "list", items: [{ key: "Format", text: "Structured sections with clear headings" }] },
  examples: { label: "EXAMPLES", type: "text", content: "Paste an example of the output you want." },
  custom: { label: "NOTES", type: "text", content: "Anything else the AI should know." },
};

export const ADDABLE_KINDS = ["role", "objective", "context", "requirements", "constraints", "output", "examples", "custom"];

export const findKind = (sections, ...kinds) => sections.find((section) => kinds.includes(kindOf(section)));

export const textOf = (sections, ...kinds) =>
  sections
    .filter((section) => kinds.length === 0 || kinds.includes(kindOf(section)))
    .map(sectionBody)
    .join("\n");

export const itemText = ({ key, text }) => (key ? `${key}: ${text}` : text);

export function uniqueId(sections, kind) {
  if (!sections.some((section) => section.id === kind)) return kind;
  let n = 2;
  while (sections.some((section) => section.id === `${kind}-${n}`)) n += 1;
  return `${kind}-${n}`;
}

export function newSection(sections, kind) {
  const template = SECTION_TEMPLATES[kind];
  return {
    id: uniqueId(sections, kind),
    label: template.label,
    type: template.type,
    ...(template.type === "text" ? { content: template.content } : { items: template.items.map((item) => ({ ...item })) }),
  };
}

const rank = (section) => {
  const index = CANONICAL.indexOf(kindOf(section));
  return index === -1 ? CANONICAL.length : index;
};

/* Insert `section` after the last section that comes before it canonically. */
export function insertSection(sections, section) {
  const position = sections.reduce((at, current, index) => (rank(current) <= rank(section) ? index + 1 : at), 0);
  return [...sections.slice(0, position), section, ...sections.slice(position)];
}

export const isCanonicalOrder = (sections) => sections.every((section, index) => index === 0 || rank(sections[index - 1]) <= rank(section));

export const sortCanonical = (sections) =>
  sections
    .map((section, index) => ({ section, index }))
    .sort((a, b) => rank(a.section) - rank(b.section) || a.index - b.index)
    .map(({ section }) => section);

export const cloneSections = (sections) =>
  sections.map((section) => (section.items ? { ...section, items: section.items.map((item) => ({ ...item })) } : { ...section }));
