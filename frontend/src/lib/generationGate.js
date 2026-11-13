/**
 * Generation permission gate for the adaptive-question workspace.
 *
 * Every route that can start generation from the workspace (final question step, the
 * readiness panel, Skip Questions, the sufficiency fast-track) is checked here, at the
 * common App.jsx boundary. Permission comes only from the latest backend readiness
 * response for the current answers. Anything absent, loading, stale or invalid fails closed.
 *
 * Modes:
 *   "standard" - normal generation; needs `can_generate`.
 *   "anyway"   - the Generate Anyway bypass; needs `can_generate_anyway`.
 *   "skip"     - legacy skip / fast-track routes; allowed when the backend allows either
 *                normal generation or the bypass, and refused otherwise.
 */

export const GENERATION_MODES = Object.freeze(["standard", "anyway", "skip"]);

const MESSAGES = {
  checking: "Prompt readiness is still being checked for your latest answers. Please wait a moment and try again.",
  failed: "Prompt readiness could not be confirmed. Retry the readiness check before generating.",
  unavailable: "Prompt readiness is unavailable for this conversation, so generation is paused.",
  blockedStandard:
    "Some details are still missing. Add them, or use Generate Anyway if it is offered.",
  blockedRequired: "Required details are missing. Add them before generating.",
};

/**
 * @param {{
 *   featureEnabled: boolean,
 *   readiness: null | {
 *     status: string,
 *     isFresh: boolean,
 *     permission: {canGenerate: boolean, canGenerateAnyway: boolean, reason: string|null},
 *   },
 *   mode: "standard"|"anyway"|"skip",
 * }} input
 * @returns {{allowed: boolean, reason: string|null}}
 */
export function evaluateGenerationGate({ featureEnabled, readiness, mode }) {
  // Feature off: keep the existing behavior unchanged for current users.
  if (!featureEnabled) return { allowed: true, reason: null };

  if (!GENERATION_MODES.includes(mode)) {
    return { allowed: false, reason: MESSAGES.blockedRequired };
  }

  if (!readiness || !readiness.isFresh) {
    const status = readiness?.status;
    if (status === "error") return { allowed: false, reason: MESSAGES.failed };
    return { allowed: false, reason: MESSAGES.checking };
  }

  const permission = readiness.permission || {};
  const canGenerate = permission.canGenerate === true;
  const canGenerateAnyway = permission.canGenerateAnyway === true;

  const allowed =
    mode === "standard" ? canGenerate : mode === "anyway" ? canGenerateAnyway : canGenerate || canGenerateAnyway;

  if (allowed) return { allowed: true, reason: null };

  if (permission.reason) return { allowed: false, reason: permission.reason };
  if (readiness.status === "unavailable" && !canGenerate && !canGenerateAnyway) {
    return { allowed: false, reason: MESSAGES.unavailable };
  }
  if (mode === "standard" && canGenerateAnyway) {
    return { allowed: false, reason: MESSAGES.blockedStandard };
  }
  return { allowed: false, reason: MESSAGES.blockedRequired };
}
