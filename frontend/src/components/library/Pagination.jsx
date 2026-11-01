import { ChevronLeft, ChevronRight } from "lucide-react";

/* First, last and the neighbours of the current page, with "…" for gaps:
   1 2 3 … 22  /  1 … 9 10 11 … 22  /  1 … 20 21 22 */
function pageItems(page, count) {
  const pages = new Set([1, count, page - 1, page, page + 1]);
  if (page <= 2) [2, 3].forEach((n) => pages.add(n));
  if (page >= count - 1) [count - 1, count - 2].forEach((n) => pages.add(n));

  return [...pages]
    .filter((n) => n >= 1 && n <= count)
    .sort((a, b) => a - b)
    .flatMap((n, index, sorted) => (index > 0 && n - sorted[index - 1] > 1 ? ["gap", n] : [n]));
}

const CELL = "grid size-8 place-items-center rounded-lg text-[13px] transition-colors";
const IDLE = "text-muted hover:bg-surface-2 hover:text-text disabled:pointer-events-none disabled:opacity-40";

export default function Pagination({ page, pageCount, onChange }) {
  return (
    <nav aria-label="Pagination" className="flex items-center gap-1">
      <button
        type="button"
        aria-label="Previous page"
        disabled={page <= 1}
        onClick={() => onChange(page - 1)}
        className={`${CELL} ${IDLE}`}
      >
        <ChevronLeft className="size-4" />
      </button>

      {pageItems(page, pageCount).map((item, index) =>
        item === "gap" ? (
          <span key={`gap-${index}`} className={`${CELL} text-faint`}>
            …
          </span>
        ) : (
          <button
            key={item}
            type="button"
            aria-current={item === page ? "page" : undefined}
            onClick={() => onChange(item)}
            className={`${CELL} ${item === page ? "border border-brand/40 bg-brand/10 font-medium text-brand" : IDLE}`}
          >
            {item}
          </button>
        ),
      )}

      <button
        type="button"
        aria-label="Next page"
        disabled={page >= pageCount}
        onClick={() => onChange(page + 1)}
        className={`${CELL} ${IDLE}`}
      >
        <ChevronRight className="size-4" />
      </button>
    </nav>
  );
}
