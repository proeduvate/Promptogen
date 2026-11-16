/**
 * Shared mapping from the chat's local answer state to the pipeline's
 * `PipelineAnswerItem` shape, plus helpers for chat-scoped context additions.
 *
 * Generation (`/pipeline/continue`) and readiness checks both use this mapping, so
 * they always send the same question IDs. IDs come from the backend questions and are
 * never invented here.
 */

function stringifyAnswer(val) {
  if (Array.isArray(val)) return val.join(", ");
  if (typeof val === "object" && val !== null) {
    return Object.entries(val)
      .map(([k, v]) => `${k}: ${v}`)
      .join(", ");
  }
  return null;
}

/**
 * @param {Array<{id: number|string, question: string, options?: string[]}>} questions
 * @param {Record<string, unknown>} answers
 * @param {{fillDefaults?: boolean}} [options]
 *   fillDefaults=true keeps the existing generation behavior: unanswered questions are sent
 *   as the first option or "Default". Readiness checks pass false so the backend can see
 *   which questions are still unanswered (they are sent with an empty `selected_option`).
 */
export function formatPipelineAnswers(questions = [], answers = {}, { fillDefaults = true } = {}) {
  if (!Array.isArray(questions)) return [];
  const source = answers || {};

  return questions.map((q) => {
    const val = source[q.id] ?? source[`q_${q.id}`];
    let selectedStr = stringifyAnswer(val);

    if (selectedStr === null) {
      selectedStr = fillDefaults ? String(val || q.options?.[0] || "Default") : val == null ? "" : String(val);
    }

    const other = source[`${q.id}_other`];
    const customStr = other ? String(other) : "";

    return {
      question_id: q.id,
      question: q.question,
      selected_option: fillDefaults ? selectedStr || "Default" : selectedStr,
      custom_input: customStr,
    };
  });
}

/**
 * Insert or replace a context addition by its stable `gap_id`. Never duplicates an entry
 * and keeps the original position when an existing gap is edited.
 *
 * @param {Array<{gap_id: string, value: string, label?: string}>} list
 * @param {{gap_id: string, value: string, label?: string}} entry
 */
export function upsertContextAddition(list, entry) {
  const current = Array.isArray(list) ? list : [];
  if (!entry || !entry.gap_id) return current;
  const next = { gap_id: String(entry.gap_id), value: String(entry.value ?? ""), label: entry.label || "" };
  const index = current.findIndex((item) => item.gap_id === next.gap_id);
  if (index === -1) return [...current, next];
  return current.map((item, i) => (i === index ? { ...item, ...next } : item));
}

export function removeContextAddition(list, gapId) {
  const current = Array.isArray(list) ? list : [];
  return current.filter((item) => item.gap_id !== String(gapId));
}

/** Request payload shape: only `{gap_id, value}` with a non-empty value. */
export function toContextAdditionsPayload(list) {
  if (!Array.isArray(list)) return [];
  return list
    .filter((item) => item && item.gap_id && typeof item.value === "string" && item.value.trim())
    .map((item) => ({ gap_id: item.gap_id, value: item.value.trim() }));
}
