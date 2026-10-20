import { Coins } from "lucide-react";
import { MODELS_CATALOG, PRICING_NOTE, estimateCost, formatCost, modelById } from "../../data/models";
import { estimateTokens } from "../../lib/analysis";
import { redundancyOf } from "../../lib/optimizer";
import { promptToText } from "../../lib/promptText";
import { findKind } from "../../lib/sections";
import { CARD, btn } from "../../lib/ui";

const OUTPUT_BY_LENGTH = { concise: 350, balanced: 700, detailed: 1400 };

/* Expected response length, read from the prompt's own Length setting. */
export function estimateOutputTokens(sections) {
  const length = findKind(sections, "output", "preferences")?.items?.find((item) => /length/i.test(item.key ?? ""))?.text.toLowerCase() ?? "";
  const match = Object.keys(OUTPUT_BY_LENGTH).find((key) => length.includes(key));
  return OUTPUT_BY_LENGTH[match ?? "balanced"];
}

/* Cost and token analysis (spec §48), shown in Advanced mode. */
export default function TokenCostCard({ sections, modelId, onOptimizeTokens }) {
  const input = estimateTokens(promptToText(sections));
  const output = estimateOutputTokens(sections);
  const model = modelById(modelId) ?? MODELS_CATALOG[0];
  const cheapest = [...MODELS_CATALOG].sort((a, b) => estimateCost(a, input, output) - estimateCost(b, input, output))[0];
  const redundancy = redundancyOf(sections);
  const rows = [
    ["Prompt tokens", input.toLocaleString("en-US")],
    ["Expected output tokens", `~${output.toLocaleString("en-US")}`],
    [`Estimated cost on ${model.name}`, `${formatCost(estimateCost(model, input, output))} / run`],
    ...(cheapest.id !== model.id ? [[`Lowest-cost option (${cheapest.name})`, `${formatCost(estimateCost(cheapest, input, output))} / run`]] : []),
  ];

  return (
    <section aria-labelledby="pg-tokens-title" className={`${CARD} p-6`}>
      <h2 id="pg-tokens-title" className="flex items-center gap-2 text-[17px] font-semibold">
        <Coins className="size-[18px] text-amber" strokeWidth={1.75} />
        Tokens &amp; Cost
      </h2>
      <dl className="mt-4 divide-y divide-line-soft text-[13px]">
        {rows.map(([label, value]) => (
          <div key={label} className="flex items-center justify-between gap-3 py-2">
            <dt className="text-muted">{label}</dt>
            <dd className="font-medium">{value}</dd>
          </div>
        ))}
      </dl>
      {redundancy >= 5 ? (
        <div className="mt-3 rounded-lg border border-amber/40 bg-amber/5 p-3 text-[13px]">
          <p className="font-medium">Optimization opportunity</p>
          <p className="mt-0.5 text-muted">Approximately {redundancy}% of this prompt appears redundant.</p>
          <button type="button" onClick={onOptimizeTokens} className={`${btn("secondary", "sm")} mt-2`}>
            Optimize Tokens
          </button>
        </div>
      ) : (
        <p className="mt-3 text-[13px] text-muted">No significant redundancy found.</p>
      )}
      <p className="mt-3 text-[11px] leading-4 text-faint">Token counts are estimates (about 4 characters per token). {PRICING_NOTE}</p>
    </section>
  );
}
