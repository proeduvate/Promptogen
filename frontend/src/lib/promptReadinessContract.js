/**
 * Prompt Readiness: API contract types and runtime validation.
 *
 * The readiness endpoint is a PROPOSED backend contract (see the Prompt Readiness
 * spec, section 4). This module is the only place that knows the raw response shape.
 * Everything it returns is taken from the backend response as-is. It never computes
 * a score, infers a status from a percentage, classifies a gap's importance, or
 * grants a generation permission that the backend did not explicitly return.
 */

/**
 * @typedef {Object} ReadinessAnswerItem
 * @property {number|string} question_id  ID from the backend's clarification question.
 * @property {string} question
 * @property {string} selected_option     Empty string when the question is unanswered.
 * @property {string} custom_input
 */

/**
 * @typedef {Object} ContextAddition
 * @property {string} gap_id  Stable `missing_context[].id` from the backend.
 * @property {string} value
 */

/**
 * @typedef {Object} ReadinessRequest
 * @property {string} thread_id
 * @property {number} client_revision  Frontend-issued monotonic revision, echoed by the backend.
 * @property {ReadinessAnswerItem[]} answers
 * @property {ContextAddition[]} context_additions
 * @property {string} additional_context
 */

/**
 * @typedef {"needs_more_details"|"partially_ready"|"ready_to_generate"} ReadinessStatus
 * @typedef {"required"|"recommended"|"optional"} ImportanceLevel
 */

/**
 * @typedef {Object} NormalizedReadinessScore
 * @property {boolean} available        False when the percentage is absent or invalid.
 * @property {number|null} percentage   Backend value, unchanged (integer 0-100).
 * @property {ReadinessStatus|null} status
 * @property {string|null} statusLabel  Display copy for a known status enum.
 */

/**
 * @typedef {Object} NormalizedCollectedItem
 * @property {string} id
 * @property {string} label
 * @property {string} value
 * @property {string|null} source
 * @property {string|number|null} questionId
 */

/**
 * @typedef {Object} NormalizedGap
 * @property {string} id                 Stable gap ID (used as `gap_id` for additions).
 * @property {string} label
 * @property {string|null} description
 * @property {ImportanceLevel|"unclassified"} importance
 * @property {string|null} importanceRaw  The raw backend value (kept for unknown levels).
 * @property {string|number|null} questionId
 * @property {string|null} inputHint
 */

/**
 * @typedef {Object} NormalizedWarning
 * @property {string|null} code
 * @property {string} severity            Raw backend severity (or "warning" when absent).
 * @property {"info"|"warning"|"error"} tone  Styling only.
 * @property {string} message
 */

/**
 * @typedef {Object} GenerationPolicy
 * @property {boolean} canGenerate
 * @property {boolean} canGenerateAnyway
 * @property {string|null} reason
 */

/**
 * @typedef {Object} NormalizedReadiness
 * @property {string|null} threadId
 * @property {number|null} clientRevision
 * @property {string|null} analysisId
 * @property {NormalizedReadinessScore} readiness
 * @property {NormalizedCollectedItem[]} collectedContext
 * @property {NormalizedGap[]} missingContext
 * @property {NormalizedWarning[]} warnings
 * @property {GenerationPolicy} generationPolicy
 * @property {string[]} issues  Contract problems found while validating (for diagnostics).
 */

export const READINESS_STATUS_LABELS = Object.freeze({
  needs_more_details: "Needs More Details",
  partially_ready: "Partially Ready",
  ready_to_generate: "Ready to Generate",
});

export const IMPORTANCE_LEVELS = Object.freeze(["required", "recommended", "optional"]);

/** Display order for gap groups. Unknown levels are listed last and never treated as optional. */
export const IMPORTANCE_ORDER = Object.freeze(["required", "recommended", "optional", "unclassified"]);

/** Fail-closed policy used whenever permission is absent, stale, loading or invalid. */
export const CLOSED_GENERATION_POLICY = Object.freeze({
  canGenerate: false,
  canGenerateAnyway: false,
  reason: null,
});

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function nonEmptyString(value) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function toId(value) {
  if (typeof value === "string" && value.trim()) return value.trim();
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return null;
}

function toQuestionId(value) {
  if (typeof value === "string" && value.trim()) return value.trim();
  if (typeof value === "number" && Number.isFinite(value)) return value;
  return null;
}

function toDisplayValue(value) {
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (Array.isArray(value)) {
    return value
      .map((v) => toDisplayValue(v))
      .filter(Boolean)
      .join(", ");
  }
  return "";
}

function normalizeScore(value, issues) {
  if (!isPlainObject(value)) {
    issues.push("readiness: object missing");
    return { available: false, percentage: null, status: null, statusLabel: null };
  }

  const pct = value.percentage;
  const validPercentage = typeof pct === "number" && Number.isInteger(pct) && pct >= 0 && pct <= 100;
  if (!validPercentage) issues.push("readiness.percentage: absent or not an integer 0-100");

  const status = typeof value.status === "string" ? value.status : null;
  const statusLabel =
    status && Object.prototype.hasOwnProperty.call(READINESS_STATUS_LABELS, status)
      ? READINESS_STATUS_LABELS[status]
      : null;
  if (!statusLabel) issues.push("readiness.status: absent or unknown");

  return {
    available: validPercentage,
    percentage: validPercentage ? pct : null,
    status: statusLabel ? status : null,
    statusLabel,
  };
}

function normalizeCollectedItem(item, index, issues) {
  if (!isPlainObject(item)) {
    issues.push(`collected_context[${index}]: not an object`);
    return null;
  }
  const label = nonEmptyString(item.label);
  const value = toDisplayValue(item.value);
  if (!label || !value) {
    issues.push(`collected_context[${index}]: missing label or value`);
    return null;
  }
  return {
    // Collected items have no actions, so an index key is only used for rendering.
    id: toId(item.id) || `collected-${index}`,
    label,
    value,
    source: nonEmptyString(item.source),
    questionId: toQuestionId(item.question_id),
  };
}

function normalizeGap(item, index, issues) {
  if (!isPlainObject(item)) {
    issues.push(`missing_context[${index}]: not an object`);
    return null;
  }
  const id = toId(item.id);
  const label = nonEmptyString(item.label);
  if (!id || !label) {
    // A gap without a stable ID cannot be answered without inventing an ID.
    issues.push(`missing_context[${index}]: missing id or label`);
    return null;
  }
  const importanceRaw = typeof item.importance === "string" ? item.importance : null;
  const normalizedLevel = importanceRaw ? importanceRaw.trim().toLowerCase() : "";
  const importance = IMPORTANCE_LEVELS.includes(normalizedLevel) ? normalizedLevel : "unclassified";
  return {
    id,
    label,
    description: nonEmptyString(item.description),
    importance,
    importanceRaw,
    questionId: toQuestionId(item.question_id),
    inputHint: nonEmptyString(item.input_hint),
  };
}

function normalizeWarning(item, index, issues) {
  if (!isPlainObject(item)) {
    issues.push(`warnings[${index}]: not an object`);
    return null;
  }
  const message = nonEmptyString(item.message);
  if (!message) {
    issues.push(`warnings[${index}]: missing message`);
    return null;
  }
  const severity = nonEmptyString(item.severity) || "warning";
  const s = severity.toLowerCase();
  const tone = s === "info" ? "info" : s === "error" || s === "critical" || s === "blocking" ? "error" : "warning";
  return { code: nonEmptyString(item.code), severity, tone, message };
}

function normalizeList(value, normalizeItem, field, issues) {
  if (value == null) return [];
  if (!Array.isArray(value)) {
    issues.push(`${field}: not an array`);
    return [];
  }
  return value.map((item, index) => normalizeItem(item, index, issues)).filter(Boolean);
}

function dedupeById(items, field, issues) {
  const seen = new Set();
  return items.filter((item) => {
    if (seen.has(item.id)) {
      issues.push(`${field}: duplicate id "${item.id}"`);
      return false;
    }
    seen.add(item.id);
    return true;
  });
}

function normalizePolicy(value, issues) {
  if (!isPlainObject(value)) {
    issues.push("generation_policy: missing");
    return { ...CLOSED_GENERATION_POLICY };
  }
  return {
    // Only an explicit boolean `true` grants permission.
    canGenerate: value.can_generate === true,
    canGenerateAnyway: value.can_generate_anyway === true,
    reason: nonEmptyString(value.reason),
  };
}

/**
 * Validate a raw readiness response and convert it to the UI's normalized shape.
 *
 * @param {unknown} raw
 * @param {{threadId?: string|null, clientRevision?: number|null}} [expected]
 * @returns {{ok: true, value: NormalizedReadiness} | {ok: false, error: string}}
 */
export function normalizeReadinessResponse(raw, expected = {}) {
  if (!isPlainObject(raw)) {
    return { ok: false, error: "The readiness service returned an empty or malformed response." };
  }

  const { threadId = null, clientRevision = null } = expected;
  if (raw.thread_id != null && threadId != null && String(raw.thread_id) !== String(threadId)) {
    return { ok: false, error: "The readiness response belongs to a different conversation." };
  }
  if (raw.client_revision != null && clientRevision != null && raw.client_revision !== clientRevision) {
    return { ok: false, error: "The readiness response does not match your latest answers." };
  }

  const issues = [];
  const readiness = normalizeScore(raw.readiness, issues);
  const collectedContext = dedupeById(
    normalizeList(raw.collected_context, normalizeCollectedItem, "collected_context", issues),
    "collected_context",
    issues
  );
  const missingContext = dedupeById(
    normalizeList(raw.missing_context, normalizeGap, "missing_context", issues),
    "missing_context",
    issues
  );
  const warnings = normalizeList(raw.warnings, normalizeWarning, "warnings", issues);
  const generationPolicy = normalizePolicy(raw.generation_policy, issues);

  return {
    ok: true,
    value: {
      threadId: raw.thread_id != null ? String(raw.thread_id) : threadId,
      clientRevision: typeof raw.client_revision === "number" ? raw.client_revision : null,
      analysisId: nonEmptyString(raw.analysis_id),
      readiness,
      collectedContext,
      missingContext,
      warnings,
      generationPolicy,
      issues,
    },
  };
}

/**
 * Stable sort of gaps by importance group, preserving backend order inside each group.
 * @param {NormalizedGap[]} gaps
 * @returns {NormalizedGap[]}
 */
export function sortGapsByImportance(gaps = []) {
  return gaps
    .map((gap, index) => ({ gap, index }))
    .sort((a, b) => {
      const diff = IMPORTANCE_ORDER.indexOf(a.gap.importance) - IMPORTANCE_ORDER.indexOf(b.gap.importance);
      return diff !== 0 ? diff : a.index - b.index;
    })
    .map(({ gap }) => gap);
}
