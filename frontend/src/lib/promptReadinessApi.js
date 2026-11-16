/**
 * Prompt Readiness API adapter.
 *
 * The only module that decides between the development stub and the real endpoint.
 * Components and hooks call `analyzePromptReadiness` and receive the raw backend-shaped
 * response, which `promptReadinessContract.normalizeReadinessResponse` validates.
 *
 * Flags (Vite env, read at call time):
 *   VITE_ENABLE_PROMPT_READINESS=true   Show the readiness panel and enforce generation gating.
 *                                       Leave off until the backend endpoint is live.
 *   VITE_USE_READINESS_STUB=true        DEV ONLY: answer from local fixtures instead of the API.
 *                                       Ignored in production builds.
 *   VITE_READINESS_STUB_SCENARIO=...    DEV ONLY: sequence (default), missing-required,
 *                                       recommended-gaps, ready, empty, invalid-response, error.
 */

import { analyzeReadinessViaApi } from "./api";

function env() {
  return import.meta.env || {};
}

/** True only in a dev server/test run with the stub explicitly enabled. */
export function isReadinessStubEnabled() {
  return Boolean(env().DEV) && env().VITE_USE_READINESS_STUB === "true";
}

/** Feature flag for the readiness UI and its generation gating. */
export function isPromptReadinessEnabled() {
  return env().VITE_ENABLE_PROMPT_READINESS === "true" || isReadinessStubEnabled();
}

/**
 * @param {import("./promptReadinessContract").ReadinessRequest} payload
 * @param {{signal?: AbortSignal}} [options]
 * @returns {Promise<unknown>} Raw backend-shaped response (validate before use).
 */
export async function analyzePromptReadiness(payload, { signal } = {}) {
  if (import.meta.env.DEV && isReadinessStubEnabled()) {
    // Dynamic import keeps fixtures out of production bundles.
    const { getStubReadiness } = await import("../mocks/promptReadinessFixtures");
    return getStubReadiness(payload, {
      scenario: env().VITE_READINESS_STUB_SCENARIO || "sequence",
      signal,
    });
  }
  return analyzeReadinessViaApi(payload, { signal });
}
