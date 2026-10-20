import { useMemo, useState } from "react";
import { History, Search } from "lucide-react";
import PageShell from "../components/PageShell";
import PageHeader from "../components/PageHeader";
import EmptyState from "../components/EmptyState";
import { ACTIVITY_TYPES } from "../data/history";
import { CARD, ICON_TILE, btn } from "../lib/ui";

const DAY_MS = 86_400_000;

const startOfDay = (time) => {
  const date = new Date(time);
  date.setHours(0, 0, 0, 0);
  return date.getTime();
};

const dayLabel = (dayStart) => {
  const today = startOfDay(Date.now());
  if (dayStart === today) return "Today";
  if (dayStart === today - DAY_MS) return "Yesterday";
  return new Date(dayStart).toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" });
};

const timeLabel = (time) =>
  new Date(time).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });

const chipClass = (isActive) =>
  [
    "flex items-center gap-2 whitespace-nowrap rounded-full border px-3.5 py-1.5 text-[13px] transition-colors",
    isActive
      ? "border-brand/40 bg-brand/10 font-medium text-brand"
      : "border-line bg-surface text-muted hover:bg-surface-2 hover:text-text",
  ].join(" ");

/* Timeline of prompt activity, grouped by day (spec §37). */
export default function HistoryPage({ chrome, activity }) {
  const [type, setType] = useState("all");
  const [query, setQuery] = useState("");

  const counts = activity.reduce((acc, entry) => {
    acc[entry.type] = (acc[entry.type] ?? 0) + 1;
    return acc;
  }, {});

  const days = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const visible = activity
      .filter((entry) => type === "all" || entry.type === type)
      .filter(
        (entry) =>
          !needle ||
          [entry.title, entry.detail, entry.prompt].some((text) => text?.toLowerCase().includes(needle)),
      )
      .sort((a, b) => b.at - a.at);

    const groups = new Map();
    visible.forEach((entry) => {
      const key = startOfDay(entry.at);
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(entry);
    });
    return [...groups.entries()];
  }, [activity, type, query]);

  const header = (
    <PageHeader title="History" subtitle="A timeline of everything you've created, improved and tested.">
      <label className="flex w-full items-center gap-2 rounded-lg border border-line bg-surface px-3 py-2.5 focus-within:border-brand/60 sm:w-[280px]">
        <Search className="size-4 shrink-0 text-faint" />
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search history..."
          aria-label="Search history"
          className="min-w-0 flex-1 bg-transparent text-[14px] text-text outline-none placeholder:text-faint"
        />
      </label>
    </PageHeader>
  );

  const filters = [
    { id: "all", label: "All", count: activity.length },
    ...Object.entries(ACTIVITY_TYPES)
      .filter(([id]) => counts[id])
      .map(([id, { label }]) => ({ id, label, count: counts[id] })),
  ];

  return (
    <PageShell chrome={chrome} header={header}>
      <div className="mb-5 flex flex-wrap gap-2" role="group" aria-label="Filter by activity">
        {filters.map(({ id, label, count }) => (
          <button key={id} type="button" aria-pressed={type === id} onClick={() => setType(id)} className={chipClass(type === id)}>
            {label}
            <span className={type === id ? "text-brand/70" : "text-faint"}>{count}</span>
          </button>
        ))}
      </div>

      {days.length === 0 ? (
        <EmptyState icon={History} title="No matching activity" body="Try another filter or search term.">
          <button
            type="button"
            onClick={() => {
              setType("all");
              setQuery("");
            }}
            className={btn("secondary", "sm")}
          >
            Clear filters
          </button>
        </EmptyState>
      ) : (
        <div className="space-y-6">
          {days.map(([dayStart, entries]) => (
            <section key={dayStart} aria-label={dayLabel(dayStart)}>
              <h2 className="mb-3 text-[13px] font-semibold uppercase tracking-wider text-muted">{dayLabel(dayStart)}</h2>
              <ol className={`${CARD} divide-y divide-line-soft`}>
                {entries.map((entry) => {
                  const style = ACTIVITY_TYPES[entry.type] ?? ACTIVITY_TYPES.created;
                  const Icon = style.icon;
                  return (
                    <li key={entry.id} className="flex items-start gap-4 px-5 py-4">
                      <time
                        dateTime={new Date(entry.at).toISOString()}
                        className="w-[68px] shrink-0 pt-2 text-[12px] tabular-nums text-faint"
                      >
                        {timeLabel(entry.at)}
                      </time>
                      <span className={`${ICON_TILE} size-9 ${style.tint}`}>
                        <Icon className={`size-[18px] ${style.tone}`} strokeWidth={1.75} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-[14px] font-medium leading-6">{entry.title}</p>
                        <p className="text-[13px] text-muted">
                          {entry.prompt}
                          {entry.detail && <span className="text-faint"> · {entry.detail}</span>}
                        </p>
                      </div>
                      <span className="hidden shrink-0 rounded-full bg-surface-3 px-2.5 py-0.5 text-[11px] text-muted sm:inline">
                        {style.label}
                      </span>
                    </li>
                  );
                })}
              </ol>
            </section>
          ))}
        </div>
      )}
    </PageShell>
  );
}
