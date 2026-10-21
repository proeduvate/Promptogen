import { useState } from "react";
import { CircleAlert, FileInput, ShieldAlert } from "lucide-react";
import Dialog from "../Dialog";
import SectionBody, { SectionLabel } from "../prompt/SectionBody";
import { detectContradictions, detectDomain, domainLabel, scanSecurity } from "../../lib/analysis";
import { parsePrompt } from "../../lib/library";
import { titleFrom } from "../../lib/promptBuilder";
import { analyzeQuality, IMPACT } from "../../lib/quality";
import { ratingFor } from "../../lib/score";
import { btn } from "../../lib/ui";

/* Prompt Import (spec §31): paste a prompt from any AI tool, see its
   quality, conflicts, suggestions, missing information and a suggested
   structure, then open it in the workspace or save it to My Prompts. */
export default function ImportDialog({ onClose, onOpen, onSave }) {
  const [raw, setRaw] = useState("");
  const [title, setTitle] = useState("");
  const [result, setResult] = useState(null);

  const analyze = () => {
    // Hand-off point: the import / analysis service.
    const sections = parsePrompt(raw);
    const domain = detectDomain(raw);
    const objective = sections.find((section) => section.id === "objective")?.content ?? raw;
    setResult({
      sections,
      domain,
      title: title.trim() || titleFrom(objective),
      quality: analyzeQuality(sections, domain),
      conflicts: detectContradictions(raw),
      findings: scanSecurity(raw),
    });
  };

  const prompt = result && { title: result.title, domain: result.domain, sections: result.sections };
  const missing = result ? result.quality.dimensions.filter((dimension) => ["context", "structure", "output"].includes(dimension.id)).flatMap((dimension) => dimension.missing) : [];

  const footer = result ? (
    <>
      <button type="button" onClick={() => setResult(null)} className={`${btn()} mr-auto`}>
        Back
      </button>
      <button type="button" onClick={() => onSave(prompt)} className={btn("secondary")}>
        Save to My Prompts
      </button>
      <button type="button" onClick={() => onOpen(prompt)} className={btn("primary")}>
        Open in workspace
      </button>
    </>
  ) : (
    <>
      <button type="button" onClick={onClose} className={`${btn()} mr-auto`}>
        Cancel
      </button>
      <button type="button" onClick={analyze} disabled={raw.trim().length < 10} className={btn("primary")}>
        Analyze prompt
      </button>
    </>
  );

  return (
    <Dialog open onClose={onClose} title="Import a Prompt" description="Paste a prompt from any AI tool. Promptogen analyzes it before you save it." icon={FileInput} tone="cyan" size="xl" footer={footer}>
      {!result ? (
        <div className="space-y-3">
          <label className="block text-[13px] font-medium">
            Prompt
            <textarea
              data-autofocus
              rows={10}
              value={raw}
              maxLength={8000}
              placeholder={"Paste your prompt here. Headings such as Role:, Task: or ## Context are recognised."}
              onChange={(event) => setRaw(event.target.value)}
              className="mt-1.5 w-full resize-y rounded-lg border border-line bg-surface-2 px-3.5 py-3 font-mono text-[13px] leading-6 outline-none focus:border-brand/60"
            />
          </label>
          <label className="block text-[13px] font-medium">
            Name <span className="font-normal text-faint">(optional)</span>
            <input value={title} maxLength={80} onChange={(event) => setTitle(event.target.value)} className="mt-1.5 w-full rounded-lg border border-line bg-surface-2 px-3.5 py-2.5 text-[14px] outline-none focus:border-brand/60" />
          </label>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="min-w-0">
            <h3 className="text-[14px] font-semibold">Suggested structure</h3>
            <div className="mt-2 space-y-3 rounded-xl border border-line bg-surface-2 p-4">
              {result.sections.map((section) => (
                <div key={section.id}>
                  <SectionLabel section={section} compact />
                  <div className="mt-1">
                    <SectionBody section={section} compact />
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="space-y-4 text-[13px]">
            <div className="rounded-xl border border-line bg-surface-2 p-4">
              <p className="text-[12px] text-muted">Quality score · {domainLabel(result.domain)}</p>
              <p className="mt-0.5 text-[24px] font-semibold">
                {result.quality.overall}
                <span className="text-[13px] font-normal text-muted">/100 </span>
                <span className={`text-[14px] ${ratingFor(result.quality.overall).tone}`}>{ratingFor(result.quality.overall).label}</span>
              </p>
            </div>
            {result.findings.map((finding) => (
              <p key={finding.kind + finding.title} className="flex gap-2 rounded-lg border border-bad/40 bg-bad/5 p-3">
                <ShieldAlert className="mt-0.5 size-4 shrink-0 text-bad" />
                <span>
                  <span className="font-medium">{finding.title}.</span> <span className="text-muted">{finding.body}</span>
                </span>
              </p>
            ))}
            <div>
              <h3 className="font-semibold">Potential conflicts</h3>
              {result.conflicts.length ? (
                <ul className="mt-1 space-y-1.5 text-muted">
                  {result.conflicts.map(({ first, second, note }) => (
                    <li key={first + second} className="flex gap-2">
                      <CircleAlert className="mt-0.5 size-4 shrink-0 text-amber" />
                      <span>
                        “{first}” vs “{second}”. {note}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-1 text-muted">None found.</p>
              )}
            </div>
            <div>
              <h3 className="font-semibold">Missing information</h3>
              {missing.length ? (
                <ul className="mt-1 list-inside list-disc text-muted">
                  {missing.slice(0, 6).map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              ) : (
                <p className="mt-1 text-muted">Nothing essential is missing.</p>
              )}
            </div>
            <div>
              <h3 className="font-semibold">Optimization suggestions</h3>
              <ul className="mt-1 space-y-1.5">
                {result.quality.suggestions.slice(0, 4).map((suggestion) => (
                  <li key={suggestion.id} className="flex items-start gap-2">
                    <span className={`mt-0.5 shrink-0 rounded-full px-1.5 py-px text-[10px] font-semibold uppercase ring-1 ${IMPACT[suggestion.impact].pill}`}>{IMPACT[suggestion.impact].label}</span>
                    <span className="text-muted">{suggestion.text}</span>
                  </li>
                ))}
                {result.quality.suggestions.length === 0 && <li className="text-muted">No suggestions.</li>}
              </ul>
            </div>
          </div>
        </div>
      )}
    </Dialog>
  );
}
