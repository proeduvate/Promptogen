import { useId, useMemo, useState } from "react";
import { FlaskConical, Play, Loader2, Trophy, Check, GitBranch, Info, Star } from "lucide-react";
import PageShell from "../components/PageShell";
import PageHeader from "../components/PageHeader";
import EmptyState from "../components/EmptyState";
import SelectInput from "../components/SelectInput";
import useSettings from "../hooks/useSettings";
import { MODELS_CATALOG, PRICING_NOTE, formatCost, modelById } from "../data/models";
import { GENERATED_PROMPT } from "../data/generated";
import { promptToText } from "../lib/promptText";
import { estimateTokens, simulateModelRun, wait } from "../lib/simulate";
import { CARD, ICON_TILE, btn } from "../lib/ui";

const PRIORITIES = [
  { id: "balanced", label: "Balanced" },
  { id: "quality", label: "Best Quality" },
  { id: "cost", label: "Lowest Cost" },
  { id: "speed", label: "Fastest" },
];

const COLUMNS = [
  { key: "overall", label: "Overall", best: "max" },
  { key: "quality", label: "Quality", best: "max" },
  { key: "completeness", label: "Completeness", best: "max" },
  { key: "adherence", label: "Adherence", title: "Instruction adherence", best: "max" },
  { key: "format", label: "Format", title: "Format compliance", best: "max" },
  { key: "latency", label: "Latency", best: "min", format: (value) => `${value.toFixed(1)} s` },
  { key: "outputTokens", label: "Tokens in / out", format: (value, row) => `${row.inputTokens} / ${value}` },
  { key: "cost", label: "Est. cost / run", best: "min", format: (value) => formatCost(value) },
];

/* Pick the recommended model for a priority and explain the choice (spec §18). */
function recommend(results, priority) {
  const by = (key, dir) => [...results].sort((a, b) => (dir === "max" ? b[key] - a[key] : a[key] - b[key]))[0];
  const best = by("overall", "max");
  const cheapest = by("cost", "min");
  const fastest = by("latency", "min");

  let pick;
  let why;
  if (priority === "quality") {
    pick = best;
    why = `Highest overall evaluation score (${best.overall}).`;
  } else if (priority === "cost") {
    pick = cheapest;
    why = `Lowest estimated cost (${formatCost(cheapest.cost)} per run) at ${cheapest.overall} overall.`;
  } else if (priority === "speed") {
    pick = fastest;
    why = `Fastest response (${fastest.latency.toFixed(1)} s) at ${fastest.overall} overall.`;
  } else {
    const maxCost = Math.max(...results.map((row) => row.cost));
    const maxLatency = Math.max(...results.map((row) => row.latency));
    const score = (row) => row.overall - (row.cost / maxCost) * 8 - (row.latency / maxLatency) * 4;
    pick = [...results].sort((a, b) => score(b) - score(a))[0];
    why = `Best balance of quality (${pick.overall}), cost and speed among the models tested.`;
  }

  let tradeOff;
  if (pick.modelId !== best.modelId) {
    tradeOff = `Scores ${best.overall - pick.overall} points lower than ${modelById(best.modelId).name}.`;
  } else if (pick.modelId !== cheapest.modelId) {
    tradeOff = `Costs ${formatCost(pick.cost - cheapest.cost)} more per run than ${modelById(cheapest.modelId).name}.`;
  } else if (pick.modelId !== fastest.modelId) {
    tradeOff = `About ${(pick.latency - fastest.latency).toFixed(1)} s slower than ${modelById(fastest.modelId).name}.`;
  } else {
    tradeOff = "None among the models tested.";
  }

  return { pick, why, tradeOff };
}

/* Run one prompt on several supported models and compare (spec §17–19). */
export default function ModelLabPage({ chrome, prompts, onLog }) {
  const id = useId();
  const [settings, updateSettings] = useSettings();

  const promptOptions = useMemo(
    () => [
      { value: "generated", label: `${GENERATED_PROMPT.title} (current)`, sections: GENERATED_PROMPT.sections },
      ...prompts
        .filter((prompt) => prompt.versions?.length)
        .map((prompt) => {
          const current = prompt.versions.find(({ id: versionId }) => versionId === prompt.currentVersion);
          return { value: prompt.id, label: `${prompt.title} (${current.id})`, sections: current.sections };
        }),
    ],
    [prompts],
  );

  const [promptKey, setPromptKey] = useState("generated");
  const [selected, setSelected] = useState(["gpt-4o", "claude-3-5-sonnet", "gemini-1-5-pro"]);
  const [priority, setPriority] = useState("balanced");
  const [input, setInput] = useState("");
  const [running, setRunning] = useState(false);
  const [results, setResults] = useState(null);
  const [notice, setNotice] = useState("");

  const toggleModel = (modelId) =>
    setSelected((list) =>
      list.includes(modelId) ? list.filter((item) => item !== modelId) : list.length < 4 ? [...list, modelId] : list,
    );

  const run = async () => {
    const option = promptOptions.find(({ value }) => value === promptKey);
    const inputTokens = estimateTokens(`${promptToText(option.sections)}\n${input}`);
    setRunning(true);
    setNotice("");
    await wait(900);
    const rows = selected.map((modelId) => simulateModelRun(modelById(modelId), `${promptKey}:${input}`, inputTokens));
    setResults({ rows, label: option.label });
    setRunning(false);
    onLog?.({
      type: "tested",
      title: `Tested on ${rows.length} models in Model Lab`,
      detail: `Recommended: ${modelById(recommend(rows, priority).pick.modelId).name}`,
      prompt: option.label,
    });
  };

  const recommendation = results ? recommend(results.rows, priority) : null;
  const pickModel = recommendation ? modelById(recommendation.pick.modelId) : null;

  const bestValue = (column) => {
    if (!results || !column.best) return null;
    const values = results.rows.map((row) => row[column.key]);
    return column.best === "max" ? Math.max(...values) : Math.min(...values);
  };

  return (
    <PageShell
      chrome={chrome}
      header={
        <PageHeader
          title="Model Lab"
          subtitle="Run one prompt on several supported models and see which works best for the task."
        />
      }
    >
      <div className="grid grid-cols-1 items-start gap-5 xl:grid-cols-[360px_minmax(0,1fr)]">
        {/* Configuration */}
        <section className={`${CARD} space-y-5 p-6`} aria-label="Test setup">
          <div>
            <label htmlFor={`${id}-prompt`} className="mb-2 block text-[13px] font-medium">
              Prompt
            </label>
            <SelectInput id={`${id}-prompt`} value={promptKey} onChange={setPromptKey} options={promptOptions} />
          </div>

          <fieldset>
            <legend className="mb-2 text-[13px] font-medium">Models</legend>
            <div className="flex flex-wrap gap-2">
              {MODELS_CATALOG.map((model) => {
                const isOn = selected.includes(model.id);
                return (
                  <button
                    key={model.id}
                    type="button"
                    aria-pressed={isOn}
                    onClick={() => toggleModel(model.id)}
                    className={[
                      "flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[13px] transition-colors",
                      isOn
                        ? "border-brand/40 bg-brand/10 font-medium text-brand"
                        : "border-line bg-surface-2 text-muted hover:bg-surface-3 hover:text-text",
                    ].join(" ")}
                  >
                    {isOn && <Check className="size-3.5" strokeWidth={2.5} />}
                    {model.name}
                  </button>
                );
              })}
            </div>
            <p className="mt-2 text-[12px] text-muted">Pick 2–4 models. {selected.length} selected.</p>
          </fieldset>

          <fieldset>
            <legend className="mb-2 text-[13px] font-medium">Priority</legend>
            <div role="radiogroup" aria-label="Priority" className="grid grid-cols-2 gap-2">
              {PRIORITIES.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  role="radio"
                  aria-checked={priority === option.id}
                  onClick={() => setPriority(option.id)}
                  className={[
                    "rounded-lg border px-3 py-2 text-[13px] transition-colors",
                    priority === option.id
                      ? "border-brand bg-brand/10 font-medium text-brand"
                      : "border-line bg-surface-2 text-muted hover:bg-surface-3 hover:text-text",
                  ].join(" ")}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </fieldset>

          <div>
            <label htmlFor={`${id}-input`} className="mb-2 block text-[13px] font-medium">
              Test input <span className="font-normal text-faint">(optional)</span>
            </label>
            <textarea
              id={`${id}-input`}
              rows={3}
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder="e.g., Our launch market is India with a ₹1,00,000 monthly budget."
              className="w-full resize-none rounded-lg border border-line bg-surface-2 px-3.5 py-2.5 text-[14px] text-text outline-none placeholder:text-faint focus:border-brand/60"
            />
          </div>

          <button
            type="button"
            onClick={run}
            disabled={running || selected.length < 2}
            className={`${btn("primary")} w-full`}
          >
            {running ? <Loader2 className="size-4 animate-spin" /> : <Play className="size-4" />}
            {running ? "Running tests…" : "Run comparison"}
          </button>
        </section>

        {/* Results */}
        <div className="min-w-0 space-y-5" aria-live="polite">
          {!results ? (
            <EmptyState
              icon={FlaskConical}
              title="Compare models side by side"
              body="Choose a prompt and at least two models, then run the comparison. Promptogen runs equivalent tests and recommends a model based on the measured results."
            />
          ) : (
            <>
              <section className={`${CARD} border-good/30 p-6`}>
                <div className="flex flex-wrap items-start gap-4">
                  <span className={`${ICON_TILE} size-12 bg-good/10 ring-good/20`}>
                    <Trophy className="size-6 text-good" strokeWidth={1.75} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[12px] font-semibold uppercase tracking-wider text-good">Recommended model</p>
                    <h2 className="mt-0.5 text-[22px] font-semibold">{pickModel.name}</h2>
                    <dl className="mt-3 grid grid-cols-1 gap-x-6 gap-y-2 text-[13px] sm:grid-cols-[auto_1fr]">
                      <dt className="text-muted">Why?</dt>
                      <dd>{recommendation.why}</dd>
                      <dt className="text-muted">Best for</dt>
                      <dd>{pickModel.strengths}</dd>
                      <dt className="text-muted">Trade-off</dt>
                      <dd>{recommendation.tradeOff}</dd>
                    </dl>
                  </div>
                </div>
                <div className="mt-5 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      updateSettings("model", pickModel.id);
                      setNotice(`${pickModel.name} is now your default model.`);
                    }}
                    disabled={settings.model === pickModel.id}
                    className={btn("secondary", "sm")}
                  >
                    <Star className="size-4" />
                    {settings.model === pickModel.id ? "Your default model" : "Set as default model"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      // Hand-off point: create the variant through the versions API.
                      onLog?.({
                        type: "generated",
                        title: `Created a ${pickModel.name} variant`,
                        detail: "Base prompt unchanged",
                        prompt: results.label,
                      });
                      setNotice(`Created a ${pickModel.name} variant. Your base prompt is unchanged.`);
                    }}
                    className={btn("brandSoft", "sm")}
                  >
                    <GitBranch className="size-4" />
                    Create {pickModel.name} variant
                  </button>
                </div>
                {notice && (
                  <p role="status" className="mt-3 flex items-center gap-2 text-[13px] text-good">
                    <Check className="size-4" strokeWidth={2.5} />
                    {notice}
                  </p>
                )}
              </section>

              <section className={`${CARD} min-w-0 overflow-hidden`}>
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-5 py-4">
                  <h2 className="text-[16px] font-semibold">Results · {results.label}</h2>
                  <span className="rounded-full bg-amber/10 px-2.5 py-0.5 text-[11px] font-medium text-amber ring-1 ring-amber/25">
                    Simulated until providers are connected
                  </span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[760px] text-left text-[13px]">
                    <thead>
                      <tr className="border-b border-line bg-surface-2 text-[12px] text-muted">
                        <th scope="col" className="px-5 py-3 font-medium">Model</th>
                        {COLUMNS.map((column) => (
                          <th key={column.key} scope="col" title={column.title} className="whitespace-nowrap px-3 py-3 font-medium last:pr-5">
                            {column.label}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {results.rows.map((row) => {
                        const model = modelById(row.modelId);
                        const isPick = row.modelId === pickModel.id;
                        return (
                          <tr key={row.modelId} className={`border-b border-line-soft last:border-0 ${isPick ? "bg-good/5" : ""}`}>
                            <th scope="row" className="whitespace-nowrap px-5 py-3.5 font-medium">
                              {model.name}
                              <span className="block text-[11px] font-normal text-faint">{model.provider}</span>
                            </th>
                            {COLUMNS.map((column) => {
                              const value = row[column.key];
                              const isBest = column.best && value === bestValue(column);
                              return (
                                <td
                                  key={column.key}
                                  className={`whitespace-nowrap px-3 py-3.5 tabular-nums last:pr-5 ${isBest ? "font-semibold text-good" : ""}`}
                                >
                                  {column.format ? column.format(value, row) : value}
                                </td>
                              );
                            })}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <p className="flex items-start gap-2 border-t border-line px-5 py-3.5 text-[12px] leading-5 text-muted">
                  <Info className="mt-0.5 size-3.5 shrink-0 text-brand" />
                  {PRICING_NOTE} Token counts are estimated at about 4 characters per token.
                </p>
              </section>
            </>
          )}
        </div>
      </div>
    </PageShell>
  );
}
