/* ---------------------------------------------------------------
   Prompt testing (spec §13–16, §51). Runs are simulated but
   deterministic: the same prompt, model, input and criteria always give
   the same result, so the UI is stable until the execution API exists.
   Hand-off point: send the prompt + input to the model provider and let
   the evaluation service grade each criterion.
----------------------------------------------------------------*/
import { MODELS_CATALOG, estimateCost, modelById } from "../data/models";
import { estimateTokens } from "./analysis";
import { promptToText } from "./promptText";
import { findKind } from "./sections";
import { seeded, simulateModelRun } from "./simulate";

/* Lower-case the first letter unless it starts an acronym ("KPIs"). */
const lower = (text) => (/^[A-Z]{2}/.test(text) ? text : text.charAt(0).toLowerCase() + text.slice(1));

/* Success criteria suggested from the prompt's own requirements and format. */
export function suggestCriteria(sections) {
  const requirements = (findKind(sections, "requirements")?.items ?? []).slice(0, 6).map((item) => `Response contains ${lower(item.text.replace(/\.$/, ""))}`);
  const format = findKind(sections, "output", "preferences") ? ["Response follows the requested structure"] : [];
  const criteria = [...requirements, ...format];
  return criteria.length ? criteria : ["Response answers the request directly", "Response follows the requested structure"];
}

/* Why a criterion failed and the requirement that would fix it. */
function diagnose(criterion) {
  const subject = criterion.replace(/^Response (?:contains|follows|includes|provides)\s+/i, "");
  const measurable = /kpi|metric|measure/i.test(subject);
  return {
    why: measurable ? "The response did not provide measurable KPIs." : `The response did not clearly cover ${lower(subject)}.`,
    fix: measurable ? "Measurable KPIs with target values" : `Explicitly include ${lower(subject)}`,
    suggestion: measurable ? "Add an explicit requirement requesting measurable KPIs." : `Add an explicit requirement for ${lower(subject)}.`,
  };
}

/* Pass likelihood rises with how explicitly the prompt asks for the thing. */
function passChance(criterion, text, temperature) {
  const words = criterion
    .toLowerCase()
    .replace(/^response (?:contains|follows|includes|provides)\s+/, "")
    .split(/\W+/)
    .filter((word) => word.length > 3);
  const covered = words.length ? words.filter((word) => text.includes(word)).length / words.length : 0.5;
  const strict = /measurable|kpi/i.test(criterion) && !/measurable|target/i.test(text) ? -0.35 : 0;
  return Math.max(0.15, Math.min(0.97, 0.45 + covered * 0.5 + strict - temperature * 0.1));
}

/* Placeholder response built from the prompt's requirements. */
function mockResponse(sections, input) {
  const objective = findKind(sections, "objective", "task")?.content ?? "Here is the response.";
  const items = findKind(sections, "requirements")?.items ?? [];
  const parts = items.slice(0, 6).map((item, index) => `## ${index + 1}. ${item.text}\n[Simulated content for “${item.text}”]`);
  return [`# Response`, `Task: ${objective}`, input ? `Input used: ${input.slice(0, 160)}` : "", ...parts].filter(Boolean).join("\n\n");
}

/* -> { response, inputTokens, outputTokens, latency, cost, results: [{ criterion, passed, why, fix, suggestion }], passed, total, score } */
export function runTest({ sections, modelId, input = "", criteria, temperature = 0.7, maxTokens = 1500, versionKey = "" }) {
  const model = modelById(modelId) ?? MODELS_CATALOG[0];
  const text = promptToText(sections);
  const lowerText = text.toLowerCase();
  const inputTokens = estimateTokens(`${text}\n${input}`);
  const run = simulateModelRun(model, `${versionKey}:${text}:${input}`, inputTokens);
  const outputTokens = Math.min(maxTokens, run.outputTokens);
  const rand = seeded(`${model.id}:${text}:${input}:${criteria.join("|")}:${temperature}`);
  const results = criteria.map((criterion) => {
    const passed = rand() < passChance(criterion, lowerText, temperature) * (model.quality / 92);
    return { criterion, passed, ...(passed ? {} : diagnose(criterion)) };
  });
  const passed = results.filter((result) => result.passed).length;
  const total = results.length || 1;
  return {
    modelId: model.id,
    model: model.name,
    response: mockResponse(sections, input),
    inputTokens,
    outputTokens,
    latency: run.latency,
    cost: estimateCost(model, inputTokens, outputTokens),
    results,
    passed,
    total: results.length,
    score: Math.round((passed / total) * 80 + run.adherence * 0.2),
  };
}

/* Best version among those with test results (spec §51). */
export function recommendVersion(versions, qualityOf) {
  const tested = versions.filter((version) => version.test);
  if (tested.length < 2) return null;
  const rank = (version) => version.test.score * 0.6 + qualityOf(version) * 0.4;
  const best = [...tested].sort((a, b) => rank(b) - rank(a))[0];
  const runnerUp = [...tested].sort((a, b) => rank(b) - rank(a))[1];
  return {
    version: best,
    facts: [
      ["Prompt Quality", qualityOf(best)],
      ["Tested Performance", best.test.score],
      ["Tests Passed", `${best.test.passed}/${best.test.total}`],
      ["Estimated Cost", `$${best.test.cost.toFixed(3)}/run`],
    ],
    why:
      best.test.score >= runnerUp.test.score
        ? `Highest tested performance of the ${tested.length} tested versions, with ${best.test.passed}/${best.test.total} criteria passed.`
        : `Best balance of construction quality and test results among ${tested.length} tested versions.`,
  };
}
