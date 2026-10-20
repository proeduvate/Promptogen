import { useState } from "react";
import { ArrowDown, ArrowUp, GitCompare, Minus } from "lucide-react";
import Dialog from "../Dialog";
import SelectInput from "../SelectInput";
import SectionBody, { DIFF_STYLE, SectionLabel } from "../prompt/SectionBody";
import { diffVersions } from "../../lib/diff";
import { btn } from "../../lib/ui";

function Change({ a, b }) {
  if (a > b) return <ArrowUp aria-label="Higher" className="mx-auto size-4 text-good" strokeWidth={2.5} />;
  if (a < b) return <ArrowDown aria-label="Lower" className="mx-auto size-4 text-bad" strokeWidth={2.5} />;
  return <Minus aria-label="Same" className="mx-auto size-4 text-faint" />;
}

/* Compare any two versions (spec §12): metrics first, then the prompt
   changes marked Added / Removed / Modified / Unchanged. */
export default function CompareDialog({ versions, initialA, initialB, analyze, onClose, onUse, onCreateFrom }) {
  const [aId, setAId] = useState(initialA);
  const [bId, setBId] = useState(initialB);
  const a = versions.find((version) => version.id === aId);
  const b = versions.find((version) => version.id === bId);
  const qa = analyze(a.sections);
  const qb = analyze(b.sections);
  const diff = diffVersions(a, b, a.number >= b.number);
  const options = versions.map((version) => ({ value: version.id, label: `${version.label} · ${version.name}` })).reverse();
  const metrics = [
    { label: "Strength", a: qa.overall, b: qb.overall },
    ...qa.dimensions.map((dimension, index) => ({ label: dimension.label, a: dimension.score, b: qb.dimensions[index].score })),
    ...(a.test || b.test ? [{ label: "Tests passed", a: a.test ? a.test.passed / a.test.total : null, b: b.test ? b.test.passed / b.test.total : null, show: (version) => (version.test ? `${version.test.passed}/${version.test.total}` : "—") }] : []),
  ];

  const footer = (
    <>
      <button type="button" onClick={onClose} className={`${btn()} mr-auto`}>
        Close
      </button>
      <button type="button" onClick={() => onUse(a.id)} className={btn("secondary")}>
        Use {a.label}
      </button>
      {a.id !== b.id && (
        <>
          <button type="button" onClick={() => onUse(b.id)} className={btn("secondary")}>
            Restore {b.label}
          </button>
          <button type="button" onClick={() => onCreateFrom(b.id)} className={btn("primary")}>
            Create New Version From {b.label}
          </button>
        </>
      )}
    </>
  );

  return (
    <Dialog open onClose={onClose} title="Compare Versions" description="See how two versions differ before choosing one." icon={GitCompare} tone="amber" size="xl" footer={footer}>
      <div className="flex flex-wrap items-center gap-2 text-[13px]">
        <SelectInput aria-label="First version" value={aId} onChange={setAId} options={options} className="min-w-[200px] flex-1" />
        <span className="text-faint">vs</span>
        <SelectInput aria-label="Second version" value={bId} onChange={setBId} options={options} className="min-w-[200px] flex-1" />
      </div>

      <div className="mt-4 overflow-x-auto rounded-xl border border-line">
        <table className="w-full min-w-[420px] text-[13px]">
          <thead>
            <tr className="bg-surface-2 text-[12px] text-muted">
              <th scope="col" className="px-3 py-2 text-left font-medium">Metric</th>
              <th scope="col" className="px-3 py-2 text-right font-medium">{a.label}</th>
              <th scope="col" className="px-3 py-2 text-right font-medium">{b.label}</th>
              <th scope="col" className="w-16 px-3 py-2 text-center font-medium">Change</th>
            </tr>
          </thead>
          <tbody>
            {metrics.map((metric) => (
              <tr key={metric.label} className="border-t border-line-soft">
                <th scope="row" className="px-3 py-2 text-left font-normal text-muted">{metric.label}</th>
                <td className="px-3 py-2 text-right font-medium">{metric.show ? metric.show(a) : metric.a}</td>
                <td className="px-3 py-2 text-right text-muted">{metric.show ? metric.show(b) : metric.b}</td>
                <td className="px-3 py-2">{metric.a == null || metric.b == null ? <span className="block text-center text-faint">—</span> : <Change a={metric.a} b={metric.b} />}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-4 text-[12px] text-muted" aria-label="Legend">
        {Object.entries(DIFF_STYLE).map(([status, { label, dot }]) => (
          <span key={status} className="flex items-center gap-1.5">
            <span className={`size-2 rounded-full ${dot}`} />
            {label}
          </span>
        ))}
        <span className="flex items-center gap-1.5">
          <span className="size-2 rounded-full border border-line" />
          Unchanged
        </span>
      </div>

      <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
        {[
          { version: a, marks: diff.left },
          { version: b, marks: diff.right },
        ].map(({ version, marks }, index) => (
          <article key={index} className="min-w-0 rounded-xl border border-line bg-surface-2 p-3.5">
            <header className="border-b border-line pb-2.5">
              <h3 className="text-[13px] font-semibold">
                {version.label} · {version.name}
              </h3>
            </header>
            <div className="mt-3 space-y-3">
              {version.sections.map((section) => (
                <div key={section.id}>
                  <SectionLabel section={section} compact />
                  <div className="mt-1">
                    <SectionBody section={section} diff={marks[section.id]} compact />
                  </div>
                </div>
              ))}
            </div>
          </article>
        ))}
      </div>
    </Dialog>
  );
}
