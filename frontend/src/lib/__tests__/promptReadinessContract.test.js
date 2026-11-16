import { describe, it, expect } from "vitest";
import {
  normalizeReadinessResponse,
  sortGapsByImportance,
  CLOSED_GENERATION_POLICY,
} from "../promptReadinessContract";

const base = {
  thread_id: "t-1",
  client_revision: 3,
  analysis_id: "a-1",
  readiness: { percentage: 78, status: "partially_ready" },
  collected_context: [{ id: "audience", label: "Target audience", value: "Technical team", source: "answer", question_id: 1 }],
  missing_context: [
    { id: "gap-5", label: "Device constraints", description: "Specify devices.", importance: "recommended", question_id: null, input_hint: "Android 10+" },
  ],
  warnings: [{ code: "LIMITED", severity: "warning", message: "Some assumptions may be necessary." }],
  generation_policy: { can_generate: true, can_generate_anyway: true, reason: null },
};

function normalize(raw, expected = { threadId: "t-1", clientRevision: 3 }) {
  return normalizeReadinessResponse(raw, expected);
}

describe("normalizeReadinessResponse", () => {
  it("passes backend values through unchanged", () => {
    const result = normalize(base);
    expect(result.ok).toBe(true);
    expect(result.value.readiness).toEqual({
      available: true,
      percentage: 78,
      status: "partially_ready",
      statusLabel: "Partially Ready",
    });
    expect(result.value.collectedContext[0]).toMatchObject({ id: "audience", label: "Target audience", value: "Technical team" });
    expect(result.value.missingContext[0]).toMatchObject({
      id: "gap-5",
      importance: "recommended",
      inputHint: "Android 10+",
      questionId: null,
    });
    expect(result.value.generationPolicy).toEqual({ canGenerate: true, canGenerateAnyway: true, reason: null });
    expect(result.value.issues).toEqual([]);
  });

  it("treats a missing or invalid percentage as unavailable, never 0%", () => {
    for (const percentage of [undefined, null, "78", 78.5, -1, 101, NaN]) {
      const result = normalize({ ...base, readiness: { percentage, status: "partially_ready" } });
      expect(result.ok).toBe(true);
      expect(result.value.readiness.available).toBe(false);
      expect(result.value.readiness.percentage).toBeNull();
    }
  });

  it("marks a legacy response without a readiness object as unavailable with closed permissions", () => {
    const legacy = { thread_id: "t-1", is_sufficient: true, depth_analysis: { info_missing: ["audience"] } };
    const result = normalize(legacy, { threadId: "t-1", clientRevision: 1 });
    expect(result.ok).toBe(true);
    expect(result.value.readiness.available).toBe(false);
    expect(result.value.missingContext).toEqual([]);
    expect(result.value.generationPolicy).toEqual(CLOSED_GENERATION_POLICY);
  });

  it("does not derive a status label from the percentage", () => {
    const result = normalize({ ...base, readiness: { percentage: 96, status: "something_new" } });
    expect(result.value.readiness.available).toBe(true);
    expect(result.value.readiness.percentage).toBe(96);
    expect(result.value.readiness.statusLabel).toBeNull();
  });

  it("keeps unknown importance as unclassified (never optional)", () => {
    const result = normalize({
      ...base,
      missing_context: [{ id: "g", label: "Compliance", importance: "critical-ish" }],
    });
    expect(result.value.missingContext[0].importance).toBe("unclassified");
    expect(result.value.missingContext[0].importanceRaw).toBe("critical-ish");
  });

  it("only grants permission for explicit boolean true", () => {
    const result = normalize({
      ...base,
      generation_policy: { can_generate: "true", can_generate_anyway: 1, reason: "  Need the audience  " },
    });
    expect(result.value.generationPolicy).toEqual({
      canGenerate: false,
      canGenerateAnyway: false,
      reason: "Need the audience",
    });
    expect(normalize({ ...base, generation_policy: undefined }).value.generationPolicy).toEqual(CLOSED_GENERATION_POLICY);
  });

  it("drops gaps without a stable id or label and duplicates", () => {
    const result = normalize({
      ...base,
      missing_context: [
        { label: "No id" },
        { id: "a", label: "" },
        { id: "a", label: "First" },
        { id: "a", label: "Duplicate" },
        { id: 7, label: "Numeric id" },
      ],
    });
    expect(result.value.missingContext.map((g) => g.id)).toEqual(["a", "7"]);
    expect(result.value.issues.length).toBeGreaterThan(0);
  });

  it("rejects responses for another thread or revision", () => {
    expect(normalize({ ...base, thread_id: "other" }).ok).toBe(false);
    expect(normalize({ ...base, client_revision: 2 }).ok).toBe(false);
    expect(normalize(null).ok).toBe(false);
    expect(normalize([]).ok).toBe(false);
  });
});

describe("sortGapsByImportance", () => {
  it("groups by importance and preserves backend order within a group", () => {
    const gaps = [
      { id: "o1", importance: "optional" },
      { id: "r1", importance: "recommended" },
      { id: "u1", importance: "unclassified" },
      { id: "q1", importance: "required" },
      { id: "r2", importance: "recommended" },
      { id: "q2", importance: "required" },
    ];
    expect(sortGapsByImportance(gaps).map((g) => g.id)).toEqual(["q1", "q2", "r1", "r2", "o1", "u1"]);
  });
});
