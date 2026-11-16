import { vi } from "vitest";
import { normalizeReadinessResponse, CLOSED_GENERATION_POLICY } from "../../../lib/promptReadinessContract";
import { READINESS_FIXTURES } from "../../../mocks/promptReadinessFixtures";

/**
 * Build a readiness hook result (as returned by usePromptReadiness) from a raw
 * backend-shaped response, for component tests.
 */
export function readinessFrom(raw, { status, isFresh = true, isUpdating = false, error = null } = {}) {
  const result = normalizeReadinessResponse({ thread_id: "thread-1", ...raw }, { threadId: "thread-1" });
  if (!result.ok) throw new Error(result.error);
  const data = { ...result.value, requestId: 1, signature: "sig", scopeKey: "scope" };
  const resolvedStatus = status || (isFresh ? (data.readiness.available ? "ready" : "unavailable") : "stale");
  return {
    enabled: true,
    status: resolvedStatus,
    data,
    error,
    isFresh,
    isUpdating,
    permission: isFresh ? data.generationPolicy : CLOSED_GENERATION_POLICY,
    refresh: vi.fn(),
    requestImmediateRefresh: vi.fn(),
  };
}

export function fixture(name) {
  return JSON.parse(JSON.stringify(READINESS_FIXTURES[name]));
}
