import { useEffect, useMemo, useRef, useState } from "react";
import { Search, SearchX } from "lucide-react";
import PageShell from "../components/PageShell";
import PageHeader from "../components/PageHeader";
import EmptyState from "../components/EmptyState";
import TemplateCard from "../components/templates/TemplateCard";
import { TEMPLATES, TEMPLATE_CATEGORIES } from "../data/templates";
import { fuzzySearch } from "../lib/fuzzy";
import { btn } from "../lib/ui";

const CATEGORY_BY_ID = Object.fromEntries(TEMPLATE_CATEGORIES.map((category) => [category.id, category]));

/* The category label is searchable too, so "educ" finds every Education template. */
const SEARCHABLE = TEMPLATES.map((template) => ({
  ...template,
  categoryLabel: CATEGORY_BY_ID[template.category].label,
}));

const SEARCH_FIELDS = [
  { key: "title", weight: 3 },
  { key: "tags", weight: 2 },
  { key: "categoryLabel", weight: 2 },
  { key: "description", weight: 1, exact: true },
];

const chipClass = (isActive) =>
  [
    "flex items-center gap-2 whitespace-nowrap rounded-full border px-3.5 py-1.5 text-[13px] transition-colors",
    isActive
      ? "border-brand/40 bg-brand/10 font-medium text-brand"
      : "border-line bg-surface text-muted hover:bg-surface-2 hover:text-text",
  ].join(" ");

export default function TemplatesPage({ chrome, onUseTemplate }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const searchRef = useRef(null);

  /* ⌘K / Ctrl+K jumps to search, as hinted inside the input. */
  useEffect(() => {
    const onKeyDown = (event) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        searchRef.current?.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  const matches = useMemo(() => fuzzySearch(SEARCHABLE, query, SEARCH_FIELDS), [query]);
  const visible =
    category === "all" ? matches : matches.filter(({ item }) => item.category === category);

  /* Chip counts follow the search so they always say what a click will show. */
  const counts = matches.reduce((acc, { item }) => {
    acc[item.category] = (acc[item.category] ?? 0) + 1;
    return acc;
  }, {});

  const clearFilters = () => {
    setQuery("");
    setCategory("all");
    searchRef.current?.focus();
  };

  const header = (
    <PageHeader title="Templates" subtitle="Start from a proven prompt and make it your own.">
      <label className="flex w-full items-center gap-2 rounded-lg border border-line bg-surface px-3 py-2.5 focus-within:border-brand/60 sm:w-[280px]">
        <Search className="size-4 shrink-0 text-faint" />
        <input
          ref={searchRef}
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search templates..."
          aria-label="Search templates"
          className="min-w-0 flex-1 bg-transparent text-[14px] text-text outline-none placeholder:text-faint"
        />
        <kbd className="rounded-md border border-line bg-surface-2 px-1.5 py-0.5 font-sans text-[11px] text-faint">
          ⌘K
        </kbd>
      </label>
    </PageHeader>
  );

  return (
    <PageShell chrome={chrome} header={header}>
      <div className="mb-5 flex flex-wrap gap-2" role="group" aria-label="Filter by category">
        {[{ id: "all", label: "All" }, ...TEMPLATE_CATEGORIES].map(({ id, label }) => {
          const isActive = id === category;
          return (
            <button
              key={id}
              type="button"
              aria-pressed={isActive}
              onClick={() => setCategory(id)}
              className={chipClass(isActive)}
            >
              {label}
              <span className={isActive ? "text-brand/70" : "text-faint"}>
                {id === "all" ? matches.length : (counts[id] ?? 0)}
              </span>
            </button>
          );
        })}
      </div>

      <p className="mb-4 text-[13px] text-muted" aria-live="polite">
        Showing {visible.length} of {TEMPLATES.length} templates
      </p>

      {visible.length > 0 ? (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {visible.map(({ item, hits }) => (
            <TemplateCard
              key={item.id}
              template={item}
              category={CATEGORY_BY_ID[item.category]}
              hits={hits}
              onUse={onUseTemplate}
            />
          ))}
        </div>
      ) : (
        <EmptyState
          icon={SearchX}
          title="No templates found"
          body={
            query.trim()
              ? `Nothing matches “${query.trim()}”${category === "all" ? "" : ` in ${CATEGORY_BY_ID[category].label}`}. Try a different word or clear the filters.`
              : "There are no templates in this category yet."
          }
        >
          <button type="button" onClick={clearFilters} className={btn("secondary", "sm")}>
            Clear filters
          </button>
        </EmptyState>
      )}
    </PageShell>
  );
}
