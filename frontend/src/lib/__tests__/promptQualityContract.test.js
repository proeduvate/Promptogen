import { describe, it, expect } from "vitest";
import {
  normalizeQualityAssessment,
  getPromptTextForAssessment,
  toMetrics,
  resolveDimensionLevel,
  QUALITY_DIMENSIONS,
} from "../promptQualityContract";
import { RICH_ASSESSMENT, LEGACY_RESPONSE, clone } from "../../test/qualityFixtures";

describe("normalizeQualityAssessment: proposed rich contract", () => {
  it("reads quality_assessment from a pipeline response and keeps backend values unchanged", () => {
    const qa = normalizeQualityAssessment({ thread_id: "t", optimized_prompt: "x", quality_assessment: clone(RICH_ASSESSMENT) });
    expect(qa.available).toBe(true);
    expect(qa.source).toBe("assessment");
    expect(qa.overallScore).toBe(85);
    expect(qa.classification).toBe("good");
    expect(qa.classificationLabel).toBe("Good");
    expect(qa.assessedAt).toBe("2026-11-23T10:15:00Z");
    expect(qa.promptVersion).toBe(2);
    expect(qa.summary).toMatch(/market context/);
    expect(qa.notAssessed).toEqual([]);
    // Spec order regardless of response order
    expect(qa.dimensions.map((d) => d.id)).toEqual(QUALITY_DIMENSIONS.map((d) => d.id));
  });

  it("keeps explanations, weaknesses, missing information and recommendations per dimension", () => {
    const qa = normalizeQualityAssessment(clone(RICH_ASSESSMENT));
    const context = qa.dimensions.find((d) => d.id === "context");
    expect(context).toMatchObject({
      name: "Context",
      score: 76,
      level: "moderate",
      levelSource: "backend",
      explanation: "Your prompt contains useful context but could be improved.",
      weaknesses: ["Audience is described only in general terms."],
      missingInformation: ["Geographic market", "Competitor information"],
    });
    expect(context.recommendations).toEqual([
      { id: "rec-ctx", text: "Add the geographic market and main competitors.", impact: "high", dimensionId: "context" },
    ]);
  });

  it("attaches top-level suggestions to dimensions only when the API maps them", () => {
    const qa = normalizeQualityAssessment(clone(RICH_ASSESSMENT));
    const constraints = qa.dimensions.find((d) => d.id === "constraints");
    expect(constraints.recommendations.map((r) => r.text)).toEqual(["Specify the campaign timeline."]);
    expect(qa.generalSuggestions).toEqual([{ id: "s-2", text: "Mention the brand voice.", impact: "low", dimensionId: null }]);
  });

  it("never fabricates a score, level or classification", () => {
    const raw = clone(RICH_ASSESSMENT);
    raw.overall_score = "85";
    raw.classification = undefined;
    raw.dimensions = [
      { id: "clarity", score: 101 },
      { id: "context", score: 85.5 },
      { id: "structure" },
    ];
    const qa = normalizeQualityAssessment(raw);
    expect(qa.overallScore).toBeNull();
    expect(qa.classificationLabel).toBeNull();
    expect(qa.available).toBe(false);
    for (const dim of qa.dimensions) {
      expect(dim.score).toBeNull();
      expect(dim.level).toBeNull();
    }
  });

  it("shows an unknown classification as the backend's own text", () => {
    const qa = normalizeQualityAssessment({ ...clone(RICH_ASSESSMENT), classification: "Outstanding" });
    expect(qa.classification).toBeNull();
    expect(qa.classificationLabel).toBe("Outstanding");
    const labelled = normalizeQualityAssessment({ ...clone(RICH_ASSESSMENT), classification_label: "Good (B+)" });
    expect(labelled.classificationLabel).toBe("Good (B+)");
  });

  it("lists spec dimensions the backend omitted as not assessed and keeps extra dimensions", () => {
    const raw = clone(RICH_ASSESSMENT);
    raw.dimensions = [
      { id: "tone_fit", name: "Tone Fit", score: 70 },
      { id: "Output Definition", score: 61 },
      { id: "clarity", score: 90 },
    ];
    const qa = normalizeQualityAssessment(raw);
    expect(qa.dimensions.map((d) => d.id)).toEqual(["clarity", "output_definition", "tone_fit"]);
    expect(qa.dimensions.find((d) => d.id === "output_definition").name).toBe("Output Definition");
    expect(qa.notAssessed.map((d) => d.name)).toEqual([
      "Specificity",
      "Context",
      "Structure",
      "Actionability",
      "Constraints",
      "Consistency",
    ]);
  });
});

describe("normalizeQualityAssessment: current backend (legacy flat fields)", () => {
  it("shows only the returned scores and marks the rest as not assessed", () => {
    const qa = normalizeQualityAssessment(clone(LEGACY_RESPONSE));
    expect(qa.source).toBe("legacy");
    expect(qa.overallScore).toBe(81);
    expect(qa.classificationLabel).toBeNull();
    expect(qa.assessedAt).toBeNull();
    expect(qa.dimensions.map((d) => [d.id, d.score])).toEqual([
      ["clarity", 88],
      ["specificity", 79],
      ["context", 64],
      ["structure", 90],
      ["actionability", 55],
    ]);
    expect(qa.dimensions.every((d) => d.explanation === null)).toBe(true);
    expect(qa.notAssessed.map((d) => d.id)).toEqual(["constraints", "output_definition", "consistency"]);
    expect(qa.generalSuggestions.map((s) => s.text)).toEqual(["Define the output format.", "Add success criteria."]);
  });

  it("is unavailable when no scores are present", () => {
    for (const raw of [null, undefined, {}, { sections: [] }, { overall_score: null, clarity: undefined }]) {
      const qa = normalizeQualityAssessment(raw);
      expect(qa.available).toBe(false);
      expect(qa.overallScore).toBeNull();
      expect(qa.dimensions).toEqual([]);
      expect(qa.notAssessed).toHaveLength(8);
    }
  });
});

describe("resolveDimensionLevel", () => {
  it("prefers the backend level and only falls back to a display band for a real score", () => {
    expect(resolveDimensionLevel(95, "weak")).toEqual({ level: "weak", levelSource: "backend" });
    expect(resolveDimensionLevel(85, null)).toEqual({ level: "strong", levelSource: "score" });
    expect(resolveDimensionLevel(65, undefined)).toEqual({ level: "moderate", levelSource: "score" });
    expect(resolveDimensionLevel(40, "unknown")).toEqual({ level: "weak", levelSource: "score" });
    expect(resolveDimensionLevel(null, null)).toEqual({ level: null, levelSource: null });
  });
});

describe("helpers", () => {
  it("builds assessment text from the optimized prompt or sections", () => {
    expect(getPromptTextForAssessment({ optimized_prompt: " Full prompt " })).toBe("Full prompt");
    expect(
      getPromptTextForAssessment({
        sections: [
          { label: "Role", content: "You are an analyst." },
          { title: "Steps", items: [{ text: "Collect data" }, "Report"] },
        ],
      })
    ).toBe("### Role\nYou are an analyst.\n\n### Steps\n- Collect data\n- Report");
    expect(getPromptTextForAssessment(null)).toBe("");
  });

  it("exposes only returned dimension scores as metrics", () => {
    expect(toMetrics(normalizeQualityAssessment(clone(LEGACY_RESPONSE)))).toEqual({
      clarity: 88,
      specificity: 79,
      context: 64,
      structure: 90,
      actionability: 55,
    });
    expect(toMetrics(normalizeQualityAssessment({}))).toBeNull();
  });
});
