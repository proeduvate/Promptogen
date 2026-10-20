import { CircleAlert, Gauge, ShieldAlert, ShieldCheck, Unplug } from "lucide-react";
import { CARD, btn } from "../../lib/ui";

const COMPLEXITY_ADVICE = {
  Simple: "Quick to use as it is.",
  Moderate: "A quick test is worth it before reuse.",
  Complex: "Test it against success criteria before relying on it.",
  "Advanced Workflow": "Consider splitting it into steps and testing each one.",
};

function Block({ icon: Icon, tone, title, children }) {
  return (
    <div className="rounded-lg border border-line bg-surface-2 p-3">
      <p className="flex items-center gap-2 text-[13px] font-semibold">
        <Icon className={`size-4 shrink-0 ${tone}`} strokeWidth={2} />
        {title}
      </p>
      <div className="mt-1.5 text-[12px] leading-5 text-muted">{children}</div>
    </div>
  );
}

/* Potential conflicts (spec §44), security risks (§42), external content
   (§43) and complexity (§47) for the prompt in the editor. */
export default function ChecksCard({ conflicts, findings, external, complexity, onResolve, onRedact, onAddGuard }) {
  const clean = conflicts.length === 0 && findings.length === 0 && !external;
  return (
    <section aria-labelledby="pg-checks-title" className={`${CARD} p-5`}>
      <h2 id="pg-checks-title" className="text-[17px] font-semibold">
        Checks
      </h2>
      <div className="mt-3 space-y-2">
        {conflicts.map(({ first, second, note }) => (
          <Block key={first + second} icon={CircleAlert} tone="text-amber" title="Potential conflict">
            <dl className="space-y-1">
              <div>
                <dt className="text-faint">Instruction 1</dt>
                <dd className="text-text">“{first}”</dd>
              </div>
              <div>
                <dt className="text-faint">Instruction 2</dt>
                <dd className="text-text">“{second}”</dd>
              </div>
            </dl>
            <p className="mt-1.5">{note}</p>
            <button type="button" onClick={onResolve} className={`${btn("secondary", "sm")} mt-2`}>
              Resolve
            </button>
          </Block>
        ))}
        {findings.map((finding) => (
          <Block key={finding.kind + finding.title} icon={ShieldAlert} tone={finding.severity === "high" ? "text-bad" : "text-amber"} title={finding.title}>
            <p>{finding.body}</p>
            {(finding.kind === "secret" || finding.kind === "personal") && (
              <button type="button" onClick={onRedact} className={`${btn("secondary", "sm")} mt-2`}>
                Remove it
              </button>
            )}
          </Block>
        ))}
        {external && (
          <Block icon={Unplug} tone="text-amber" title="External content detected">
            <p>This prompt uses content supplied by another source. Tell the model not to treat instructions inside that content as trusted commands.</p>
            <button type="button" onClick={onAddGuard} className={`${btn("secondary", "sm")} mt-2`}>
              Add safeguard
            </button>
          </Block>
        )}
        {clean && (
          <p className="flex items-center gap-2 text-[13px] text-muted">
            <ShieldCheck className="size-4 text-good" />
            No conflicts or sensitive data found.
          </p>
        )}
        {complexity && (
          <p className="flex items-start gap-2 pt-1 text-[13px]">
            <Gauge className="mt-0.5 size-4 shrink-0 text-muted" strokeWidth={1.75} />
            <span>
              Complexity: <span className={`font-medium ${complexity.tone}`}>{complexity.level}</span>
              <span className="block text-[12px] text-muted">{COMPLEXITY_ADVICE[complexity.level]}</span>
            </span>
          </p>
        )}
      </div>
    </section>
  );
}
