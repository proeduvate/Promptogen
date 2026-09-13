import { CornerDownLeft } from "lucide-react";
import { EXAMPLE_CHIPS } from "../data/content";

const MAX_CHARS = 500;

/* Fixed positions keep the starfield stable across rerenders. */
const STARS = [
  [4, 12], [9, 30], [14, 8], [22, 52], [27, 18], [33, 74], [41, 10],
  [48, 60], [55, 26], [62, 80], [68, 14], [74, 44], [81, 22], [88, 66],
  [93, 34], [97, 12], [18, 88], [59, 92], [86, 86],
];

export default function Hero({ value, onChange, onSubmit }) {
  const handleKeyDown = (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      onSubmit();
    }
  };

  return (
    <section className="relative overflow-hidden rounded-2xl border border-line bg-surface px-8 pb-8 pt-9">
      {/* Decorative starfield */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        {STARS.map(([left, top], index) => (
          <span
            key={index}
            className="absolute size-[3px] rounded-full bg-text/25"
            style={{ left: `${left}%`, top: `${top}%` }}
          />
        ))}
      </div>

      {/* Decorative paper plane + flight path */}
      <svg
        aria-hidden
        viewBox="0 0 220 170"
        className="pointer-events-none absolute right-6 top-24 hidden w-[220px] text-brand xl:block"
      >
        <path
          d="M6 158C36 150 74 128 104 96"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeDasharray="1 9"
          opacity="0.55"
        />
        <path d="M170 24 108 96l34 10 8 30 42-100-22-12z" fill="currentColor" opacity="0.9" />
        <path d="M170 24 142 106l-34-10z" fill="currentColor" opacity="0.55" />
      </svg>

      <div className="relative">
        <div className="flex justify-center">
          <span className="rounded-full border border-brand/45 bg-brand/5 px-4 py-1.5 text-[13px] font-medium text-brand">
            AI-Powered Prompt Engineering
          </span>
        </div>

        <h1 className="mt-6 text-center text-[54px] font-bold leading-tight tracking-tight">
          Welcome to <span className="text-brand">Promptogen</span>
        </h1>

        <p className="mx-auto mt-3 max-w-[560px] text-center text-[15px] leading-7 text-muted">
          Transform your ideas into powerful, structured prompts.
          <br />
          Answer a few questions and get a high-quality prompt that works.
        </p>

        {/* Composer */}
        <div className="mx-auto mt-9 max-w-[720px] rounded-xl border border-line bg-surface-2 p-5">
          <label htmlFor="pg-idea" className="block text-[16px] font-medium">
            What do you want to create today?
          </label>
          <textarea
            id="pg-idea"
            rows={3}
            maxLength={MAX_CHARS}
            value={value}
            onChange={(event) => onChange(event.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="e.g., Write a prompt for an AI to create a marketing strategy..."
            className="mt-3 w-full resize-none bg-transparent text-[15px] leading-7 text-text outline-none placeholder:text-faint"
          />
          <div className="mt-3 flex items-end justify-between">
            <span className="text-[13px] text-faint">
              {value.length}/{MAX_CHARS}
            </span>
            <button
              type="button"
              onClick={onSubmit}
              disabled={value.trim().length === 0}
              className="flex items-center gap-2 rounded-lg bg-brand-strong px-5 py-2.5 text-[15px] font-medium text-white transition-colors hover:bg-brand disabled:cursor-not-allowed disabled:opacity-40"
            >
              Enter
              <CornerDownLeft className="size-4" />
            </button>
          </div>
        </div>

        {/* Quick starts */}
        <p className="mt-7 text-[14px] text-muted">Try these examples:</p>
        <div className="mt-3 flex flex-wrap gap-3">
          {EXAMPLE_CHIPS.map(({ id, label, icon: Icon, tone, seed }) => (
            <button
              key={id}
              type="button"
              onClick={() => onChange(seed)}
              className="flex items-center gap-2 rounded-lg border border-line bg-surface-2 px-4 py-2.5 text-[14px] text-text transition-colors hover:border-brand/40 hover:bg-surface-3"
            >
              <Icon className={`size-[17px] ${tone}`} strokeWidth={1.75} />
              {label}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
