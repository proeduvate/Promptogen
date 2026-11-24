import { describe, it, expect } from "vitest";
import { buildImprovementRequest } from "../qualityImprovement";
import { normalizeQualityAssessment } from "../promptQualityContract";
import { RICH_ASSESSMENT, LEGACY_RESPONSE, clone } from "../../test/qualityFixtures";

describe("buildImprovementRequest", () => {
  it("uses the backend's recommendations, labelled with their dimension", () => {
    const { message, items } = buildImprovementRequest(normalizeQualityAssessment(clone(RICH_ASSESSMENT)));
    expect(items).toEqual([
      "[Context] Add the geographic market and main competitors.",
      "[Constraints] Specify the campaign timeline.",
      "Mention the brand voice.",
    ]);
    expect(message).toMatch(/^Improve this prompt by applying these quality assessment suggestions:/);
    expect(message).toContain("- [Context] Add the geographic market and main competitors.");
  });

  it("uses legacy suggestions when that is all the backend returned", () => {
    const { items } = buildImprovementRequest(normalizeQualityAssessment(clone(LEGACY_RESPONSE)));
    expect(items).toEqual(["Define the output format.", "Add success criteria."]);
  });

  it("falls back to reported weaknesses and missing information, then to a generic request", () => {
    const raw = clone(RICH_ASSESSMENT);
    raw.suggestions = [];
    raw.dimensions = raw.dimensions.map((d) => ({ ...d, recommendations: [] }));
    const { items } = buildImprovementRequest(normalizeQualityAssessment(raw));
    expect(items).toContain("[Context] Add missing information: Geographic market");
    expect(items).toContain("[Constraints] Address: No budget or timeline.");

    const generic = buildImprovementRequest(null);
    expect(generic.items).toEqual([]);
    expect(generic.message).toMatch(/^Improve this prompt/);
  });
});
