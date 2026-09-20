import { useState } from "react";
import { Download } from "lucide-react";
import useElementWidth from "../../hooks/useElementWidth";
import { STRENGTH_SERIES } from "../../data/analytics";
import { downloadFile } from "../../lib/promptText";
import { CARD, btn } from "../../lib/ui";

const HEIGHT = 260;
const PAD = { top: 12, right: 32, bottom: 34, left: 52 };
const TICKS = [0, 25, 50, 75, 100];
const TOOLTIP_WIDTH = 168;

/* Smooth curve through the points using horizontal-midpoint beziers. */
const curvePath = (points) =>
  points.reduce((path, [x, y], index) => {
    if (index === 0) return `M${x},${y}`;
    const [prevX, prevY] = points[index - 1];
    const midX = (prevX + x) / 2;
    return `${path} C${midX},${prevY} ${midX},${y} ${x},${y}`;
  }, "");

export default function StrengthLineChart() {
  const { days, lines, tooltipOrder, highlight } = STRENGTH_SERIES;
  const [containerRef, width] = useElementWidth();
  const [hoverIndex, setHoverIndex] = useState(null);
  const active = hoverIndex ?? highlight;

  const plotWidth = Math.max(width - PAD.left - PAD.right, 0);
  const plotHeight = HEIGHT - PAD.top - PAD.bottom;
  const step = plotWidth / (days.length - 1);
  const x = (index) => PAD.left + index * step;
  const y = (value) => PAD.top + plotHeight * (1 - value / 100);

  const handleMove = (event) => {
    if (!step) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    const index = Math.round((event.clientX - bounds.left - PAD.left) / step);
    setHoverIndex(Math.min(days.length - 1, Math.max(0, index)));
  };

  const exportCsv = () => {
    const header = ["Date", ...lines.map((line) => line.label)].join(",");
    const rows = days.map((day) => [`"${day.date}"`, ...lines.map((line) => day[line.key])].join(","));
    downloadFile("prompt-strength-daily.csv", [header, ...rows].join("\n"), "text/csv");
  };

  const day = days[active];
  const activeX = x(active);
  const flipTooltip = activeX + 14 + TOOLTIP_WIDTH > width;
  const pointsFor = (key) => days.map((entry, index) => [x(index), y(entry[key])]);
  const averageLine = curvePath(pointsFor("avg"));

  return (
    <section className={`${CARD} p-6`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-[17px] font-semibold">
            Prompt Strength Over Time{" "}
            <span className="text-[14px] font-normal text-muted">(Daily)</span>
          </h2>
          <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-[12px] text-muted">
            {lines.map((line) => (
              <span key={line.key} className="flex items-center gap-2">
                <span className="h-[3px] w-4 rounded-full" style={{ background: line.color }} />
                {line.label}
              </span>
            ))}
          </div>
        </div>
        <button type="button" onClick={exportCsv} className={btn("secondary", "sm")}>
          <Download className="size-4" />
          Export
        </button>
      </div>

      <div ref={containerRef} className="relative mt-5" style={{ height: HEIGHT }}>
        {width > 0 && (
          <>
            <svg
              width={width}
              height={HEIGHT}
              className="block"
              role="img"
              aria-label="Daily average, top and lowest prompt strength scores"
              onMouseMove={handleMove}
              onMouseLeave={() => setHoverIndex(null)}
            >
              <defs>
                <linearGradient id="pg-average-fill" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor="var(--color-brand)" stopOpacity="0.22" />
                  <stop offset="100%" stopColor="var(--color-brand)" stopOpacity="0" />
                </linearGradient>
              </defs>

              {TICKS.map((tick) => (
                <g key={tick}>
                  <line
                    x1={PAD.left}
                    x2={width - PAD.right}
                    y1={y(tick)}
                    y2={y(tick)}
                    stroke="var(--c-line)"
                    strokeDasharray={tick === 0 ? undefined : "3 5"}
                  />
                  <text
                    x={PAD.left - 14}
                    y={y(tick)}
                    dy="0.32em"
                    textAnchor="end"
                    fontSize="11"
                    fill="var(--c-faint)"
                  >
                    {tick}
                  </text>
                </g>
              ))}

              {days.map((entry, index) => (
                <text
                  key={entry.label}
                  x={x(index)}
                  y={HEIGHT - 10}
                  textAnchor="middle"
                  fontSize="11"
                  fill={index === active ? "var(--c-text)" : "var(--c-faint)"}
                >
                  {entry.label}
                </text>
              ))}

              <path
                d={`${averageLine} L${x(days.length - 1)},${y(0)} L${x(0)},${y(0)} Z`}
                fill="url(#pg-average-fill)"
              />

              <line
                x1={activeX}
                x2={activeX}
                y1={PAD.top}
                y2={y(0)}
                stroke="var(--c-faint)"
                strokeDasharray="3 4"
              />

              {lines.map((line) => (
                <path
                  key={line.key}
                  d={curvePath(pointsFor(line.key))}
                  fill="none"
                  stroke={line.color}
                  strokeWidth="2.5"
                  strokeLinecap="round"
                />
              ))}

              {lines.map((line) => (
                <circle
                  key={line.key}
                  cx={activeX}
                  cy={y(day[line.key])}
                  r="4.5"
                  fill="var(--c-surface)"
                  stroke={line.color}
                  strokeWidth="2.5"
                />
              ))}
            </svg>

            <div
              className="pointer-events-none absolute rounded-lg border border-line bg-surface-2 px-3 py-2.5 text-[12px] shadow-xl"
              style={{
                width: TOOLTIP_WIDTH,
                top: PAD.top,
                left: flipTooltip ? activeX - 14 - TOOLTIP_WIDTH : activeX + 14,
              }}
            >
              <div className="font-semibold">{day.date}</div>
              {tooltipOrder.map((key) => {
                const line = lines.find((candidate) => candidate.key === key);
                return (
                  <div key={key} className="mt-1.5 flex items-center justify-between gap-3">
                    <span className="flex items-center gap-1.5 text-muted">
                      <span className="size-2 rounded-full" style={{ background: line.color }} />
                      {line.label}
                    </span>
                    <span className="font-semibold">{day[key]}</span>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </section>
  );
}
