import { useEffect, useMemo, useRef, useState } from "react";
import { Plus, Search, Trash2, Users } from "lucide-react";
import PageShell from "../components/PageShell";
import PageHeader from "../components/PageHeader";
import Tabs from "../components/Tabs";
import EmptyState from "../components/EmptyState";
import FolderList from "../components/library/FolderList";
import FiltersCard from "../components/library/FiltersCard";
import PromptTable from "../components/library/PromptTable";
import Pagination from "../components/library/Pagination";
import PromptDetailsPanel from "../components/library/PromptDetailsPanel";
import {
  DEFAULT_FILTERS,
  FOLDERS,
  LIBRARY_TABS,
  LIBRARY_TOTAL,
  PAGE_COUNT,
  PAGE_SIZE,
  PROMPTS,
  TODAY,
} from "../data/library";
import { CARD, ICON_TILE, btn } from "../lib/ui";

const DAY_MS = 86_400_000;

const matchesDate = (date, range) => {
  if (range === "all") return true;
  const age = (new Date(TODAY) - new Date(date)) / DAY_MS;
  if (range === "today") return age === 0;
  return age < (range === "week" ? 7 : 30);
};

export default function MyPromptsPage({ chrome, onNewPrompt }) {
  const [tab, setTab] = useState("all");
  const [prompts, setPrompts] = useState(PROMPTS);
  const [query, setQuery] = useState("");
  const [folder, setFolder] = useState("all");
  const [draftFilters, setDraftFilters] = useState(DEFAULT_FILTERS);
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [selectedId, setSelectedId] = useState("launch-emails");
  const [page, setPage] = useState(1);
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

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return prompts.filter(
      (prompt) =>
        (tab !== "favorites" || prompt.favorite) &&
        (folder === "all" || prompt.folder === folder) &&
        (filters.model === "all" || prompt.model === filters.model) &&
        (filters.tag === "all" || prompt.tags.includes(filters.tag)) &&
        (filters.createdBy === "all" || prompt.createdBy === filters.createdBy) &&
        matchesDate(prompt.date, filters.date) &&
        (!needle ||
          prompt.title.toLowerCase().includes(needle) ||
          prompt.tags.some((tag) => tag.toLowerCase().includes(needle))),
    );
  }, [prompts, tab, folder, filters, query]);

  /* Unfiltered, the footer reports the library totals from the mock.
     Once anything narrows the list, it reports what is actually shown. */
  const narrowed =
    tab === "favorites" ||
    folder !== "all" ||
    query.trim() !== "" ||
    Object.values(filters).some((value) => value !== "all");
  const total = narrowed ? visible.length : LIBRARY_TOTAL;
  const pageCount = narrowed ? 1 : PAGE_COUNT;
  const currentPage = narrowed ? 1 : page;
  const from = total === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1;
  const to = Math.min(currentPage * PAGE_SIZE, total);

  const selected = prompts.find(({ id }) => id === selectedId);

  const updatePrompt = (id, change) =>
    setPrompts((prev) => prev.map((prompt) => (prompt.id === id ? { ...prompt, ...change(prompt) } : prompt)));

  const toggleFavorite = (id) => updatePrompt(id, (prompt) => ({ favorite: !prompt.favorite }));

  const applyVersion = (id, versionId) =>
    updatePrompt(id, (prompt) => ({
      currentVersion: versionId,
      score: prompt.versions.find((version) => version.id === versionId).metrics.score,
    }));

  const openFolder = (id) => {
    setFolder(id);
    setTab("all");
  };

  const header = (
    <PageHeader title="My Prompts" subtitle="Organize, manage and reuse your best prompts.">
      <label className="flex w-full items-center gap-2 rounded-lg border border-line bg-surface px-3 py-2.5 focus-within:border-brand/60 sm:w-[280px]">
        <Search className="size-4 shrink-0 text-faint" />
        <input
          ref={searchRef}
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search prompts..."
          aria-label="Search prompts"
          className="min-w-0 flex-1 bg-transparent text-[14px] text-text outline-none placeholder:text-faint"
        />
        <kbd className="rounded-md border border-line bg-surface-2 px-1.5 py-0.5 font-sans text-[11px] text-faint">
          ⌘K
        </kbd>
      </label>
      <button type="button" onClick={onNewPrompt} className={btn("primary")}>
        <Plus className="size-4" />
        New Prompt
      </button>
    </PageHeader>
  );

  let body;
  if (tab === "shared") {
    body = (
      <EmptyState
        icon={Users}
        title="Nothing shared with you yet"
        body="Prompts your teammates share with you will show up here."
      />
    );
  } else if (tab === "trash") {
    body = <EmptyState icon={Trash2} title="Trash is empty" body="Prompts you delete will show up here." />;
  } else if (tab === "folders") {
    body = (
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
        {FOLDERS.filter(({ id }) => id !== "all").map(({ id, label, count, icon: Icon, tone }) => (
          <button
            key={id}
            type="button"
            onClick={() => openFolder(id)}
            className={`${CARD} flex items-center gap-4 p-5 text-left transition-colors hover:border-brand/40 hover:bg-surface-2`}
          >
            <span className={`${ICON_TILE} size-12 bg-surface-2 ring-line`}>
              <Icon className={`size-6 ${tone}`} strokeWidth={1.75} />
            </span>
            <span className="min-w-0">
              <span className="block truncate text-[15px] font-semibold">{label}</span>
              <span className="mt-0.5 block text-[13px] text-muted">{count} prompts</span>
            </span>
          </button>
        ))}
      </div>
    );
  } else {
    body = (
      <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-[240px_minmax(0,1fr)] min-[1880px]:grid-cols-[240px_minmax(0,1fr)_460px]">
        <div className="flex flex-col gap-5 lg:row-span-2 min-[1880px]:row-span-1">
          <FolderList active={folder} onSelect={setFolder} />
          <FiltersCard
            values={draftFilters}
            onChange={(id, value) => setDraftFilters((prev) => ({ ...prev, [id]: value }))}
            onClear={() => {
              setDraftFilters(DEFAULT_FILTERS);
              setFilters(DEFAULT_FILTERS);
            }}
            onApply={() => setFilters(draftFilters)}
          />
        </div>

        <PromptTable
          prompts={visible}
          selectedId={selectedId}
          onSelect={setSelectedId}
          onToggleFavorite={toggleFavorite}
          footer={
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-5 py-3.5">
              <span className="text-[13px] text-muted">
                Showing {from} to {to} of {total} prompts
              </span>
              <Pagination page={currentPage} pageCount={pageCount} onChange={setPage} />
            </div>
          }
        />

        {selected && (
          <div className="min-w-0 lg:col-start-2 min-[1880px]:col-start-3">
            <PromptDetailsPanel
              key={selected.id}
              prompt={selected}
              onToggleFavorite={toggleFavorite}
              onUseVersion={applyVersion}
              onNewVersion={(id) => console.log("New version", id)}
            />
          </div>
        )}
      </div>
    );
  }

  return (
    <PageShell chrome={chrome} header={header}>
      <Tabs tabs={LIBRARY_TABS} active={tab} onChange={setTab} className="mb-5" />
      {body}
    </PageShell>
  );
}
