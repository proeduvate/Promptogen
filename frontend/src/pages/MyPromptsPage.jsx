import { useEffect, useMemo, useRef, useState } from "react";
import { FileInput, FolderInput, PencilLine, Plus, RotateCcw, Search, Trash2, Users } from "lucide-react";
import PageShell from "../components/PageShell";
import PageHeader from "../components/PageHeader";
import Tabs from "../components/Tabs";
import EmptyState from "../components/EmptyState";
import FolderList from "../components/library/FolderList";
import FiltersCard from "../components/library/FiltersCard";
import PromptTable from "../components/library/PromptTable";
import Pagination from "../components/library/Pagination";
import PromptDetailsPanel from "../components/library/PromptDetailsPanel";
import ImportDialog from "../components/library/ImportDialog";
import ShareDialog from "../components/workspace/ShareDialog";
import Dialog from "../components/Dialog";
import ConfirmDialog from "../components/ConfirmDialog";
import SelectInput from "../components/SelectInput";
import { scanSecurity } from "../lib/analysis";
import { toLibraryRecord } from "../lib/library";
import { downloadFile, promptToMarkdown, promptToText } from "../lib/promptText";
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

const SEED_IDS = new Set(PROMPTS.map(({ id }) => id));

const currentSections = (prompt) => prompt.versions?.find(({ id }) => id === prompt.currentVersion)?.sections ?? prompt.versions?.[0]?.sections ?? [];

/* Text searched by the library search: names, tags, folders and every version's content (spec §27). */
const searchText = (prompt) =>
  [prompt.title, ...prompt.tags, FOLDERS.find(({ id }) => id === prompt.folder)?.label ?? "", ...(prompt.versions ?? []).map((version) => promptToText(version.sections))]
    .join("\n")
    .toLowerCase();

function RenameDialog({ prompt, onClose, onSave }) {
  const [value, setValue] = useState(prompt.title);
  return (
    <Dialog
      open
      onClose={onClose}
      title="Rename prompt"
      icon={PencilLine}
      footer={
        <>
          <button type="button" onClick={onClose} className={`${btn()} mr-auto`}>
            Cancel
          </button>
          <button type="submit" form="pg-rename" disabled={!value.trim()} className={btn("primary")}>
            Save
          </button>
        </>
      }
    >
      <form
        id="pg-rename"
        onSubmit={(event) => {
          event.preventDefault();
          if (value.trim()) onSave(value.trim());
        }}
      >
        <label className="text-[13px] font-medium">
          Name
          <input data-autofocus value={value} maxLength={80} onChange={(event) => setValue(event.target.value)} className="mt-1.5 w-full rounded-lg border border-line bg-surface-2 px-3.5 py-2.5 text-[14px] outline-none focus:border-brand/60" />
        </label>
      </form>
    </Dialog>
  );
}

function MoveDialog({ prompt, onClose, onMove }) {
  const [folder, setFolder] = useState(prompt.folder);
  return (
    <Dialog
      open
      onClose={onClose}
      title="Move to folder"
      description={prompt.title}
      icon={FolderInput}
      footer={
        <>
          <button type="button" onClick={onClose} className={`${btn()} mr-auto`}>
            Cancel
          </button>
          <button type="button" onClick={() => onMove(folder)} className={btn("primary")}>
            Move
          </button>
        </>
      }
    >
      <label className="text-[13px] font-medium">
        Folder
        <SelectInput value={folder} onChange={setFolder} options={FOLDERS.filter(({ id }) => id !== "all").map(({ id, label }) => ({ value: id, label }))} className="mt-1.5" />
      </label>
    </Dialog>
  );
}

export default function MyPromptsPage({ chrome, onNewPrompt, prompts, onPromptsChange, initialSelectedId, onOpenPrompt, onOpenImported, onLog }) {
  const [tab, setTab] = useState("all");
  /* The library lives in App so Favorites and other screens stay in sync. */
  const setPrompts = onPromptsChange;
  const [query, setQuery] = useState("");
  const [folder, setFolder] = useState("all");
  const [draftFilters, setDraftFilters] = useState(DEFAULT_FILTERS);
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [selectedId, setSelectedId] = useState(initialSelectedId ?? "launch-emails");
  const [page, setPage] = useState(1);
  const [detailsTab, setDetailsTab] = useState(null);
  const [dialog, setDialog] = useState(null);
  const [shareLinks, setShareLinks] = useState({});
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
        !prompt.deleted &&
        (tab !== "favorites" || prompt.favorite) &&
        (folder === "all" ? prompt.folder !== "archived" : prompt.folder === folder) &&
        (filters.model === "all" || prompt.model === filters.model) &&
        (filters.tag === "all" || prompt.tags.includes(filters.tag)) &&
        (filters.createdBy === "all" || prompt.createdBy === filters.createdBy) &&
        matchesDate(prompt.date, filters.date) &&
        (!needle || needle.split(/\s+/).every((word) => searchText(prompt).includes(word))),
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

  const selected = prompts.find((prompt) => prompt.id === selectedId && !prompt.deleted);
  const addedByFolder = prompts.filter((prompt) => !SEED_IDS.has(prompt.id) && !prompt.deleted).reduce((counts, prompt) => ({ ...counts, [prompt.folder]: (counts[prompt.folder] ?? 0) + 1, all: (counts.all ?? 0) + 1 }), {});

  const updatePrompt = (id, change) =>
    setPrompts((prev) => prev.map((prompt) => (prompt.id === id ? { ...prompt, ...change(prompt) } : prompt)));

  const toggleFavorite = (id) => updatePrompt(id, (prompt) => ({ favorite: !prompt.favorite }));

  const applyVersion = (id, versionId) =>
    updatePrompt(id, (prompt) => ({
      currentVersion: versionId,
      score: prompt.versions.find((version) => version.id === versionId).metrics.score,
    }));

  /* Row actions (spec §24). */
  const handleAction = (action, prompt) => {
    if (action === "open" || action === "test") onOpenPrompt(prompt, action === "test" ? "test" : null);
    else if (action === "compare") {
      setSelectedId(prompt.id);
      setDetailsTab("compare");
    } else if (action === "duplicate") {
      const copy = { ...prompt, id: `${prompt.id}-copy-${Date.now()}`, title: `${prompt.title} (copy)`, favorite: false, modifiedAt: Date.now() };
      setPrompts((list) => [copy, ...list]);
      setSelectedId(copy.id);
    } else if (action === "export") {
      downloadFile(`${prompt.id}.md`, `# ${prompt.title}\n\n${promptToMarkdown(currentSections(prompt))}`, "text/markdown");
      onLog?.({ type: "exported", title: "Exported as Markdown", prompt: prompt.title });
    } else if (action === "archive" || action === "unarchive") {
      updatePrompt(prompt.id, (current) => (action === "archive" ? { folder: "archived", previousFolder: current.folder } : { folder: current.previousFolder ?? "personal" }));
    } else setDialog({ type: action, prompt });
  };

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
      <button type="button" onClick={() => setDialog({ type: "import" })} className={btn()}>
        <FileInput className="size-4" />
        Import
      </button>
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
    const trashed = prompts.filter((prompt) => prompt.deleted);
    body = trashed.length ? (
      <ul className={`${CARD} divide-y divide-line`}>
        {trashed.map((prompt) => (
          <li key={prompt.id} className="flex flex-wrap items-center gap-3 px-5 py-3.5">
            <span className="min-w-0 flex-1 text-[14px] font-medium">{prompt.title}</span>
            <button type="button" onClick={() => updatePrompt(prompt.id, () => ({ deleted: false }))} className={btn("secondary", "sm")}>
              <RotateCcw className="size-4" />
              Restore
            </button>
            <button type="button" onClick={() => setDialog({ type: "purge", prompt })} className={btn("ghost", "sm")}>
              <Trash2 className="size-4" />
              Delete forever
            </button>
          </li>
        ))}
      </ul>
    ) : (
      <EmptyState icon={Trash2} title="Trash is empty" body="Prompts you delete will show up here." />
    );
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
          <FolderList active={folder} onSelect={setFolder} extra={addedByFolder} />
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
          onAction={handleAction}
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
              key={`${selected.id}-${detailsTab}`}
              prompt={selected}
              initialTab={detailsTab}
              onToggleFavorite={toggleFavorite}
              onUseVersion={applyVersion}
              onNewVersion={() => onOpenPrompt(selected, null)}
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

      {dialog?.type === "import" && (
        <ImportDialog
          onClose={() => setDialog(null)}
          onOpen={(imported) => {
            setDialog(null);
            onOpenImported(imported);
          }}
          onSave={(imported) => {
            const record = toLibraryRecord({
              id: `imported-${Date.now()}`,
              title: imported.title,
              domain: imported.domain,
              model: "GPT-4o",
              versions: [{ id: "v1", createdAt: Date.now(), sections: imported.sections }],
              currentVersion: "v1",
            });
            setPrompts((list) => [record, ...list]);
            setSelectedId(record.id);
            setDetailsTab("details");
            setDialog(null);
            onLog?.({ type: "created", title: `Imported “${record.title}”`, prompt: record.title });
          }}
        />
      )}
      {dialog?.type === "rename" && (
        <RenameDialog
          prompt={dialog.prompt}
          onClose={() => setDialog(null)}
          onSave={(title) => {
            updatePrompt(dialog.prompt.id, () => ({ title, modifiedAt: Date.now() }));
            setDialog(null);
          }}
        />
      )}
      {dialog?.type === "move" && (
        <MoveDialog
          prompt={dialog.prompt}
          onClose={() => setDialog(null)}
          onMove={(target) => {
            updatePrompt(dialog.prompt.id, () => ({ folder: target, modifiedAt: Date.now() }));
            setDialog(null);
          }}
        />
      )}
      {dialog?.type === "share" && (
        <ShareDialog
          title={dialog.prompt.title}
          findings={scanSecurity(promptToText(currentSections(dialog.prompt)))}
          link={shareLinks[dialog.prompt.id]}
          onCreate={(link) => {
            setShareLinks((links) => ({ ...links, [dialog.prompt.id]: link }));
            onLog?.({ type: "shared", title: `Shared a ${link.permission === "view" ? "view-only" : link.permission} link`, prompt: dialog.prompt.title });
          }}
          onRevoke={() => setShareLinks((links) => ({ ...links, [dialog.prompt.id]: null }))}
          onClose={() => setDialog(null)}
        />
      )}
      <ConfirmDialog
        open={dialog?.type === "delete" || dialog?.type === "purge"}
        title={dialog?.type === "purge" ? "Delete forever?" : "Move to Trash?"}
        body={
          dialog?.type === "purge"
            ? `“${dialog?.prompt?.title}” and all its versions will be permanently deleted.`
            : `“${dialog?.prompt?.title}” moves to Trash. You can restore it from there.`
        }
        confirmLabel={dialog?.type === "purge" ? "Delete forever" : "Move to Trash"}
        onConfirm={() => {
          if (dialog.type === "purge") setPrompts((list) => list.filter((prompt) => prompt.id !== dialog.prompt.id));
          else updatePrompt(dialog.prompt.id, () => ({ deleted: true, favorite: false }));
          setDialog(null);
        }}
        onClose={() => setDialog(null)}
      />
    </PageShell>
  );
}
