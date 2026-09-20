import { FEATURE_CARDS } from "../data/content";

export default function FeatureCards() {
  return (
    <div className="grid grid-cols-2 gap-5 xl:grid-cols-4">
      {FEATURE_CARDS.map(({ id, title, body, icon: Icon, tone, tint }) => (
        <article
          key={id}
          className="flex flex-col items-center rounded-2xl border border-line bg-surface px-5 py-7 text-center"
        >
          <span className={`grid size-14 place-items-center rounded-xl ring-1 ${tint}`}>
            <Icon className={`size-7 ${tone}`} strokeWidth={1.75} />
          </span>
          <h3 className="mt-5 text-[17px] font-semibold">{title}</h3>
          <p className="mt-2 text-[14px] leading-7 text-muted">{body}</p>
        </article>
      ))}
    </div>
  );
}
