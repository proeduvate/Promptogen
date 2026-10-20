import { useEffect, useState } from "react";
import { ArrowLeft, ArrowRight, Check, Loader2, Wand2, X } from "lucide-react";
import Dialog from "../Dialog";
import { DIFF_STYLE } from "../prompt/SectionBody";
import { applyChanges, changeText, modeById, modelName, OPTIMIZER_MODES, proposeChanges } from "../../lib/optimizer";
import { wordDiff } from "../../lib/diff";
import { analyzeQuality } from "../../lib/quality";
import { estimateTokens } from "../../lib/analysis";
import { promptToText } from "../../lib/promptText";
import { wait } from "../../lib/simulate";
import { btn } from "../../lib/ui";

const KIND = {
  added: { ...DIFF_STYLE.added, pill: "bg-good/10 text-good ring-good/25" },
  removed: { ...DIFF_STYLE.removed, pill: "bg-bad/10 text-bad ring-bad/25" },
  modified: { ...DIFF_STYLE.modified, pill: "bg-warn/10 text-warn ring-warn/25" },
  moved: { ...DIFF_STYLE.modified, label: "Reordered", pill: "bg-warn/10 text-warn ring-warn/25" },
};

function Line({ sign, tokens, tone }) {
  return (
    <p className={`flex gap-2 px-3 py-1.5 ${tone === "bad" ? "bg-bad/10" : "bg-good/10"}`}>
      <span aria-hidden className={`select-none font-semibold ${tone === "bad" ? "text-bad" : "text-good"}`}>
        {sign}
      </span>
      <span className="sr-only">{tone === "bad" ? "Before:" : "After:"}</span>
      <span className="min-w-0 whitespace-pre-wrap break-words">
        {tokens.map((token, index) =>
          token.changed ? (
            <mark key={index} className={`rounded-sm px-0.5 text-text ${tone === "bad" ? "bg-bad/25 line-through decoration-bad/60" : "bg-good/25"}`}>
              {token.text}
            </mark>
          ) : (
            <span key={index}>{token.text}</span>
          ),
        )}
      </span>
    </p>
  );
}

function ChangeCard({ change, sections, decision, onDecide }) {
  const { label, before, after } = changeText(change, sections);
  const kind = KIND[change.section ? "added" : change.kind];
  const tokens = change.kind === "modified" || change.kind === "moved" ? wordDiff(before, after) : null;
  return (
    <li
      className={[
        "rounded-xl border p-4 transition-colors",
        decision === "accepted" ? "border-good/45 bg-good/5" : decision === "rejected" ? "border-line opacity-60" : "border-line bg-surface-2",
      ].join(" ")}
    >
      <div className="flex flex-wrap items-center gap-2 text-[12px]">
        <span className={`rounded-full px-2 py-0.5 font-semibold ring-1 ${kind.pill}`}>{kind.label}</span>
        <span className="font-semibold tracking-wide text-muted">{label}</span>
        {decision && <span className="ml-auto text-[12px] font-medium text-muted">{decision === "accepted" ? "Accepted" : "Rejected"}</span>}
      </div>
      <div className="mt-2.5 overflow-hidden rounded-lg border border-line font-mono text-[12.5px] leading-5">
        {before && <Line sign="−" tone="bad" tokens={tokens?.before ?? [{ text: before, changed: true }]} />}
        {after && <Line sign="+" tone="good" tokens={tokens?.after ?? [{ text: after, changed: true }]} />}
      </div>
      <p className="mt-2.5 text-[12px] leading-5 text-muted">
        <span className="font-medium text-text">Why this change?</span> {change.reason}
      </p>
      <div className="mt-3 flex gap-2">
        <button type="button" aria-pressed={decision === "accepted"} onClick={() => onDecide(decision === "accepted" ? null : "accepted")} className={btn(decision === "accepted" ? "brandSoft" : "secondary", "sm")}>
          <Check className="size-3.5" />
          Accept
        </button>
        <button type="button" aria-pressed={decision === "rejected"} onClick={() => onDecide(decision === "rejected" ? null : "rejected")} className={btn(decision === "rejected" ? "pinkSoft" : "ghost", "sm")}>
          <X className="size-3.5" />
          Reject
        </button>
      </div>
    </li>
  );
}

/* AI Prompt Optimizer (spec §8–9): pick a goal, review each proposed change
   with its reason, accept or reject it, then apply. Applying is undoable. */
export default function OptimizerDialog({ initialMode = null, sections, domain, modelId, onClose, onApply }) {
  const [mode, setMode] = useState(initialMode);
  const [changes, setChanges] = useState(null);
  const [decisions, setDecisions] = useState({});
  const [loading, setLoading] = useState(Boolean(initialMode));

  const run = async (modeId) => {
    setMode(modeId);
    setLoading(true);
    setChanges(null);
    setDecisions({});
    // Hand-off point: the optimization service call replaces this short wait.
    await wait(450);
    setChanges(proposeChanges(modeId, sections, { domain, modelId }));
    setLoading(false);
  };

  useEffect(() => {
    if (initialMode) run(initialMode);
    // Runs once, for a goal chosen before opening (e.g. "Optimize Tokens").
  }, []);

  const accepted = changes?.filter((change) => decisions[change.id] === "accepted") ?? [];
  const pending = changes?.filter((change) => !decisions[change.id]) ?? [];
  const previewOf = () => {
    const next = applyChanges(sections, accepted.length ? accepted : changes);
    return {
      before: { quality: analyzeQuality(sections, domain).overall, tokens: estimateTokens(promptToText(sections)) },
      after: { quality: analyzeQuality(next, domain).overall, tokens: estimateTokens(promptToText(next)) },
      all: !accepted.length,
    };
  };
  const preview = changes?.length ? previewOf() : null;

  const current = modeById(mode);
  const apply = () => onApply(applyChanges(sections, accepted), `Optimized: ${current.label}`, accepted.length);

  const footer = changes ? (
    <>
      <button type="button" onClick={() => setChanges(null)} className={`${btn()} mr-auto`}>
        <ArrowLeft className="size-4" />
        Other goals
      </button>
      {changes.length > 0 && (
        <>
          <button
            type="button"
            disabled={pending.length === 0}
            onClick={() => setDecisions(Object.fromEntries(changes.map((change) => [change.id, decisions[change.id] ?? "accepted"])))}
            className={btn("secondary")}
          >
            Accept All
          </button>
          <button type="button" disabled={accepted.length === 0} onClick={apply} className={btn("primary")}>
            Apply {accepted.length || ""} accepted
            <ArrowRight className="size-4" />
          </button>
        </>
      )}
    </>
  ) : (
    <button type="button" onClick={onClose} className={btn()}>
      Cancel
    </button>
  );

  return (
    <Dialog
      open
      onClose={onClose}
      title={changes ? current.label : "Optimize Prompt"}
      description={changes ? "Review each change. Nothing is applied until you accept it." : "Choose what to improve. You'll see every change and why before anything is applied."}
      icon={Wand2}
      tone="purple"
      size="xl"
      footer={footer}
    >
      {loading && (
        <p className="flex items-center justify-center gap-2 py-16 text-[14px] text-muted" role="status">
          <Loader2 className="size-5 animate-spin text-purple" />
          Analysing your prompt for “{current?.label}”…
        </p>
      )}

      {!loading && !changes && (
        <ul className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
          {OPTIMIZER_MODES.map(({ id, label, hint, icon: Icon }) => (
            <li key={id}>
              <button
                type="button"
                data-autofocus={id === OPTIMIZER_MODES[0].id ? true : undefined}
                onClick={() => run(id)}
                className="flex h-full w-full items-start gap-3 rounded-xl border border-line bg-surface-2 p-3.5 text-left transition-colors hover:border-purple/45 hover:bg-surface-3"
              >
                <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-purple/10 ring-1 ring-purple/20">
                  <Icon className="size-[18px] text-purple" strokeWidth={1.75} />
                </span>
                <span className="min-w-0">
                  <span className="block text-[14px] font-medium">{id === "model" ? `Optimize for ${modelName(modelId)}` : label}</span>
                  <span className="mt-0.5 block text-[12px] leading-4 text-muted">{hint}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {!loading && changes?.length === 0 && (
        <div className="py-12 text-center">
          <p className="text-[15px] font-medium">Nothing to change for “{current.label}”.</p>
          <p className="mt-1 text-[13px] text-muted">Your prompt already does this well. Try another goal.</p>
        </div>
      )}

      {!loading && changes?.length > 0 && (
        <div>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 rounded-xl border border-line bg-surface-2 px-4 py-3 text-[13px]">
            <span>
              <span className="font-semibold">{changes.length}</span> proposed change{changes.length === 1 ? "" : "s"}
            </span>
            <span className="text-muted">
              Quality {preview.before.quality} → <span className="font-medium text-text">{preview.after.quality}</span>
            </span>
            <span className="text-muted">
              Tokens {preview.before.tokens} → <span className="font-medium text-text">{preview.after.tokens}</span>
            </span>
            <span className="text-[12px] text-faint">{preview.all ? "If you accept all" : "With the accepted changes"}</span>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-4 text-[12px] text-muted" aria-label="Legend">
            {["added", "removed", "modified"].map((kind) => (
              <span key={kind} className="flex items-center gap-1.5">
                <span className={`size-2 rounded-full ${KIND[kind].dot}`} />
                {KIND[kind].label}
              </span>
            ))}
          </div>
          <ul className="mt-3 space-y-3">
            {changes.map((change) => (
              <ChangeCard
                key={change.id}
                change={change}
                sections={sections}
                decision={decisions[change.id]}
                onDecide={(decision) => setDecisions((current) => ({ ...current, [change.id]: decision }))}
              />
            ))}
          </ul>
        </div>
      )}
    </Dialog>
  );
}
