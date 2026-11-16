/**
 * DEV/TEST ONLY: backend-shaped readiness fixtures.
 *
 * These are synthetic examples of what the proposed readiness endpoint would return.
 * The numbers are fixed fixture values. They are NOT computed from answers, question
 * counts or weights. Production code never imports this module: the adapter loads it
 * dynamically only when `import.meta.env.DEV` and `VITE_USE_READINESS_STUB=true`.
 */

const MISSING_REQUIRED = {
  analysis_id: "fixture-missing-required",
  readiness: { percentage: 42, status: "needs_more_details" },
  collected_context: [
    { id: "goal", label: "Primary goal", value: "Build a task tracking web app", source: "original_prompt", question_id: null },
  ],
  missing_context: [
    {
      id: "context-gap-1",
      label: "Target users",
      description: "Describe who will use the app and their technical comfort level.",
      importance: "required",
      question_id: null,
      input_hint: "e.g., small agency teams of 5-20 people",
    },
    {
      id: "context-gap-2",
      label: "Deployment constraints",
      description: "Mention hosting, budget or platform limits that the solution must respect.",
      importance: "recommended",
      question_id: null,
      input_hint: "e.g., must run on a single low-cost VPS",
    },
  ],
  warnings: [
    {
      code: "MISSING_REQUIRED_CONTEXT",
      severity: "error",
      message: "Required information is missing, so the generated prompt would rely on guesses.",
    },
  ],
  generation_policy: {
    can_generate: false,
    can_generate_anyway: false,
    reason: "Add the target users before generating.",
  },
};

const RECOMMENDED_GAPS = {
  analysis_id: "fixture-recommended-gaps",
  readiness: { percentage: 78, status: "partially_ready" },
  collected_context: [
    { id: "goal", label: "Primary goal", value: "Build a task tracking web app", source: "original_prompt", question_id: null },
    { id: "audience", label: "Target users", value: "Small agency teams", source: "context_addition", question_id: null },
  ],
  missing_context: [
    {
      id: "context-gap-5",
      label: "Device constraints",
      description: "Specify the target device performance requirements.",
      importance: "recommended",
      question_id: null,
      input_hint: "e.g., Android 10+, 2 GB RAM",
    },
    {
      id: "context-gap-6",
      label: "Preferred output format",
      description: "Clarify whether the response should be a PRD or implementation plan.",
      importance: "optional",
      question_id: null,
      input_hint: "e.g., Markdown PRD",
    },
  ],
  warnings: [
    {
      code: "LIMITED_TECHNICAL_CONTEXT",
      severity: "warning",
      message: "Some implementation assumptions may be necessary.",
    },
  ],
  generation_policy: { can_generate: false, can_generate_anyway: true, reason: null },
};

const READY = {
  analysis_id: "fixture-ready",
  readiness: { percentage: 96, status: "ready_to_generate" },
  collected_context: [
    { id: "goal", label: "Primary goal", value: "Build a task tracking web app", source: "original_prompt", question_id: null },
    { id: "audience", label: "Target users", value: "Small agency teams", source: "context_addition", question_id: null },
    { id: "devices", label: "Device constraints", value: "Android 10+, 2 GB RAM", source: "context_addition", question_id: null },
  ],
  missing_context: [],
  warnings: [],
  generation_policy: { can_generate: true, can_generate_anyway: true, reason: null },
};

const EMPTY = {
  analysis_id: "fixture-empty",
  readiness: { percentage: 0, status: "needs_more_details" },
  collected_context: [],
  missing_context: [],
  warnings: [],
  generation_policy: { can_generate: false, can_generate_anyway: false, reason: null },
};

/** Incomplete contract: no percentage and no permission fields. */
const INVALID_RESPONSE = {
  analysis_id: "fixture-invalid",
  readiness: { status: "partially_ready" },
  collected_context: [],
  missing_context: [],
};

export const READINESS_FIXTURES = Object.freeze({
  "missing-required": MISSING_REQUIRED,
  "recommended-gaps": RECOMMENDED_GAPS,
  ready: READY,
  empty: EMPTY,
  "invalid-response": INVALID_RESPONSE,
});

export const READINESS_STUB_SCENARIOS = Object.freeze([
  "sequence",
  "missing-required",
  "recommended-gaps",
  "ready",
  "empty",
  "invalid-response",
  "error",
]);

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

/**
 * Scripted demo for local development: each saved context addition advances to the next
 * fixture (missing-required -> recommended-gaps -> ready) so the UI's reactivity can be seen.
 * This is fixture selection for the stub only, not a scoring rule.
 */
function pickSequenceFixture(payload) {
  const saved = Array.isArray(payload?.context_additions) ? payload.context_additions.length : 0;
  if (saved <= 0) return READINESS_FIXTURES["missing-required"];
  if (saved === 1) return READINESS_FIXTURES["recommended-gaps"];
  return READINESS_FIXTURES.ready;
}

/**
 * Return a complete backend-shaped fixture response for a readiness request.
 *
 * @param {import("../lib/promptReadinessContract").ReadinessRequest} payload
 * @param {{scenario?: string, delayMs?: number, signal?: AbortSignal}} [options]
 */
export async function getStubReadiness(payload, { scenario = "sequence", delayMs = 450, signal } = {}) {
  if (delayMs > 0) {
    await new Promise((resolve, reject) => {
      const timer = setTimeout(resolve, delayMs);
      signal?.addEventListener?.("abort", () => {
        clearTimeout(timer);
        const err = new Error("Readiness request aborted");
        err.name = "AbortError";
        reject(err);
      });
    });
  }

  if (scenario === "error") {
    const err = new Error("Readiness stub: simulated network failure.");
    err.status = 503;
    throw err;
  }

  const fixture =
    scenario === "sequence" || !READINESS_FIXTURES[scenario]
      ? pickSequenceFixture(payload)
      : READINESS_FIXTURES[scenario];

  return {
    thread_id: payload?.thread_id ?? null,
    client_revision: payload?.client_revision ?? null,
    ...clone(fixture),
  };
}
