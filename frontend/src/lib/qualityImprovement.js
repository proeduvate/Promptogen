/**
 * Entry point into the improvement-suggestions workflow.
 *
 * Until the dedicated Improvement Suggestions module (Apply / Ignore / Edit / Apply All)
 * exists, "Improve with suggestions" sends a refinement request built ONLY from the backend
 * assessment's own recommendations (and, if there are none, its reported weaknesses and
 * missing information). The future module can replace the App handler without changing
 * the quality panel.
 */

const MAX_ITEMS = 8;

/**
 * @param {import("./promptQualityContract").QualityAssessment|null} assessment
 * @returns {{ message: string, items: string[] }}
 */
export function buildImprovementRequest(assessment) {
  const items = [];
  const push = (line) => {
    if (line && !items.includes(line) && items.length < MAX_ITEMS) items.push(line);
  };

  const dimensions = assessment?.dimensions || [];
  for (const dim of dimensions) {
    for (const rec of dim.recommendations) push(`[${dim.name}] ${rec.text}`);
  }
  for (const rec of assessment?.generalSuggestions || []) push(rec.text);

  if (items.length === 0) {
    for (const dim of dimensions) {
      for (const missing of dim.missingInformation) push(`[${dim.name}] Add missing information: ${missing}`);
      for (const weakness of dim.weaknesses) push(`[${dim.name}] Address: ${weakness}`);
    }
  }

  const message =
    items.length > 0
      ? `Improve this prompt by applying these quality assessment suggestions:\n${items.map((i) => `- ${i}`).join("\n")}`
      : "Improve this prompt: strengthen its weaker quality dimensions and remove ambiguity.";
  return { message, items };
}
