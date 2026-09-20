import { useState } from "react";
import { ArrowDown, ArrowLeft, ArrowUp, Check, ChevronDown, History, Minus } from "lucide-react";
import Menu from "../Menu";
import SectionBody, { DIFF_STYLE, SectionLabel } from "../prompt/SectionBody";
import { diffVersions } from "../../lib/diff";
import { ratingFor } from "../../lib/score";
import { btn } from "../../lib/ui";

const METRICS = [
  { id: "score", label: "Strength Score", format: (value) => `${value} (${ratingFor(value).label})` },
  { id: "words", label: "Words", format: (value) => value.toLocaleString("en-US") },
  { id: "clarity", label: "Clarity" },
  { id: "specificity", label: "Specificity" },
  { id: "actionability", label: "Actionability" },
];

function ChangeIcon({ left, right }) {
  const delta = left == null ? 0 : left - (right ?? 0);
  if (delta > 0) return <ArrowUp aria-label="Increased" className="mx-auto size-4 text-good" strokeWidth={2.5} />;
  if (delta < 0) return <ArrowDown aria-label="Decreased" className="mx-auto size-4 text-bad" strokeWidth={2.5} />;
  return <Minus aria-label="No change" className="mx-auto size-4 text-faint" />;
}

function VersionSelect({ label, versions, value, onChange, nameFor }) {
  return (
    <span className="relative inline-block">
      <select
        aria-label={label}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="appearance-none rounded-lg border border-line bg-surface-2 py-1.5 pl-3 pr-8 text-[13px] font-medium text-text outline-none focus:border-brand/60"
      >
        {versions.map((version) => (
          <option key={version.id} value={version.id}>
            {nameFor(version)}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted" />
    </span>
  );
}

export default function VersionCompare({ prompt, onBack, onUseVersion }) {
  const versions = prompt.versions ?? [];
  const [leftId, setLeftId] = useState(versions[0]?.id);
  const [rightId, setRightId] = useState(versions[1]?.id);

  if (versions.length < 2) {
    return (
      <p className="rounded-xl border border-dashed border-line px-4 py-10 text-center text-[13px] leading-6 text-muted">
        This prompt has only one version.
        <br />
        Create a new version to compare changes side by side.
      </p>
    );
  }

  const left = versions.find(({ id }) => id === leftId);
  const right = versions.find(({ id }) => id === rightId);
  // versions are stored newest first
  const diff = diffVersions(left, right, versions.indexOf(left) <= versions.indexOf(right));
  const nameFor = (version) =>
    `${version.id}${version.id === prompt.currentVersion ? " (Current)" : ""}`;

  const useItems = [left, right]
    .filter((version, index, list) => list.findIndex(({ id }) => id === version.id) === index)
    .map((version) => {
      const isCurrent = version.id === prompt.currentVersion;
      return {
        id: version.id,
        label: `Use ${nameFor(version)}`,
        icon: isCurrent ? Check : History,
        tone: isCurrent ? "text-good" : "text-muted",
        onSelect: () => onUseVersion(prompt.id, version.id),
      };
    });

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2 text-[13px]">
        <span className="text-muted">Compare versions:</span>
        <VersionSelect label="First version" versions={versions} value={leftId} onChange={setLeftId} nameFor={nameFor} />
        <span className="text-faint">vs</span>
        <VersionSelect label="Second version" versions={versions} value={rightId} onChange={setRightId} nameFor={nameFor} />
      </div>

      <div className="mt-4 overflow-x-auto rounded-xl border border-line">
        <table className="w-full text-[13px]">
          <thead>
            <tr className="bg-surface-2 text-[12px] text-muted">
              <th scope="col" className="px-3 py-2 text-left font-medium">Metric</th>
              <th scope="col" className="whitespace-nowrap px-3 py-2 text-right font-medium">{nameFor(left)}</th>
              <th scope="col" className="whitespace-nowrap px-3 py-2 text-right font-medium">{nameFor(right)}</th>
              <th scope="col" className="w-16 px-3 py-2 text-center font-medium">Change</th>
            </tr>
          </thead>
          <tbody>
            {METRICS.map(({ id, label, format }) => {
              const show = (value) => (value == null ? "—" : format ? format(value) : value);
              return (
                <tr key={id} className="border-t border-line-soft">
                  <td className="px-3 py-2 text-muted">{label}</td>
                  <td className="whitespace-nowrap px-3 py-2 text-right font-medium">{show(left.metrics[id])}</td>
                  <td className="whitespace-nowrap px-3 py-2 text-right text-muted">{show(right.metrics[id])}</td>
                  <td className="px-3 py-2">
                    <ChangeIcon left={left.metrics[id]} right={right.metrics[id]} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-4 text-[12px] text-muted">
        {Object.entries(DIFF_STYLE).map(([status, { label, dot }]) => (
          <span key={status} className="flex items-center gap-1.5">
            <span className={`size-2 rounded-full ${dot}`} />
            {label}
          </span>
        ))}
      </div>

      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {[
          { version: left, marks: diff.left },
          { version: right, marks: diff.right },
        ].map(({ version, marks }, index) => (
          <article key={index} className="min-w-0 rounded-xl border border-line bg-surface-2 p-3.5">
            <header className="border-b border-line pb-2.5">
              <div className="text-[13px] font-semibold">{nameFor(version)}</div>
              <div className="mt-0.5 text-[11px] text-faint">{version.date}</div>
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

      <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
        <button type="button" onClick={onBack} className={btn("secondary", "sm")}>
          <ArrowLeft className="size-4" />
          Back to Prompt
        </button>
        <Menu
          items={useItems}
          placement="top"
          renderTrigger={({ open, toggle }) => (
            <button
              type="button"
              onClick={toggle}
              aria-haspopup="menu"
              aria-expanded={open}
              className={btn("primary", "sm")}
            >
              Use This Version
              <ChevronDown className={`size-4 transition-transform ${open ? "rotate-180" : ""}`} />
            </button>
          )}
        />
      </div>
    </div>
  );
}
