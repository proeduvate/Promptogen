import { SECTION_STYLE } from "../../data/generated";

/* Line highlight colours for the version compare view. */
export const DIFF_STYLE = {
  added: { label: "Added", dot: "bg-good", line: "border-good bg-good/10" },
  removed: { label: "Removed", dot: "bg-bad", line: "border-bad bg-bad/10" },
  modified: { label: "Modified", dot: "bg-warn", line: "border-warn bg-warn/10" },
};

const mark = (status) =>
  status ? `-mx-2 rounded-r-md border-l-2 px-2 py-0.5 ${DIFF_STYLE[status].line}` : "";

/* Light Markdown in section text: **bold**, *italic* and `code`. */
function Inline({ text }) {
  const parts = String(text).split(/(\*\*[^*]+\*\*|`[^`]+`|\*[^*\s][^*]*\*)/g);
  return parts.map((part, index) => {
    if (/^\*\*[^*]+\*\*$/.test(part)) return <strong key={index}>{part.slice(2, -2)}</strong>;
    if (/^`[^`]+`$/.test(part)) return <code key={index} className="rounded bg-surface-3 px-1 py-0.5 text-[0.92em]">{part.slice(1, -1)}</code>;
    if (/^\*[^*\s][^*]*\*$/.test(part)) return <em key={index}>{part.slice(1, -1)}</em>;
    return part;
  });
}

export function SectionLabel({ section, compact = false }) {
  const { icon: Icon, tone } = SECTION_STYLE[section.id] ?? SECTION_STYLE[section.id.split("-")[0]] ?? { tone: "text-muted" };
  return (
    <div
      className={[
        "flex items-center font-semibold tracking-wider",
        compact ? "gap-1.5 text-[11px]" : "gap-2 text-[12px]",
        tone,
      ].join(" ")}
    >
      {Icon && <Icon className={compact ? "size-3.5" : "size-4"} strokeWidth={2} />}
      {section.label}
    </div>
  );
}

/* Renders one prompt section's body. `diff` (optional) marks lines as
   added / removed / modified. */
export default function SectionBody({ section, diff = {}, compact = false }) {
  const text = compact ? "text-[12px] leading-5" : "text-[14px] leading-7";

  if (section.type === "text") {
    return (
      <p className={`${text} whitespace-pre-line ${mark(diff.whole ?? diff.content)}`}>
        <Inline text={section.content} />
      </p>
    );
  }

  const List = section.type === "numbered" ? "ol" : "ul";
  return (
    <List className={`${text} ${compact ? "space-y-0.5" : "space-y-1"}`}>
      {section.items.map((item, index) => (
        <li key={index} className={`flex gap-2 ${mark(diff.whole ?? diff.items?.[index])}`}>
          <span className="shrink-0 text-faint">
            {section.type === "numbered" ? `${index + 1}.` : "•"}
          </span>
          <span className="min-w-0">
            {item.key && <span className="font-medium">{item.key}: </span>}
            <span className={item.key ? "text-muted" : ""}>
              <Inline text={item.text} />
            </span>
          </span>
        </li>
      ))}
    </List>
  );
}
