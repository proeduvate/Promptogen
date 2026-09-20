import { CARD, ICON_TILE } from "../lib/ui";

export default function EmptyState({ icon: Icon, title, body, children }) {
  return (
    <section className={`${CARD} flex flex-col items-center px-6 py-16 text-center`}>
      <span className={`${ICON_TILE} size-14 bg-brand/10 ring-brand/20`}>
        <Icon className="size-7 text-brand" strokeWidth={1.75} />
      </span>
      <h2 className="mt-5 text-[17px] font-semibold">{title}</h2>
      <p className="mt-2 max-w-[420px] text-[14px] leading-6 text-muted">{body}</p>
      {children && <div className="mt-6">{children}</div>}
    </section>
  );
}
