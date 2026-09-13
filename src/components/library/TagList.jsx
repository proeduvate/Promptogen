export default function TagList({ tags, moreTags = 0 }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {tags.map((tag) => (
        <span
          key={tag}
          className="whitespace-nowrap rounded-md bg-surface-3 px-2 py-0.5 text-[11px] text-muted"
        >
          {tag}
        </span>
      ))}
      {moreTags > 0 && <span className="px-1 py-0.5 text-[11px] text-faint">+{moreTags}</span>}
    </div>
  );
}
