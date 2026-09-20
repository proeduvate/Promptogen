import { useState } from "react";
import { STRENGTH } from "../../data/content";
import { BREAKDOWN_COLORS } from "../../data/analytics";
import { CARD } from "../../lib/ui";

const SIZE = 120;
const RADIUS = 46;
const STROKE = 14;
const GAP = 3;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export default function BreakdownDonut() {
  const { score, metrics } = STRENGTH;
  const [hovered, setHovered] = useState(null);

  const total = metrics.reduce((sum, metric) => sum + metric.value, 0);
  const segments = metrics.reduce((list, metric) => {
    const offset = list.length ? list[list.length - 1].end : 0;
    const length = (metric.value / total) * CIRCUMFERENCE;
    return [...list, { ...metric, offset, length: length - GAP, end: offset + length }];
  }, []);

  return (
    <section className={`${CARD} p-6`}>
      <h2 className="text-[17px] font-semibold">Strength Breakdown</h2>

      <div className="mt-5 flex items-center gap-5">
        <div className="relative shrink-0" style={{ width: SIZE, height: SIZE }}>
          <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="size-full -rotate-90">
            {segments.map((segment) => (
              <circle
                key={segment.id}
                cx={SIZE / 2}
                cy={SIZE / 2}
                r={RADIUS}
                fill="none"
                stroke={BREAKDOWN_COLORS[segment.id]}
                strokeWidth={STROKE}
                strokeDasharray={`${segment.length} ${CIRCUMFERENCE - segment.length}`}
                strokeDashoffset={-segment.offset}
                opacity={hovered && hovered !== segment.id ? 0.3 : 1}
                className="transition-opacity"
              />
            ))}
          </svg>
          <div className="absolute inset-0 grid place-content-center text-center">
            <div className="text-[28px] font-bold leading-none">{score}</div>
            <div className="mt-1 text-[12px] text-muted">/100</div>
          </div>
        </div>

        <ul className="min-w-0 flex-1 space-y-2.5">
          {metrics.map(({ id, label, value }) => (
            <li
              key={id}
              onMouseEnter={() => setHovered(id)}
              onMouseLeave={() => setHovered(null)}
              className="flex items-center justify-between gap-3 text-[13px]"
            >
              <span className="flex items-center gap-2">
                <span className="size-2.5 rounded-full" style={{ background: BREAKDOWN_COLORS[id] }} />
                {label}
              </span>
              <span className="text-muted">{value}/100</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
