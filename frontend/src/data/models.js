/* Supported models, shared by Model Lab, the testing playground and
   Settings. Prices are list prices in USD per 1M tokens and are only used
   for estimates; every screen that shows a cost states these assumptions.
   Hand-off point: load availability and pricing from the providers API. */
export const MODELS_CATALOG = [
  {
    id: "gpt-4o",
    name: "GPT-4o",
    provider: "OpenAI",
    price: { input: 2.5, output: 10 },
    quality: 90,
    speed: 0.85,
    strengths: "Structured business analysis",
  },
  {
    id: "claude-3-5-sonnet",
    name: "Claude 3.5 Sonnet",
    provider: "Anthropic",
    price: { input: 3, output: 15 },
    quality: 92,
    speed: 0.8,
    strengths: "Long-form writing and careful instruction following",
  },
  {
    id: "gemini-1-5-pro",
    name: "Gemini 1.5 Pro",
    provider: "Google",
    price: { input: 1.25, output: 5 },
    quality: 86,
    speed: 0.9,
    strengths: "Large context and research summaries",
  },
  {
    id: "llama-3-1-70b",
    name: "Llama 3.1 70B",
    provider: "Meta",
    price: { input: 0.6, output: 0.8 },
    quality: 80,
    speed: 1,
    strengths: "Low-cost drafts and high volume",
  },
  {
    id: "mistral-large",
    name: "Mistral Large",
    provider: "Mistral",
    price: { input: 2, output: 6 },
    quality: 83,
    speed: 0.92,
    strengths: "Multilingual tasks",
  },
];

export const PROVIDERS = ["OpenAI", "Anthropic", "Google", "Meta", "Mistral"];

export const modelById = (id) => MODELS_CATALOG.find((model) => model.id === id);

/* Cost of one run in USD for the given token counts. */
export const estimateCost = (model, inputTokens, outputTokens) =>
  (inputTokens * model.price.input + outputTokens * model.price.output) / 1_000_000;

export const formatCost = (usd) => (usd < 0.01 ? `$${usd.toFixed(4)}` : `$${usd.toFixed(3)}`);

export const PRICING_NOTE =
  "Estimates use list prices per 1M tokens (input / output): " +
  MODELS_CATALOG.map(({ name, price }) => `${name} $${price.input} / $${price.output}`).join(", ") +
  ".";
