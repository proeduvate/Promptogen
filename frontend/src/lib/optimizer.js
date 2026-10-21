/* ---------------------------------------------------------------
   Goal-based prompt optimizer (spec §8) with explainable changes
   (spec §9). Each mode proposes a list of changes; every change says
   what it touches, what it was, what it becomes and why, so the user
   can accept or reject them one by one.
   Change shapes:
     { kind: "modified", sectionId, index|null, before, after, reason }
     { kind: "added",    sectionId, item, reason }        new list line
     { kind: "added",    section, reason }                new section
     { kind: "removed",  sectionId, index, before, reason }
     { kind: "moved",    order: [sectionId], reason }
   Hand-off point: the optimization service returns these changes.
----------------------------------------------------------------*/
import {
  Eye,
  Crosshair,
  Layers,
  LayoutList,
  ShieldCheck,
  FileText,
  Minimize2,
  Maximize2,
  BadgeCheck,
  TriangleAlert,
  Lightbulb,
  Coins,
  Cpu,
  Feather,
  Briefcase,
} from "lucide-react";
import { CONTEXT_GAPS, contextGaps } from "./quality";
import { CANONICAL, cloneSections, findKind, insertSection, isCanonicalOrder, itemText, kindOf, newSection, sortCanonical, textOf } from "./sections";
import { modelById } from "../data/models";

export const OPTIMIZER_MODES = [
  { id: "clarity", label: "Improve Clarity", icon: Eye, hint: "Sharper objective, no vague words" },
  { id: "specificity", label: "Improve Specificity", icon: Crosshair, hint: "Concrete quantities and scope" },
  { id: "context", label: "Add Missing Context", icon: Layers, hint: "Fill gaps the AI would guess" },
  { id: "structure", label: "Improve Structure", icon: LayoutList, hint: "Standard sections in the right order" },
  { id: "constraints", label: "Add Constraints", icon: ShieldCheck, hint: "Limits on tone, length and scope" },
  { id: "format", label: "Improve Output Format", icon: FileText, hint: "A precise response layout" },
  { id: "concise", label: "Make More Concise", icon: Minimize2, hint: "Remove filler and repetition" },
  { id: "detailed", label: "Make More Detailed", icon: Maximize2, hint: "Ask for depth and reasoning" },
  { id: "reliability", label: "Improve Reliability", icon: BadgeCheck, hint: "Fewer made-up facts" },
  { id: "edge-cases", label: "Add Edge Cases", icon: TriangleAlert, hint: "Cover what can go wrong" },
  { id: "examples", label: "Add Examples", icon: Lightbulb, hint: "Anchor the output with examples" },
  { id: "tokens", label: "Reduce Token Usage", icon: Coins, hint: "Same result, fewer tokens" },
  { id: "model", label: "Optimize for Selected Model", icon: Cpu, hint: "Tune for the model you use" },
  { id: "simplify", label: "Simplify Prompt", icon: Feather, hint: "Fewer, clearer instructions" },
  { id: "professional", label: "Make More Professional", icon: Briefcase, hint: "Formal wording and tone" },
];

export const modeById = (id) => OPTIMIZER_MODES.find((mode) => mode.id === id);

const VAGUE_INLINE = /\s*\b(?:something|some kind of|whatever)\b/gi;
const LEAD_IN = /^(?:please\s+)?(?:can you|could you|help me(?: to)?|i want(?: you)? to|i need(?: you)? to|i'd like(?: you)? to)\s+/i;
const FILLER = [
  [/\bin order to\b/gi, "to"],
  [/\bplease\s+/gi, ""],
  [/\bmake sure (?:to|that you)\s+/gi, ""],
  [/\bit is important that you\s+/gi, ""],
  [/\b(?:very|really|basically|actually|just)\s+/gi, ""],
  [/\s+etc\.?/gi, ""],
  [/\s+and so on\b/gi, ""],
];
const CASUAL = [
  [/\bgonna\b/gi, "going to"],
  [/\bwanna\b/gi, "want to"],
  [/\bawesome\b/gi, "excellent"],
  [/\bcool\b/gi, "effective"],
  [/\bstuff\b/gi, "material"],
  [/\bkinda\b/gi, "somewhat"],
  [/\ba lot of\b/gi, "many"],
  [/\bfunny\b/gi, "engaging"],
];

const capitalise = (text) => text.charAt(0).toUpperCase() + text.slice(1);
const tidy = (text) => text.replace(/\s{2,}/g, " ").replace(/\s+([.,;:])/g, "$1").trim();
const rewrite = (text, rules) => tidy(rules.reduce((current, [re, to]) => current.replace(re, to), text));
const has = (sections, re, ...kinds) => re.test(textOf(sections, ...kinds));
const contextValue = (sections, re) => findKind(sections, "context")?.items.find((item) => re.test(item.key ?? ""))?.text;

/* Changes that run text-rewriting `rules` over every section. */
function rewriteAll(sections, rules, reason) {
  const changes = [];
  sections.forEach((section) => {
    if (section.type === "text") {
      const after = capitalise(rewrite(section.content, rules));
      if (after && after !== section.content) changes.push({ kind: "modified", sectionId: section.id, index: null, before: section.content, after, reason });
      return;
    }
    section.items.forEach((item, index) => {
      const text = capitalise(rewrite(item.text, rules));
      if (text && text !== item.text) changes.push({ kind: "modified", sectionId: section.id, index, before: item, after: { ...item, text }, reason });
    });
  });
  return changes;
}

const addLine = (sections, kind, item, reason) => {
  const existing = findKind(sections, kind);
  if (existing?.items?.some((current) => current.text.toLowerCase() === item.text.toLowerCase())) return [];
  return [{ kind: "added", sectionId: existing?.id ?? kind, item, reason }];
};

const setKeyed = (sections, kind, key, text, reason) => {
  const section = findKind(sections, kind);
  const index = section?.items?.findIndex((item) => item.key?.toLowerCase() === key.toLowerCase()) ?? -1;
  if (index >= 0) {
    const before = section.items[index];
    return before.text === text ? [] : [{ kind: "modified", sectionId: section.id, index, before, after: { ...before, text }, reason }];
  }
  return [{ kind: "added", sectionId: section?.id ?? kind, item: { key, text }, reason }];
};

const shortenRole = (sections, reason) => {
  const role = findKind(sections, "role");
  if (!role) return [];
  const first = role.content.match(/^.*?[.!?](?=\s|$)/)?.[0] ?? role.content;
  return first.length < role.content.length ? [{ kind: "modified", sectionId: role.id, index: null, before: role.content, after: first, reason }] : [];
};

const duplicateLines = (sections) =>
  sections.flatMap((section) => {
    const seen = new Set();
    return (section.items ?? []).flatMap((item, index) => {
      const norm = item.text.trim().toLowerCase();
      if (!seen.has(norm)) {
        seen.add(norm);
        return [];
      }
      return [{ kind: "removed", sectionId: section.id, index, before: item, reason: "Repeats an earlier line, so it only costs tokens." }];
    });
  });

const SPECIFICS = [
  [/^((?:target )?(?:audience )?personas?)$/i, () => "3 detailed target audience personas", "Sets how many personas to produce."],
  [/\bpersonas?\b/i, (text) => (/\d/.test(text) ? null : `${text} (3 personas)`), "Sets how many personas to produce."],
  [/\bkpis?\b/i, (text) => (/measurable|targets?/i.test(text) ? null : `${text} with measurable targets`), "Makes success measurable."],
  [/\broadmap\b/i, (text) => (/week/i.test(text) ? null : `Week-by-week ${text.charAt(0).toLowerCase()}${text.slice(1)}`), "Defines the planning granularity."],
  [/\bcompetitor/i, (text) => (/\d/.test(text) ? null : `${text} covering the top 3 competitors`), "Limits the analysis to a useful scope."],
  [/\bideas?\b/i, (text) => (/\d/.test(text) ? null : `${text} (at least 5)`), "Sets a minimum number of ideas."],
  [/\brecommendations?\b/i, (text) => (/\d|prioriti/i.test(text) ? null : `${text}, prioritised (3–5)`), "Asks for a ranked, bounded list."],
  [/\bcorrected code\b/i, (text) => (/runnable/i.test(text) ? null : `${text} as a complete, runnable snippet`), "Prevents partial code fragments."],
];

const MODEL_TIPS = {
  "claude-3-5-sonnet": [
    ["constraints", { text: "Wrap any long supplied material in <document> tags and refer to it by tag" }, "Claude follows XML-tagged structure closely."],
    ["output", { key: "Structure", text: "Use clear headings and put the final answer last" }, "Claude handles explicit structure and ordering well."],
  ],
  "gpt-4o": [
    ["output", { key: "Structure", text: "Use Markdown headings and numbered lists" }, "GPT-4o responds well to explicit Markdown structure."],
    ["constraints", { text: "Answer every requirement in the order given" }, "Keeps GPT-4o from merging or skipping requirements."],
  ],
  "gemini-1-5-pro": [
    ["constraints", { text: "Put the direct answer first, then supporting detail" }, "Gemini performs best when the task leads and detail follows."],
  ],
  "llama-3-1-70b": [
    ["constraints", { text: "Follow the requirements in order and keep each answer focused" }, "Open models do better with short, explicit instructions."],
  ],
  "mistral-large": [
    ["constraints", { text: "Use short, direct sentences" }, "Mistral keeps better focus with concise instructions."],
  ],
};

const MODES = {
  clarity(sections) {
    const changes = [];
    const objective = findKind(sections, "objective", "task");
    if (objective) {
      let after = capitalise(objective.content.trim().replace(LEAD_IN, ""));
      const reasons = [];
      if (after !== objective.content.trim()) reasons.push("Leads with the action instead of a request.");
      const trimmed = rewrite(after, [[/\s+etc\.?/gi, ""], [/\s+and so on\b/gi, ""]]);
      if (trimmed !== after) reasons.push("Removed “etc.”: an open-ended list leaves the scope unclear.");
      after = trimmed;
      if (/^write an? .*\b(?:strategy|plan|roadmap|analysis|framework)\b/i.test(after)) {
        after = after.replace(/^write/i, "Create");
        reasons.push("“Create” fits a plan or strategy better than “write”.");
      }
      const audience = contextValue(sections, /audience/i);
      if (audience && !after.toLowerCase().includes(audience.toLowerCase().split(",")[0])) {
        after = `${after.replace(/[.!?]$/, "")} targeted at ${audience.charAt(0).toLowerCase()}${audience.slice(1)}.`;
        reasons.push(`Added “targeted at ${audience}”: defines the target audience.`);
      }
      const timeline = contextValue(sections, /timeline|duration|period/i);
      if (timeline && !after.toLowerCase().includes(timeline.toLowerCase())) {
        after = `${after.replace(/[.!?]$/, "")}, covering ${timeline}.`;
        reasons.push(`Added “${timeline}”: provides a defined planning period.`);
      }
      after = tidy(after.replace(VAGUE_INLINE, ""));
      if (!/[.!?]$/.test(after)) after = `${after}.`;
      if (after !== objective.content) {
        changes.push({ kind: "modified", sectionId: objective.id, index: null, before: objective.content, after, reason: reasons.join(" ") || "Removes vague wording." });
      }
    }
    changes.push(...rewriteAll(sections.filter((section) => section !== objective), [[/\s+etc\.?/gi, ""], [/\s+and so on\b/gi, ""]], "“etc.” leaves the scope open; listing what you want is clearer."));
    if (!findKind(sections, "role")) {
      changes.push({ kind: "added", section: newSection(sections, "role"), reason: "A role sets the expertise and perspective the AI should use." });
    }
    return changes;
  },

  specificity(sections) {
    const requirements = findKind(sections, "requirements");
    return (requirements?.items ?? []).flatMap((item, index) => {
      for (const [re, make, reason] of SPECIFICS) {
        if (!re.test(item.text)) continue;
        const text = make(item.text);
        if (text && text !== item.text) return [{ kind: "modified", sectionId: requirements.id, index, before: item, after: { ...item, text }, reason }];
        return [];
      }
      return [];
    });
  },

  context(sections, { domain }) {
    return contextGaps(sections, domain).map((label) => {
      const gap = CONTEXT_GAPS[label];
      return { kind: "added", sectionId: findKind(sections, "context")?.id ?? "context", item: { key: gap.key, text: gap.text }, reason: `The AI no longer has to guess the ${gap.name.toLowerCase()}.` };
    });
  },

  structure(sections) {
    const changes = [];
    if (!findKind(sections, "role")) changes.push({ kind: "added", section: newSection(sections, "role"), reason: "A role sets the expertise the AI should use." });
    if (!findKind(sections, "constraints", "preferences")) {
      changes.push({ kind: "added", section: { ...newSection(sections, "constraints"), items: [{ text: "If information is missing, state your assumptions instead of inventing facts" }] }, reason: "Gives the response clear limits." });
    }
    if (!findKind(sections, "output", "preferences")) {
      changes.push({ kind: "added", section: { ...newSection(sections, "output"), items: [{ key: "Format", text: "Structured sections with clear headings" }, { key: "Length", text: "Balanced" }] }, reason: "Defines what the response should look like." });
    }
    if (!isCanonicalOrder(sections)) {
      changes.push({ kind: "moved", order: sortCanonical(sections).map((section) => section.id), reason: "Puts sections in the order models follow best: role, objective, context, requirements, constraints, output." });
    }
    return changes;
  },

  constraints(sections) {
    return [
      ...(has(sections, /\btone\b/i, "constraints", "preferences") ? [] : addLine(sections, "constraints", { text: "Use a professional, clear tone" }, "Sets the voice of the response.")),
      ...addLine(sections, "constraints", { text: "Avoid jargon unless the audience is technical" }, "Keeps the response readable for the intended audience."),
      ...(has(sections, /\bwords?\b|\bunder \d+/i, "constraints", "preferences", "output") ? [] : addLine(sections, "constraints", { text: "Keep each section under 150 words" }, "Bounds the length so the answer stays focused.")),
      ...(has(sections, /\bassum/i) ? [] : addLine(sections, "constraints", { text: "If information is missing, state your assumptions instead of inventing facts" }, "Stops the AI from filling gaps with made-up details.")),
    ];
  },

  format(sections) {
    return [
      ...setKeyed(sections, "output", "Format", "Markdown with an H2 heading per requirement, bullet points, and tables for comparisons", "A precise layout makes the response easy to scan and reuse."),
      ...setKeyed(sections, "output", "Start With", "A 3-sentence executive summary", "Readers get the conclusion first."),
      ...setKeyed(sections, "output", "End With", "Prioritised next steps", "Ends with something the reader can act on."),
    ];
  },

  concise(sections) {
    return [...shortenRole(sections, "Keeps the essential expertise; the extra sentences didn't change the output."), ...rewriteAll(sections, FILLER, "Removes filler words that add tokens but no meaning."), ...duplicateLines(sections)];
  },

  detailed(sections) {
    return [
      ...addLine(sections, "requirements", { text: "Explain the reasoning behind each recommendation" }, "Asks the AI to justify its answers, not just list them."),
      ...addLine(sections, "requirements", { text: "Include a short, realistic example for each key point" }, "Examples make abstract advice concrete."),
      ...addLine(sections, "requirements", { text: "Call out risks and how to mitigate them" }, "Covers what could go wrong."),
      ...setKeyed(sections, "output", "Length", "Detailed", "Signals that depth is expected."),
    ];
  },

  reliability(sections) {
    return [
      ...(has(sections, /\bassum/i) ? [] : addLine(sections, "constraints", { text: "If information is missing, state your assumptions instead of inventing facts" }, "Stops the AI from filling gaps with made-up details.")),
      ...addLine(sections, "constraints", { text: "Do not invent statistics, quotes or sources; label estimates clearly" }, "Reduces hallucinated facts."),
      ...addLine(sections, "constraints", { text: "Before answering, check that every requirement is covered" }, "A self-check catches skipped requirements."),
      ...addLine(sections, "constraints", { text: "Say so if part of the request cannot be answered reliably" }, "Makes uncertainty visible instead of hidden."),
    ];
  },

  "edge-cases"(sections, { domain }) {
    if (domain === "development") {
      return [
        ...addLine(sections, "requirements", { text: "Handle edge cases: empty input, very large inputs, timeouts and concurrent requests" }, "Most production bugs live in these cases."),
        ...addLine(sections, "requirements", { text: "Return clear error messages for invalid input" }, "Makes failures easy to diagnose."),
      ];
    }
    return [
      ...addLine(sections, "requirements", { text: "Describe what could go wrong and how to respond" }, "Prepares for the cases a plan usually ignores."),
      ...addLine(sections, "requirements", { text: "Include a fallback plan if the main assumptions don't hold" }, "Keeps the plan useful when conditions change."),
    ];
  },

  examples(sections) {
    return [
      ...setKeyed(sections, "output", "Examples", "Include one concrete example per section", "Examples anchor the style and level of detail."),
      ...addLine(sections, "requirements", { text: "Illustrate key points with a short, realistic example" }, "Shows rather than tells."),
    ];
  },

  tokens(sections) {
    const objective = (findKind(sections, "objective", "task")?.content ?? "").toLowerCase();
    const context = findKind(sections, "context");
    const restated = (context?.items ?? []).flatMap((item, index) =>
      item.text.length > 3 && objective.includes(item.text.toLowerCase())
        ? [{ kind: "removed", sectionId: context.id, index, before: item, reason: "Already stated in the objective." }]
        : [],
    );
    return [...shortenRole(sections, "A one-sentence role gives the same guidance with fewer tokens."), ...rewriteAll(sections, FILLER, "Removes filler words that add tokens but no meaning."), ...duplicateLines(sections), ...restated];
  },

  model(sections, { modelId }) {
    return (MODEL_TIPS[modelId] ?? MODEL_TIPS["gpt-4o"]).flatMap(([kind, item, reason]) =>
      item.key ? setKeyed(sections, kind, item.key, item.text, reason) : addLine(sections, kind, item, reason),
    );
  },

  simplify(sections) {
    const requirements = findKind(sections, "requirements");
    const extra = (requirements?.items ?? []).slice(5).map((item, offset) => ({ kind: "removed", sectionId: requirements.id, index: offset + 5, before: item, reason: "Focuses the response on the five most important requirements." }));
    return [...shortenRole(sections, "A shorter role is easier to follow."), ...extra, ...duplicateLines(sections)];
  },

  professional(sections) {
    const changes = rewriteAll(sections, CASUAL, "Replaces casual wording with professional language.");
    const constraints = findKind(sections, "constraints", "preferences");
    const toneIndex = constraints?.items?.findIndex((item) => /\btone\b/i.test(itemText(item))) ?? -1;
    if (toneIndex >= 0) {
      const before = constraints.items[toneIndex];
      if (!/professional|formal/i.test(before.text)) {
        changes.push({ kind: "modified", sectionId: constraints.id, index: toneIndex, before, after: before.key ? { ...before, text: "Professional" } : { ...before, text: "Use a professional tone" }, reason: "Sets a professional tone." });
      }
    } else {
      changes.push(...addLine(sections, "constraints", { text: "Use a professional tone" }, "Sets a professional tone."));
    }
    return changes.filter((change, index, list) => !(change.kind === "modified" && list.findIndex((other) => other.sectionId === change.sectionId && other.index === change.index) !== index));
  },
};

/* Proposed changes for `modeId`, each with a stable id. */
export function proposeChanges(modeId, sections, { domain, modelId } = {}) {
  const changes = MODES[modeId]?.(sections, { domain, modelId }) ?? [];
  return changes.map((change, index) => ({ ...change, id: `${modeId}-${index}` }));
}

/* Applies the given changes (usually the accepted subset) to `sections`. */
export function applyChanges(sections, changes) {
  let next = cloneSections(sections);
  const byId = (id) => next.find((section) => section.id === id);

  changes.filter((change) => change.kind === "modified").forEach((change) => {
    const section = byId(change.sectionId);
    if (!section) return;
    if (change.index == null) section.content = change.after;
    else section.items[change.index] = { ...change.after };
  });

  changes
    .filter((change) => change.kind === "removed")
    .sort((a, b) => b.index - a.index)
    .forEach((change) => {
      const section = byId(change.sectionId);
      if (section?.items?.[change.index]) section.items.splice(change.index, 1);
    });

  changes.filter((change) => change.kind === "added").forEach((change) => {
    if (change.section) {
      if (!byId(change.section.id)) next = insertSection(next, cloneSections([change.section])[0]);
      return;
    }
    let section = byId(change.sectionId);
    if (!section) {
      const kind = change.sectionId.split("-")[0];
      section = { ...newSection(next, kind), items: [] };
      next = insertSection(next, section);
    }
    section.items.push({ ...change.item });
  });

  const moved = changes.find((change) => change.kind === "moved");
  if (moved) {
    const rank = (section) => {
      const index = moved.order.indexOf(section.id);
      return index === -1 ? moved.order.length + CANONICAL.indexOf(kindOf(section)) : index;
    };
    next = [...next].sort((a, b) => rank(a) - rank(b));
  }
  return next;
}

/* Text shown for each side of a change in the diff view. */
export function changeText(change, sections) {
  const label = sections.find((section) => section.id === change.sectionId)?.label ?? change.section?.label ?? change.sectionId?.toUpperCase();
  const show = (value) => (value == null ? "" : typeof value === "string" ? value : itemText(value));
  if (change.kind === "moved") {
    return { label: "Section order", before: sections.map((section) => section.label).join(" → "), after: change.order.map((id) => sections.find((section) => section.id === id)?.label ?? id).join(" → ") };
  }
  if (change.section) {
    const body = change.section.type === "text" ? change.section.content : change.section.items.map(itemText).join("\n");
    return { label: change.section.label, before: "", after: body };
  }
  return { label, before: show(change.before), after: show(change.after ?? change.item) };
}

export const modelName = (modelId) => modelById(modelId)?.name ?? "GPT-4o";

/* ---------- Per-section AI actions (spec §10) ---------- */
const EXPANSIONS = {
  role: "You explain your reasoning and adapt to the reader's level.",
  objective: "Explain the reasoning behind each part and keep it practical.",
  task: "Explain the reasoning behind each part and keep it practical.",
};
const EXTRA_ITEMS = {
  context: [{ key: "Success Criteria", text: "Clear, actionable output the team can use immediately" }],
  requirements: [{ text: "Explain the reasoning behind each point" }, { text: "Call out risks and how to mitigate them" }],
  constraints: [{ text: "Avoid jargon unless the audience is technical" }, { text: "Do not invent statistics; label estimates clearly" }],
  output: [{ key: "Start With", text: "A short summary" }, { key: "Examples", text: "Include one concrete example per section" }],
};
EXTRA_ITEMS.preferences = EXTRA_ITEMS.output;

const sentences = (text) => text.match(/[^.!?]+[.!?]*/g)?.map((part) => part.trim()).filter(Boolean) ?? [text];

/* Returns the transformed section (or the same object when nothing changes). */
export function transformSection(action, section, sections, ctx = {}) {
  const kind = kindOf(section);
  const cleanItems = (items) => items.map((item) => ({ ...item, text: capitalise(rewrite(item.text, FILLER)).replace(/\.$/, "") }));

  if (action === "shorten") {
    if (section.type === "text") {
      const parts = sentences(rewrite(section.content, FILLER));
      const kept = parts.slice(0, Math.max(1, Math.ceil(parts.length / 2))).join(" ");
      return kept === section.content ? section : { ...section, content: kept };
    }
    const items = cleanItems(section.items);
    const keep = items.length > 4 ? Math.max(3, Math.ceil(items.length * 0.7)) : items.length;
    return { ...section, items: items.slice(0, keep) };
  }

  if (action === "expand") {
    if (section.type === "text") {
      const extra = EXPANSIONS[kind] ?? "Include enough detail for the AI to follow without guessing.";
      return section.content.includes(extra) ? section : { ...section, content: `${section.content.trim()} ${extra}`.trim() };
    }
    const existing = new Set(section.items.map((item) => item.text.toLowerCase()));
    const additions = (EXTRA_ITEMS[kind] ?? [{ text: "Add one more specific detail here" }]).filter((item) => !existing.has(item.text.toLowerCase()));
    return additions.length ? { ...section, items: [...section.items, ...additions] } : section;
  }

  if (action === "rewrite") {
    if (section.type === "text") {
      let content = capitalise(rewrite(section.content.trim().replace(LEAD_IN, ""), [...FILLER, ...CASUAL]));
      if (content && !/[.!?]$/.test(content)) content = `${content}.`;
      return content === section.content ? section : { ...section, content };
    }
    return { ...section, items: cleanItems(section.items.map((item) => ({ ...item, text: rewrite(item.text, CASUAL) }))) };
  }

  // improve: the relevant optimizer changes, limited to this section
  const changes = ["clarity", "specificity", "context", "format", "constraints"]
    .flatMap((modeId) => proposeChanges(modeId, sections, ctx))
    .filter((change) => change.sectionId === section.id && change.kind !== "moved" && !change.section);
  if (changes.length === 0) return transformSection("expand", section, sections, ctx);
  return applyChanges(sections, changes).find((candidate) => candidate.id === section.id) ?? section;
}

export const SECTION_ACTIONS = [
  { id: "improve", label: "Improve with AI", verb: "improved" },
  { id: "rewrite", label: "Rewrite", verb: "rewrote" },
  { id: "shorten", label: "Shorten", verb: "shortened" },
  { id: "expand", label: "Expand", verb: "expanded" },
];

/* Rough share of the prompt that is filler, repetition or restated context (spec §48). */
export function redundancyOf(sections) {
  const all = textOf(sections);
  const total = all.split(/\s+/).filter(Boolean).length || 1;
  const filler = FILLER.reduce((count, [re]) => count + (all.match(new RegExp(re.source, re.flags)) ?? []).join(" ").split(/\s+/).filter(Boolean).length, 0);
  const duplicates = duplicateLines(sections).reduce((count, change) => count + itemText(change.before).split(/\s+/).length, 0);
  const roleExtra = shortenRole(sections, "")[0];
  const role = roleExtra ? roleExtra.before.split(/\s+/).length - roleExtra.after.split(/\s+/).length : 0;
  return Math.min(60, Math.round(((filler + duplicates + role * 0.6) / total) * 100));
}
