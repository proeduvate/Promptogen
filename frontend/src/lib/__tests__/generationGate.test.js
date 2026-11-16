import { describe, it, expect } from "vitest";
import { evaluateGenerationGate } from "../generationGate";

function readiness({ isFresh = true, status = "ready", canGenerate = false, canGenerateAnyway = false, reason = null } = {}) {
  return { status, isFresh, permission: { canGenerate, canGenerateAnyway, reason } };
}

describe("evaluateGenerationGate", () => {
  it("keeps existing behavior when the feature flag is off", () => {
    for (const mode of ["standard", "anyway", "skip"]) {
      expect(evaluateGenerationGate({ featureEnabled: false, readiness: null, mode }).allowed).toBe(true);
    }
  });

  it("fails closed while readiness is missing, loading, stale or failed", () => {
    for (const r of [null, readiness({ isFresh: false, status: "stale", canGenerate: true, canGenerateAnyway: true })]) {
      for (const mode of ["standard", "anyway", "skip"]) {
        const gate = evaluateGenerationGate({ featureEnabled: true, readiness: r, mode });
        expect(gate.allowed).toBe(false);
        expect(gate.reason).toMatch(/still being checked/i);
      }
    }
    const failed = evaluateGenerationGate({
      featureEnabled: true,
      readiness: readiness({ isFresh: false, status: "error" }),
      mode: "anyway",
    });
    expect(failed).toEqual({ allowed: false, reason: expect.stringMatching(/could not be confirmed/i) });
  });

  it("allows standard generation only with can_generate", () => {
    expect(evaluateGenerationGate({ featureEnabled: true, readiness: readiness({ canGenerate: true }), mode: "standard" }).allowed).toBe(true);
    const blocked = evaluateGenerationGate({
      featureEnabled: true,
      readiness: readiness({ canGenerateAnyway: true }),
      mode: "standard",
    });
    expect(blocked.allowed).toBe(false);
    expect(blocked.reason).toMatch(/Generate Anyway/);
  });

  it("allows Generate Anyway only with can_generate_anyway", () => {
    expect(
      evaluateGenerationGate({ featureEnabled: true, readiness: readiness({ canGenerateAnyway: true }), mode: "anyway" }).allowed
    ).toBe(true);
    expect(
      evaluateGenerationGate({ featureEnabled: true, readiness: readiness({ canGenerate: true }), mode: "anyway" }).allowed
    ).toBe(false);
  });

  it("allows skip routes when either permission is granted and shows the backend reason otherwise", () => {
    expect(evaluateGenerationGate({ featureEnabled: true, readiness: readiness({ canGenerate: true }), mode: "skip" }).allowed).toBe(true);
    expect(
      evaluateGenerationGate({ featureEnabled: true, readiness: readiness({ canGenerateAnyway: true }), mode: "skip" }).allowed
    ).toBe(true);
    expect(
      evaluateGenerationGate({
        featureEnabled: true,
        readiness: readiness({ reason: "Add the target users first." }),
        mode: "skip",
      })
    ).toEqual({ allowed: false, reason: "Add the target users first." });
  });

  it("rejects unknown modes", () => {
    expect(
      evaluateGenerationGate({ featureEnabled: true, readiness: readiness({ canGenerate: true }), mode: "bypass" }).allowed
    ).toBe(false);
  });
});
