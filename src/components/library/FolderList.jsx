import { FOLDERS } from "../../data/library";
import { CARD } from "../../lib/ui";

export default function FolderList({ active, onSelect }) {
  return (
    <section className={`${CARD} p-3`}>
      <h2 className="px-3 pb-2 pt-2 text-[15px] font-semibold">Folders</h2>
      <ul className="space-y-0.5">
        {FOLDERS.map(({ id, label, count, icon: Icon, tone }) => {
          const isActive = id === active;
          return (
            <li key={id}>
              <button
                type="button"
                onClick={() => onSelect(id)}
                aria-current={isActive ? "true" : undefined}
                className={[
                  "flex w-full items-center gap-3 rounded-lg border px-3 py-2 text-[14px] transition-colors",
                  isActive
                    ? "border-brand/40 bg-brand/10 font-medium text-brand"
                    : "border-transparent text-muted hover:bg-surface-2 hover:text-text",
                ].join(" ")}
              >
                <Icon className={`size-[17px] ${isActive ? "" : tone}`} strokeWidth={1.75} />
                <span className="min-w-0 flex-1 truncate text-left">{label}</span>
                <span className={`text-[12px] ${isActive ? "text-brand" : "text-faint"}`}>{count}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
