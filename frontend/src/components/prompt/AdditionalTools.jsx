import { ADDITIONAL_TOOLS } from "../../data/generated";
import { CARD, ICON_TILE } from "../../lib/ui";

export default function AdditionalTools({ onSelect }) {
  return (
    <section className={`${CARD} p-6`}>
      <h2 className="text-[19px] font-semibold">Additional Tools</h2>
      <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {ADDITIONAL_TOOLS.map(({ id, title, body, icon: Icon, tone, tint }) => (
          <button
            key={id}
            type="button"
            onClick={() => onSelect(id)}
            className="flex flex-col items-start rounded-xl border border-line bg-surface-2 p-4 text-left transition-colors hover:border-brand/40 hover:bg-surface-3"
          >
            <span className={`${ICON_TILE} size-10 ${tint}`}>
              <Icon className={`size-5 ${tone}`} strokeWidth={1.75} />
            </span>
            <span className="mt-3 text-[14px] font-semibold">{title}</span>
            <span className="mt-1 text-[13px] leading-5 text-muted">{body}</span>
          </button>
        ))}
      </div>
    </section>
  );
}
