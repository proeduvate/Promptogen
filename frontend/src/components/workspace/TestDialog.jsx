import { useState } from "react";
import { Check, CircleAlert, FlaskConical, Loader2, Play, Plus, TriangleAlert, X } from "lucide-react";
import Dialog from "../Dialog";
import SelectInput from "../SelectInput";
import { MODELS_CATALOG, PRICING_NOTE, formatCost } from "../../data/models";
import { promptToText } from "../../lib/promptText";
import { runTest, suggestCriteria } from "../../lib/testing";
import { wait } from "../../lib/simulate";
import { btn } from "../../lib/ui";

const INPUT = "w-full rounded-lg border border-line bg-surface-2 px-3.5 py-2.5 text-[14px] text-text outline-none placeholder:text-faint focus:border-brand/60";
const sameList = (a = [], b = []) => a.length === b.length && a.every((item, index) => item === b[index]);

function Stat({ label, value }) {
  return (
    <div className="rounded-lg border border-line bg-surface-2 px-3 py-2">
      <dt className="text-[11px] text-muted">{label}</dt>
      <dd className="text-[14px] font-semibold">{value}</dd>
    </div>
  );
}

/* Testing playground (spec §13–16): pick a version, model, input and
   parameters, define success criteria, run, then see the response, token
   use, time, cost and which criteria passed. */
export default function TestDialog({ versions, draft, baseId, modelId, advanced, onClose, onRecord, onApplyFix }) {
  const options = [
    ...(draft.dirty ? [{ value: "draft", label: "Current draft (unsaved)" }] : []),
    ...[...versions].reverse().map((version) => ({ value: version.id, label: `${version.label} · ${version.name}` })),
  ];
  const [versionId, setVersionId] = useState(draft.dirty ? "draft" : baseId);
  const sectionsFor = (id) => (id === "draft" ? draft.sections : versions.find((version) => version.id === id).sections);
  const [model, setModel] = useState(modelId);
  const [input, setInput] = useState("");
  const [temperature, setTemperature] = useState(0.7);
  const [maxTokens, setMaxTokens] = useState(1500);
  const [criteria, setCriteria] = useState(() => suggestCriteria(sectionsFor(draft.dirty ? "draft" : baseId)));
  const [newCriterion, setNewCriterion] = useState("");
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState(null);
  const [regressionRuns, setRegressionRuns] = useState(null);
  const [fixed, setFixed] = useState([]);

  const config = (id) => ({ sections: sectionsFor(id), modelId: model, input, criteria, temperature, maxTokens, versionKey: id });

  const run = async () => {
    setRunning(true);
    setResult(null);
    setRegressionRuns(null);
    // Hand-off point: execute through the model provider and evaluation service.
    await wait(900);
    const outcome = runTest(config(versionId));
    setResult({ ...outcome, versionId });
    setRunning(false);
    onRecord(versionId, { passed: outcome.passed, total: outcome.total, score: outcome.score, model: outcome.model, cost: outcome.cost, criteria, at: Date.now() });
  };

  const rerunAll = async () => {
    setRunning(true);
    await wait(700);
    setRegressionRuns(
      [...versions].map((version) => {
        const outcome = runTest(config(version.id));
        onRecord(version.id, { passed: outcome.passed, total: outcome.total, score: outcome.score, model: outcome.model, cost: outcome.cost, criteria, at: Date.now() });
        return { version, ...outcome };
      }),
    );
    setRunning(false);
  };

  /* A previously passing version with the same criteria did better (spec §16). */
  const tested = result && versions.find((version) => version.id === result.versionId);
  const previous =
    result &&
    [...versions]
      .filter((version) => version.id !== result.versionId && version.test && sameList(version.test.criteria, criteria) && version.test.passed > result.passed)
      .sort((a, b) => b.number - a.number)[0];
  const failed = result?.results.filter((item) => !item.passed) ?? [];

  const footer = (
    <>
      <button type="button" onClick={onClose} className={`${btn()} mr-auto`}>
        Close
      </button>
      {advanced && versions.length > 1 && (
        <button type="button" onClick={rerunAll} disabled={running || criteria.length === 0} className={btn("secondary")}>
          Rerun on all versions
        </button>
      )}
      <button type="button" onClick={run} disabled={running || criteria.length === 0} className={btn("primary")}>
        {running ? <Loader2 className="size-4 animate-spin" /> : <Play className="size-4" />}
        {running ? "Running…" : "Run Prompt"}
      </button>
    </>
  );

  return (
    <Dialog open onClose={onClose} title="Test Prompt" description="Run the prompt and check the response against your own success criteria." icon={FlaskConical} tone="good" size="xl" footer={footer}>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="text-[13px] font-medium">
              Prompt version
              <SelectInput
                value={versionId}
                onChange={(id) => {
                  setVersionId(id);
                  setCriteria(suggestCriteria(sectionsFor(id)));
                }}
                options={options}
                className="mt-1.5"
              />
            </label>
            <label className="text-[13px] font-medium">
              AI model
              <SelectInput value={model} onChange={setModel} options={MODELS_CATALOG.map(({ id, name }) => ({ value: id, label: name }))} className="mt-1.5" />
            </label>
          </div>
          <label className="block text-[13px] font-medium">
            Test input <span className="font-normal text-faint">(optional)</span>
            <textarea
              rows={3}
              value={input}
              maxLength={1500}
              placeholder="Anything the prompt should work on, e.g. product details or a sample email"
              onChange={(event) => setInput(event.target.value)}
              className={`${INPUT} mt-1.5 resize-y`}
            />
          </label>
          <fieldset className="rounded-xl border border-line p-3.5">
            <legend className="px-1 text-[13px] font-medium">Model parameters</legend>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="text-[12px] text-muted">
                Temperature: <span className="font-medium text-text">{temperature.toFixed(1)}</span>
                <input type="range" min={0} max={1} step={0.1} value={temperature} onChange={(event) => setTemperature(Number(event.target.value))} className="mt-2 w-full accent-brand" />
              </label>
              <label className="text-[12px] text-muted">
                Max output tokens
                <input type="number" min={100} max={8000} step={100} value={maxTokens} onChange={(event) => setMaxTokens(Math.max(100, Number(event.target.value) || 100))} className={`${INPUT} mt-1 py-1.5`} />
              </label>
            </div>
          </fieldset>
          <fieldset>
            <legend className="text-[13px] font-medium">Success criteria</legend>
            <p className="mt-0.5 text-[12px] text-muted">What a successful response must do. Suggested from your requirements; edit freely.</p>
            <ul className="mt-2 space-y-1.5">
              {criteria.map((criterion, index) => (
                <li key={criterion} className="flex items-center gap-2 rounded-lg border border-line bg-surface-2 px-3 py-1.5 text-[13px]">
                  <Check className="size-3.5 shrink-0 text-good" />
                  <span className="min-w-0 flex-1">{criterion}</span>
                  <button
                    type="button"
                    onClick={() => setCriteria((list) => list.filter((_, at) => at !== index))}
                    aria-label={`Remove criterion: ${criterion}`}
                    className="grid size-6 shrink-0 place-items-center rounded text-muted hover:bg-surface-3 hover:text-text"
                  >
                    <X className="size-3.5" />
                  </button>
                </li>
              ))}
            </ul>
            <form
              className="mt-2 flex gap-2"
              onSubmit={(event) => {
                event.preventDefault();
                const value = newCriterion.trim();
                if (value && !criteria.includes(value)) setCriteria((list) => [...list, value]);
                setNewCriterion("");
              }}
            >
              <input aria-label="New success criterion" value={newCriterion} maxLength={140} placeholder="e.g. Response contains a budget table" onChange={(event) => setNewCriterion(event.target.value)} className={`${INPUT} py-2 text-[13px]`} />
              <button type="submit" disabled={!newCriterion.trim()} className={`${btn("secondary", "sm")} shrink-0`}>
                <Plus className="size-4" />
                Add
              </button>
            </form>
          </fieldset>
        </div>

        <div className="min-w-0" aria-live="polite">
          {running && (
            <p className="flex items-center justify-center gap-2 rounded-xl border border-dashed border-line py-20 text-[14px] text-muted">
              <Loader2 className="size-5 animate-spin text-good" />
              Running on {MODELS_CATALOG.find(({ id }) => id === model).name}…
            </p>
          )}
          {!running && !result && !regressionRuns && (
            <div className="rounded-xl border border-dashed border-line px-6 py-16 text-center text-[13px] text-muted">
              <p className="text-[14px] font-medium text-text">No run yet</p>
              <p className="mt-1">Choose Run Prompt to see the response, token use, time, cost and evaluation.</p>
              <p className="mt-3 text-[12px] text-faint">Runs are simulated until model providers are connected.</p>
            </div>
          )}
          {!running && result && (
            <div className="space-y-4">
              <div className={`rounded-xl border p-4 ${failed.length ? "border-amber/40 bg-amber/5" : "border-good/35 bg-good/5"}`}>
                <p className="text-[12px] font-semibold uppercase tracking-wider text-muted">Test result</p>
                <p className="mt-0.5 text-[20px] font-semibold">
                  {result.passed} / {result.total} criteria passed
                </p>
                <p className="text-[13px] text-muted">
                  Tested Performance <span className="font-semibold text-text">{result.score}/100</span> · {tested ? tested.label : "Draft"} on {result.model}
                </p>
              </div>
              {previous && (
                <div className="rounded-xl border border-bad/40 bg-bad/5 p-4 text-[13px]">
                  <p className="flex items-center gap-2 font-semibold">
                    <TriangleAlert className="size-4 text-bad" />
                    Potential regression
                  </p>
                  <p className="mt-1 text-muted">
                    {tested ? tested.label : "The draft"} passed {result.passed}/{result.total}, but {previous.label} passed {previous.test.passed}/{previous.test.total} with the same criteria. Review the changes before replacing {previous.label}.
                  </p>
                </div>
              )}
              <ul className="space-y-1.5">
                {result.results.map((item) => (
                  <li key={item.criterion} className="rounded-lg border border-line bg-surface-2 px-3 py-2 text-[13px]">
                    <p className="flex items-start gap-2">
                      {item.passed ? <Check className="mt-0.5 size-4 shrink-0 text-good" /> : <X className="mt-0.5 size-4 shrink-0 text-bad" />}
                      <span>
                        <span className="sr-only">{item.passed ? "Passed: " : "Failed: "}</span>
                        {item.criterion}
                      </span>
                    </p>
                    {!item.passed && (
                      <div className="mt-1.5 pl-6 text-[12px] text-muted">
                        <p>
                          <span className="font-semibold text-bad">FAILED:</span> {item.why}
                        </p>
                        <p className="mt-0.5">Suggestion: {item.suggestion}</p>
                        <button
                          type="button"
                          disabled={fixed.includes(item.criterion)}
                          onClick={() => {
                            onApplyFix(item.fix);
                            setFixed((list) => [...list, item.criterion]);
                          }}
                          className={`${btn("secondary", "sm")} mt-1.5`}
                        >
                          {fixed.includes(item.criterion) ? "Added to draft" : "Add this requirement"}
                        </button>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
              <dl className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                <Stat label="Input tokens" value={result.inputTokens.toLocaleString("en-US")} />
                <Stat label="Output tokens" value={result.outputTokens.toLocaleString("en-US")} />
                <Stat label="Execution time" value={`${result.latency}s`} />
                <Stat label="Estimated cost" value={formatCost(result.cost)} />
              </dl>
              <details className="rounded-xl border border-line">
                <summary className="cursor-pointer px-4 py-2.5 text-[13px] font-semibold">AI response (simulated)</summary>
                <pre className="max-h-64 overflow-auto whitespace-pre-wrap border-t border-line px-4 py-3 text-[12px] leading-5 text-muted">{result.response}</pre>
              </details>
              <details className="rounded-xl border border-line">
                <summary className="cursor-pointer px-4 py-2.5 text-[13px] font-semibold">Prompt and input sent</summary>
                <pre className="max-h-64 overflow-auto whitespace-pre-wrap border-t border-line px-4 py-3 text-[12px] leading-5 text-muted">
                  {promptToText(sectionsFor(result.versionId))}
                  {input ? `\n\nINPUT\n${input}` : ""}
                </pre>
              </details>
              <p className="text-[11px] leading-4 text-faint">{PRICING_NOTE}</p>
            </div>
          )}
          {!running && regressionRuns && (
            <div>
              <h3 className="text-[14px] font-semibold">Regression check</h3>
              <table className="mt-2 w-full text-[13px]">
                <thead>
                  <tr className="text-left text-[12px] text-muted">
                    <th scope="col" className="py-1.5 font-medium">Version</th>
                    <th scope="col" className="py-1.5 font-medium">Result</th>
                    <th scope="col" className="py-1.5 text-right font-medium">Score</th>
                  </tr>
                </thead>
                <tbody>
                  {regressionRuns.map((row, index) => {
                    const dropped = index > 0 && row.passed < regressionRuns[index - 1].passed;
                    return (
                      <tr key={row.version.id} className="border-t border-line-soft">
                        <td className="py-2">{row.version.label}</td>
                        <td className="py-2">
                          {row.passed} / {row.total} tests passed
                          {dropped && (
                            <span className="ml-2 inline-flex items-center gap-1 text-[12px] font-medium text-bad">
                              <CircleAlert className="size-3.5" />
                              Regression
                            </span>
                          )}
                        </td>
                        <td className="py-2 text-right font-medium">{row.score}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </Dialog>
  );
}
