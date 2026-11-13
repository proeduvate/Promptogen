import { describe, it, expect } from "vitest";
import {
  formatPipelineAnswers,
  upsertContextAddition,
  removeContextAddition,
  toContextAdditionsPayload,
} from "../pipelineAnswers";

const questions = [
  { id: 1, question: "Audience?", options: ["Developers", "Managers"] },
  { id: 2, question: "Channels?", options: ["Email", "Social"] },
  { id: 3, question: "Dates?" },
  { id: 4, question: "Notes?" },
];

describe("formatPipelineAnswers", () => {
  const answers = {
    1: "Managers",
    2: ["Email", "Social"],
    3: { start: "2026-01-01", end: "2026-02-01" },
    "1_other": "",
    "4_other": "Custom note",
  };

  it("keeps the existing generation defaults when fillDefaults is true", () => {
    expect(formatPipelineAnswers(questions, answers, { fillDefaults: true })).toEqual([
      { question_id: 1, question: "Audience?", selected_option: "Managers", custom_input: "" },
      { question_id: 2, question: "Channels?", selected_option: "Email, Social", custom_input: "" },
      { question_id: 3, question: "Dates?", selected_option: "start: 2026-01-01, end: 2026-02-01", custom_input: "" },
      { question_id: 4, question: "Notes?", selected_option: "Default", custom_input: "Custom note" },
    ]);
  });

  it("sends unanswered questions as blank for readiness checks", () => {
    const out = formatPipelineAnswers(questions, { 1: "", 2: [] }, { fillDefaults: false });
    expect(out.map((a) => a.selected_option)).toEqual(["", "", "", ""]);
    expect(out.map((a) => a.question_id)).toEqual([1, 2, 3, 4]);
  });

  it("supports the q_<id> answer key", () => {
    expect(formatPipelineAnswers([questions[0]], { q_1: "Developers" }, { fillDefaults: false })[0].selected_option).toBe(
      "Developers"
    );
  });
});

describe("context additions", () => {
  it("upserts by gap_id without duplicating or reordering", () => {
    let list = [];
    list = upsertContextAddition(list, { gap_id: "a", value: "one", label: "A" });
    list = upsertContextAddition(list, { gap_id: "b", value: "two", label: "B" });
    list = upsertContextAddition(list, { gap_id: "a", value: "edited", label: "A" });
    expect(list).toEqual([
      { gap_id: "a", value: "edited", label: "A" },
      { gap_id: "b", value: "two", label: "B" },
    ]);
  });

  it("removes by gap_id and builds a trimmed payload", () => {
    const list = [
      { gap_id: "a", value: "  keep  ", label: "A" },
      { gap_id: "b", value: "   ", label: "B" },
      { gap_id: "c", value: "drop", label: "C" },
    ];
    expect(toContextAdditionsPayload(removeContextAddition(list, "c"))).toEqual([{ gap_id: "a", value: "keep" }]);
    expect(toContextAdditionsPayload(undefined)).toEqual([]);
  });
});
