/**
 * TEST ONLY: backend-shaped quality assessment responses.
 * `RICH_ASSESSMENT` follows the PROPOSED `quality_assessment` contract;
 * `LEGACY_RESPONSE` matches what the current backend returns.
 */

export const RICH_ASSESSMENT = {
  assessment_id: "qa-1",
  assessed_at: "2026-11-23T10:15:00Z",
  prompt_version: 2,
  overall_score: 85,
  classification: "good",
  summary: "Well structured, but the market context is thin.",
  dimensions: [
    { id: "context", name: "Context", score: 76, level: "moderate",
      explanation: "Your prompt contains useful context but could be improved.",
      weaknesses: ["Audience is described only in general terms."],
      missing_information: ["Geographic market", "Competitor information"],
      recommendations: [{ id: "rec-ctx", text: "Add the geographic market and main competitors.", impact: "high" }] },
    { id: "clarity", name: "Clarity", score: 92, level: "strong", explanation: "Clear and unambiguous goal." },
    { id: "specificity", name: "Specificity", score: 84, level: "strong" },
    { id: "structure", name: "Structure", score: 94, level: "strong" },
    { id: "actionability", name: "Actionability", score: 90, level: "strong" },
    { id: "constraints", name: "Constraints", score: 58, level: "weak",
      explanation: "Few limits are stated.", weaknesses: ["No budget or timeline."] },
    { id: "output_definition", name: "Output Definition", score: 88, level: "strong" },
    { id: "consistency", name: "Consistency", score: 96, level: "strong" },
  ],
  suggestions: [
    { id: "s-1", text: "Specify the campaign timeline.", impact: "medium", dimension_id: "constraints" },
    { id: "s-2", text: "Mention the brand voice.", impact: "low" },
  ],
};

export const LEGACY_RESPONSE = {
  overall_score: 81,
  clarity: 88,
  specificity: 79,
  context: 64,
  structure: 90,
  actionability: 55,
  suggestions: ["Define the output format.", "Add success criteria."],
};

export function clone(value) {
  return JSON.parse(JSON.stringify(value));
}
