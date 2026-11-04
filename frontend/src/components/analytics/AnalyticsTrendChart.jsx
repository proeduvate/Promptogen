import { useState } from "react";
import { ArrowUpRight, TrendingUp } from "lucide-react";

export default function AnalyticsTrendChart({ trendData }) {
  // Extract authentic points
  const rawPoints = Array.isArray(trendData)
    ? trendData
    : trendData?.points || trendData?.over_time || [];

  const points = rawPoints.map((p, idx) => {
    let dateStr = p.date || `Prompt ${idx + 1}`;
    if (typeof dateStr === "string" && dateStr.includes("-")) {
      try {
        const d = new Date(dateStr);
        if (!isNaN(d.getTime())) {
          dateStr = d.toLocaleDateString([], { month: "short", day: "numeric" });
        }
      } catch {}
    }
    return {
      date: dateStr,
      score: Number(p.score ?? p.average_score ?? 80),
    };
  });

  const [hoveredIndex, setHoveredIndex] = useState(null);

  // SVG dimensions
  const width = 580;
  const height = 180;
  const paddingLeft = 32;
  const paddingRight = 16;
  const paddingTop = 24;
  const paddingBottom = 28;

  const chartWidth = width - paddingLeft - paddingRight;
  const chartHeight = height - paddingTop - paddingBottom;

  const getX = (index) => {
    if (points.length <= 1) return paddingLeft + chartWidth / 2;
    return paddingLeft + (index / (points.length - 1)) * chartWidth;
  };
  const getY = (score) => paddingTop + (1 - Math.min(100, Math.max(0, score)) / 100) * chartHeight;

  // Average score & change calculation
  const avgScore =
    points.length > 0
      ? Math.round(points.reduce((sum, p) => sum + p.score, 0) / points.length)
      : (trendData?.averageScore ?? null);

  const changeStr = (() => {
    if (trendData?.change) return trendData.change;
    if (trendData?.trend_points != null) {
      const tp = trendData.trend_points;
      return tp > 0 ? `+${tp}%` : tp < 0 ? `${tp}%` : "0%";
    }
    if (points.length >= 2) {
      const diff = points[points.length - 1].score - points[0].score;
      return diff >= 0 ? `+${diff}%` : `${diff}%`;
    }
    return "+0%";
  })();

  const isPositiveChange = !changeStr.startsWith("-");

  const coords = points.map((p, i) => ({ x: getX(i), y: getY(p.score) }));

  const generateSmoothPath = (pts) => {
    if (pts.length === 0) return "";
    if (pts.length === 1) {
      return `M ${paddingLeft} ${pts[0].y} L ${width - paddingRight} ${pts[0].y}`;
    }
    let d = `M ${pts[0].x} ${pts[0].y}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[i === 0 ? 0 : i - 1];
      const p1 = pts[i];
      const p2 = pts[i + 1];
      const p3 = pts[i + 2] || p2;

      const cp1x = p1.x + (p2.x - p0.x) / 6;
      const cp1y = p1.y + (p2.y - p0.y) / 6;
      const cp2x = p2.x - (p3.x - p1.x) / 6;
      const cp2y = p2.y - (p3.y - p1.y) / 6;

      d += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
    }
    return d;
  };

  const linePath = generateSmoothPath(coords);
  const areaPath =
    coords.length > 0
      ? `${linePath} L ${coords[coords.length - 1].x} ${
          paddingTop + chartHeight
        } L ${coords[0].x} ${paddingTop + chartHeight} Z`
      : "";

  const activeIdx = hoveredIndex ?? (points.length > 0 ? points.length - 1 : null);
  const activePoint = activeIdx !== null ? points[activeIdx] : null;
  const activeCoord = activeIdx !== null ? coords[activeIdx] : null;

  return (
    <div className="flex h-full flex-col justify-between rounded-2xl border border-[#16233b] bg-[#0b1222]/90 p-5 shadow-sm">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-white">Prompt Strength Trend</h3>
        <div className="flex items-center gap-2 text-xs">
          <span className="text-slate-400">
            Average Strength:{" "}
            <strong className="font-bold text-white">
              {avgScore !== null ? `${avgScore}/100` : "--/100"}
            </strong>
          </span>
          {points.length > 0 && (
            <span
              className={`flex items-center font-semibold ${
                isPositiveChange ? "text-emerald-400" : "text-amber-400"
              }`}
            >
              <ArrowUpRight className="size-3.5 stroke-[2.5]" />
              {changeStr}
            </span>
          )}
        </div>
      </div>

      {/* Chart Body */}
      {points.length === 0 ? (
        <div className="flex h-[190px] flex-col items-center justify-center text-center p-6">
          <div className="grid size-10 place-items-center rounded-xl bg-blue-500/10 text-blue-400 ring-1 ring-blue-500/20 mb-2">
            <TrendingUp className="size-5" />
          </div>
          <span className="text-xs font-medium text-slate-300">
            No score trends in this date range
          </span>
          <span className="text-[11px] text-slate-500 mt-0.5">
            Create or evaluate prompts to track quality changes over time.
          </span>
        </div>
      ) : (
        <div className="relative mt-4 w-full">
          {/* Tooltip Popup directly above active point */}
          {activeCoord && activePoint && (
            <div
              className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full transition-all duration-150"
              style={{
                left: `${(activeCoord.x / width) * 100}%`,
                top: `${(activeCoord.y / height) * 100 - 8}%`,
              }}
            >
              <div className="flex flex-col items-center rounded-lg border border-[#1e2e4a] bg-[#080d19]/95 px-2.5 py-1 shadow-xl backdrop-blur-md">
                <span className="text-xs font-bold text-white">{activePoint.score}/100</span>
                <span className="text-[10px] text-slate-400">{activePoint.date}</span>
                <div className="absolute -bottom-1 size-2 rotate-45 border-b border-r border-[#1e2e4a] bg-[#080d19]" />
              </div>
            </div>
          )}

          <svg
            viewBox={`0 0 ${width} ${height}`}
            className="w-full overflow-visible"
            style={{ height: "190px" }}
          >
            <defs>
              <linearGradient id="trendGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.32" />
                <stop offset="60%" stopColor="#2563eb" stopOpacity="0.08" />
                <stop offset="100%" stopColor="#1d4ed8" stopOpacity="0.0" />
              </linearGradient>
              <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
            </defs>

            {/* Horizontal Gridlines & Y-Axis Labels */}
            {[100, 75, 50, 25, 0].map((val) => {
              const yPos = getY(val);
              return (
                <g key={val}>
                  <text
                    x={paddingLeft - 8}
                    y={yPos + 3}
                    textAnchor="end"
                    className="fill-slate-400 text-[10px] font-medium"
                  >
                    {val}
                  </text>
                  <line
                    x1={paddingLeft}
                    y1={yPos}
                    x2={width - paddingRight}
                    y2={yPos}
                    stroke="#16233b"
                    strokeWidth="1"
                    strokeDasharray={val === 0 ? "none" : "2 3"}
                  />
                </g>
              );
            })}

            {/* Area Fill */}
            {areaPath && (
              <path d={areaPath} fill="url(#trendGradient)" className="animate-chart-reveal" />
            )}

            {/* Trend Stroke Line */}
            {linePath && (
              <path
                d={linePath}
                fill="none"
                stroke="#3b82f6"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                filter="url(#glow)"
                className="animate-chart-reveal"
              />
            )}

            {/* Vertical guideline for active hovered point */}
            {activeCoord && (
              <line
                x1={activeCoord.x}
                y1={paddingTop}
                x2={activeCoord.x}
                y2={paddingTop + chartHeight}
                stroke="#3b82f6"
                strokeWidth="1"
                strokeDasharray="3 3"
                opacity="0.4"
              />
            )}

            {/* Data Points and Interaction Circles */}
            {coords.map((pt, i) => {
              const isHovered = i === activeIdx;
              return (
                <g
                  key={`${points[i].date}-${i}`}
                  className="cursor-pointer"
                  onMouseEnter={() => setHoveredIndex(i)}
                  onMouseLeave={() => setHoveredIndex(null)}
                >
                  <circle cx={pt.x} cy={pt.y} r={14} fill="transparent" />

                  {isHovered && (
                    <circle
                      cx={pt.x}
                      cy={pt.y}
                      r={7}
                      fill="#3b82f6"
                      fillOpacity="0.25"
                      stroke="#60a5fa"
                      strokeWidth="1.5"
                    />
                  )}

                  <circle
                    cx={pt.x}
                    cy={pt.y}
                    r={isHovered ? 4.5 : 3}
                    fill={isHovered ? "#60a5fa" : "#3b82f6"}
                    stroke="#080d19"
                    strokeWidth="2"
                  />

                  <text
                    x={pt.x}
                    y={height - 6}
                    textAnchor="middle"
                    className={`text-[10px] font-medium transition-colors ${
                      isHovered ? "fill-white font-semibold" : "fill-slate-400"
                    }`}
                  >
                    {points[i].date}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>
      )}
    </div>
  );
}
