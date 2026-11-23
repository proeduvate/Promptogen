/**
 * Prompt Quality assessment: API contract types and runtime validation.
 *
 * The rich `quality_assessment` shape below is a PROPOSED backend contract (to be confirmed
 * with the backend developer). The current backend returns only flat legacy fields
 * (`overall_score`, `clarity`, `specificity`, `context`, `structure`, `actionability`,
 * `suggestions[]`). Both are accepted here.
 *
 * Rules (from the Prompt Quality Score Breakdown task):
 * - Every score, explanation, weakness, recommendation and the overall classification comes
 *   from the backend response. Nothing is invented, defaulted or derived from thresholds.
 * - A dimension the backend did not return is listed as "not assessed", never given a score.
 * - The quality score measures prompt construction. It is a different metric from any
 *   future Tested Performance score.
 */

/**
 * @typedef {Object} RawQualityRecommendation
 * @property {string} [id]
 * @property {string} text
 * @property {"high"|"medium"|"low"} [impact]
 * @property {string} [dimension_id]   Links a top-level suggestion to a dimension.
 */

/**
 * @typedef {Object} RawQualityDimension
 * @property {string} id                 e.g. "clarity", "output_definition"
 * @property {string} [name]             Display name, e.g. "Output Definition"
 * @property {number} score              Integer 0-100
 * @property {"strong"|"moderate"|"weak"} [level]  Backend band for the visual indicator
 * @property {string} [explanation]
 * @property {string[]} [weaknesses]
 * @property {string[]} [missing_information]
 * @property {RawQualityRecommendation[]} [recommendations]
 */

/**
 * PROPOSED response object, returned as `quality_assessment` inside `/pipeline/continue`,
 * `/pipeline/followup` (refine) and `/assess` responses (or as the `/assess` body itself).
 *
 * @typedef {Object} RawQualityAssessment
 * @property {string} [assessment_id]
 * @property {string} [assessed_at]      ISO 8601 timestamp
 * @property {number|string} [prompt_version]
 * @property {number} overall_score      Integer 0-100
 * @property {"excellent"|"good"|"average"|"needs_improvement"} [classification]
 * @property {string} [classification_label]
 * @property {string} [summary]
 * @property {RawQualityDimension[]} dimensions
 * @property {RawQualityRecommendation[]} [suggestions]
 */

/**
 * @typedef {Object} QualityRecommendation
 * @property {string} id
 * @property {string} text
 * @property {"high"|"medium"|"low"|null} impact
 * @property {string|null} dimensionId
 */

/**
 * @typedef {Object} QualityDimension
 * @property {string} id
 * @property {string} name
 * @property {number|null} score
 * @property {"strong"|"moderate"|"weak"|null} level
 * @property {"backend"|"score"|null} levelSource
 * @property {string|null} explanation
 * @property {string[]} weaknesses
 * @property {string[]} missingInformation
 * @property {QualityRecommendation[]} recommendations
 */

/**
 * @typedef {Object} QualityAssessment
 * @property {boolean} available           True when the backend returned an overall score or any dimension score.
 * @property {"assessment"|"legacy"|null} source
 * @property {string|null} assessmentId
 * @property {string|null} assessedAt      ISO timestamp from the backend, when provided.
 * @property {number|string|null} promptVersion
 * @property {number|null} overallScore
 * @property {string|null} classification       Normalized key when known, else null.
 * @property {string|null} classificationLabel  Display text from the backend response only.
 * @property {string|null} summary
 * @property {QualityDimension[]} dimensions     Returned dimensions (spec order first).
 * @property {{id: string, name: string}[]} notAssessed  Spec dimensions missing from the response.
 * @property {QualityRecommendation[]} generalSuggestions  Suggestions not linked to a dimension.
 * @property {string[]} issues
 */

/** The eight quality dimensions defined in the Promptogen product specification (§6). */
export const QUALITY_DIMENSIONS = Object.freeze([
  { id: "clarity", name: "Clarity" },
  { id: "specificity", name: "Specificity" },
  { id: "context", name: "Context" },
  { id: "structure", name: "Structure" },
  { id: "actionability", name: "Actionability" },
  { id: "constraints", name: "Constraints" },
  { id: "output_definition", name: "Output Definition" },
  { id: "consistency", name: "Consistency" },
]);

export const QUALITY_CLASSIFICATION_LABELS = Object.freeze({
  excellent: "Excellent",
  good: "Good",
  average: "Average",
  needs_improvement: "Needs Improvement",
});

export const DIMENSION_LEVELS = Object.freeze(["strong", "moderate", "weak"]);

/**
 * Display-only fallback for the strong / moderate / weak indicator, used ONLY when the
 * backend sends a dimension score without a `level`. It never changes a score and is never
 * used for the overall classification. Replace or remove once the backend sends `level`.
 */
export const DIMENSION_LEVEL_FALLBACK_THRESHOLDS = Object.freeze({ strong: 80, moderate: 60 });

const LEGACY_DIMENSION_FIELDS = ["clarity", "specificity", "context", "structure", "actionability"];
const IMPACT_LEVELS = ["high", "medium", "low"];

const SPEC_INDEX = new Map(QUALITY_DIMENSIONS.map((d, i) => [d.id, i]));
const SPEC_NAMES = new Map(QUALITY_DIMENSIONS.map((d) => [d.id, d.name]));

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function text(value) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function toKey(value) {
  const t = text(value);
  return t ? t.toLowerCase().replace(/[\s-]+/g, "_") : null;
}

function toScore(value) {
  return typeof value === "number" && Number.isInteger(value) && value >= 0 && value <= 100 ? value : null;
}

function titleCase(id) {
  return id
    .split("_")
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function toTextList(value) {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => (typeof item === "string" ? text(item) : isPlainObject(item) ? text(item.text) || text(item.label) : null))
    .filter(Boolean);
}

/** Band for the visual indicator: backend `level` first, else the display-only fallback. */
export function resolveDimensionLevel(score, rawLevel) {
  const level = toKey(rawLevel);
  if (level && DIMENSION_LEVELS.includes(level)) return { level, levelSource: "backend" };
  if (score === null) return { level: null, levelSource: null };
  const { strong, moderate } = DIMENSION_LEVEL_FALLBACK_THRESHOLDS;
  return { level: score >= strong ? "strong" : score >= moderate ? "moderate" : "weak", levelSource: "score" };
}

function normalizeRecommendation(item, index, prefix) {
  if (typeof item === "string") {
    const t = text(item);
    return t ? { id: `${prefix}-${index}`, text: t, impact: null, dimensionId: null } : null;
  }
  if (!isPlainObject(item)) return null;
  const t = text(item.text) || text(item.suggestion) || text(item.message);
  if (!t) return null;
  const impact = toKey(item.impact);
  return {
    id: text(item.id) || `${prefix}-${index}`,
    text: t,
    impact: impact && IMPACT_LEVELS.includes(impact) ? impact : null,
    dimensionId: toKey(item.dimension_id) || toKey(item.dimension),
  };
}

function normalizeDimension(item, index, issues) {
  if (!isPlainObject(item)) {
    issues.push(`dimensions[${index}]: not an object`);
    return null;
  }
  const id = toKey(item.id) || toKey(item.name);
  if (!id) {
    issues.push(`dimensions[${index}]: missing id`);
    return null;
  }
  const score = toScore(item.score);
  if (score === null) issues.push(`dimensions[${index}].score: absent or not an integer 0-100`);
  const recommendations = (Array.isArray(item.recommendations) ? item.recommendations : [])
    .map((rec, i) => normalizeRecommendation(rec, i, `${id}-rec`))
    .filter(Boolean)
    .map((rec) => ({ ...rec, dimensionId: id }));

  return {
    id,
    name: text(item.name) || SPEC_NAMES.get(id) || titleCase(id),
    score,
    ...resolveDimensionLevel(score, item.level),
    explanation: text(item.explanation),
    weaknesses: toTextList(item.weaknesses),
    missingInformation: toTextList(item.missing_information ?? item.missing),
    recommendations,
  };
}

function orderDimensions(dimensions) {
  return dimensions
    .map((d, i) => ({ d, i }))
    .sort((a, b) => {
      const ai = SPEC_INDEX.has(a.d.id) ? SPEC_INDEX.get(a.d.id) : QUALITY_DIMENSIONS.length + a.i;
      const bi = SPEC_INDEX.has(b.d.id) ? SPEC_INDEX.get(b.d.id) : QUALITY_DIMENSIONS.length + b.i;
      return ai - bi;
    })
    .map(({ d }) => d);
}

function classificationFrom(raw) {
  const key = toKey(raw.classification);
  const backendLabel = text(raw.classification_label);
  if (key && QUALITY_CLASSIFICATION_LABELS[key]) {
    return { classification: key, classificationLabel: backendLabel || QUALITY_CLASSIFICATION_LABELS[key] };
  }
  // Unknown value: show the backend's own text rather than guessing.
  return { classification: null, classificationLabel: backendLabel || text(raw.classification) };
}

function emptyAssessment(issues) {
  return {
    available: false,
    source: null,
    assessmentId: null,
    assessedAt: null,
    promptVersion: null,
    overallScore: null,
    classification: null,
    classificationLabel: null,
    summary: null,
    dimensions: [],
    notAssessed: QUALITY_DIMENSIONS.map(({ id, name }) => ({ id, name })),
    generalSuggestions: [],
    issues,
  };
}

function finalize(base, dimensions, suggestions) {
  const byId = new Map();
  for (const dim of dimensions) {
    if (byId.has(dim.id)) {
      base.issues.push(`dimensions: duplicate id "${dim.id}"`);
      continue;
    }
    byId.set(dim.id, dim);
  }

  // Attach top-level suggestions to their dimension when the API provides the mapping.
  const generalSuggestions = [];
  for (const suggestion of suggestions) {
    const target = suggestion.dimensionId ? byId.get(suggestion.dimensionId) : null;
    if (target) {
      if (!target.recommendations.some((r) => r.text === suggestion.text)) target.recommendations.push(suggestion);
    } else {
      generalSuggestions.push({ ...suggestion, dimensionId: null });
    }
  }

  const ordered = orderDimensions([...byId.values()]);
  const returnedIds = new Set(ordered.map((d) => d.id));
  return {
    ...base,
    available: base.overallScore !== null || ordered.some((d) => d.score !== null),
    dimensions: ordered,
    notAssessed: QUALITY_DIMENSIONS.filter((d) => !returnedIds.has(d.id)).map(({ id, name }) => ({ id, name })),
    generalSuggestions,
  };
}

/**
 * Normalize an assessment from any supported backend response.
 *
 * Accepts: a response containing `quality_assessment`, a rich assessment object, or a
 * legacy flat response. Returns an unavailable assessment when nothing usable is present.
 *
 * @param {unknown} raw
 * @returns {QualityAssessment}
 */
export function normalizeQualityAssessment(raw) {
  const issues = [];
  if (!isPlainObject(raw)) {
    issues.push("assessment: missing");
    return emptyAssessment(issues);
  }

  const rich = isPlainObject(raw.quality_assessment)
    ? raw.quality_assessment
    : Array.isArray(raw.dimensions)
      ? raw
      : null;

  if (rich) {
    const overallScore = toScore(rich.overall_score);
    if (overallScore === null) issues.push("overall_score: absent or not an integer 0-100");
    const dimensions = rich.dimensions;
    if (!Array.isArray(dimensions)) issues.push("dimensions: not an array");
    const base = {
      source: "assessment",
      assessmentId: text(rich.assessment_id),
      assessedAt: text(rich.assessed_at) && !Number.isNaN(Date.parse(rich.assessed_at)) ? rich.assessed_at : null,
      promptVersion:
        typeof rich.prompt_version === "number" || text(rich.prompt_version) ? rich.prompt_version : null,
      overallScore,
      ...classificationFrom(rich),
      summary: text(rich.summary),
      issues,
    };
    return finalize(
      base,
      (Array.isArray(dimensions) ? dimensions : []).map((d, i) => normalizeDimension(d, i, issues)).filter(Boolean),
      (Array.isArray(rich.suggestions) ? rich.suggestions : [])
        .map((s, i) => normalizeRecommendation(s, i, "suggestion"))
        .filter(Boolean)
    );
  }

  // Legacy flat response: scores only, no explanations, no classification.
  const overallScore = toScore(raw.overall_score);
  const legacyDims = LEGACY_DIMENSION_FIELDS.filter((field) => toScore(raw[field]) !== null).map((field) => ({
    id: field,
    name: SPEC_NAMES.get(field),
    score: raw[field],
    ...resolveDimensionLevel(raw[field], null),
    explanation: null,
    weaknesses: [],
    missingInformation: [],
    recommendations: [],
  }));
  if (overallScore === null && legacyDims.length === 0) {
    issues.push("assessment: no scores in response");
    return emptyAssessment(issues);
  }
  return finalize(
    {
      source: "legacy",
      assessmentId: text(raw.assessment_id),
      assessedAt: null,
      promptVersion: null,
      overallScore,
      classification: null,
      classificationLabel: null,
      summary: null,
      issues,
    },
    legacyDims,
    (Array.isArray(raw.suggestions) ? raw.suggestions : [])
      .map((s, i) => normalizeRecommendation(s, i, "suggestion"))
      .filter(Boolean)
  );
}

/** Plain-text prompt used for (re)assessment of a version. */
export function getPromptTextForAssessment(promptData) {
  if (!isPlainObject(promptData)) return "";
  const direct = text(promptData.optimized_prompt) || text(promptData.prompt);
  if (direct) return direct;
  const sections = Array.isArray(promptData.sections) ? promptData.sections : [];
  return sections
    .map((section) => {
      if (typeof section === "string") return section.trim();
      if (!isPlainObject(section)) return "";
      const title = text(section.label) || text(section.title) || "";
      const body =
        text(section.content) ||
        (Array.isArray(section.items)
          ? section.items
              .map((item) => (typeof item === "string" ? item : isPlainObject(item) ? item.text || "" : ""))
              .filter(Boolean)
              .map((line) => `- ${line}`)
              .join("\n")
          : "");
      return [title && `### ${title}`, body].filter(Boolean).join("\n");
    })
    .filter(Boolean)
    .join("\n\n");
}

/**
 * Dimension scores as the flat `metrics` object other screens already read
 * (`chat.metrics`). Only scores the backend returned are included; null when none.
 * @param {QualityAssessment} assessment
 */
export function toMetrics(assessment) {
  if (!assessment?.available) return null;
  const metrics = {};
  for (const dim of assessment.dimensions) {
    if (dim.score !== null) metrics[dim.id] = dim.score;
  }
  return Object.keys(metrics).length > 0 ? metrics : null;
}
