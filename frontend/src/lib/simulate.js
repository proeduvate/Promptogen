import { estimateCost } from "../data/models";

/* ---------------------------------------------------------------
   Deterministic stand-ins for model runs. The same prompt + model always
   produces the same numbers, so the UI is stable until the real
   execution API replaces this. Hand-off point: swap these for API calls.
----------------------------------------------------------------*/
export function hashString(text) {
  let hash = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

/* Tiny seeded RNG (xorshift) returning numbers in [0, 1). */
export function seeded(seedText) {
  let state = hashString(seedText) || 1;
  return () => {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    return ((state >>> 0) % 10_000) / 10_000;
  };
}

export const clampScore = (value) => Math.max(0, Math.min(100, Math.round(value)));

/* Rough token count (~4 characters per token for English text). */
export const estimateTokens = (text) => Math.max(1, Math.ceil(text.trim().length / 4));

export function simulateModelRun(model, promptKey, inputTokens) {
  const rand = seeded(`${model.id}:${promptKey}`);
  const spread = (amount) => (rand() * 2 - 1) * amount;
  const quality = clampScore(model.quality + spread(4));
  const completeness = clampScore(quality + spread(6));
  const adherence = clampScore(quality + spread(6));
  const format = clampScore(quality + 2 + spread(5));
  const overall = clampScore(quality * 0.35 + completeness * 0.25 + adherence * 0.25 + format * 0.15);
  const outputTokens = Math.round(850 + rand() * 600);
  const latency = Math.round((outputTokens / (115 * model.speed)) * 10) / 10;
  return {
    modelId: model.id,
    quality,
    completeness,
    adherence,
    format,
    overall,
    inputTokens,
    outputTokens,
    latency,
    cost: estimateCost(model, inputTokens, outputTokens),
  };
}

export const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
