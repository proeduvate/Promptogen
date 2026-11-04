import { useState } from "react";
import { PieChart } from "lucide-react";

export default function AnalyticsCategoryDonut({ categories = [], totalCount = 0 }) {
  const [activeCategory, setActiveCategory] = useState(null);

  const radius = 54;
  const strokeWidth = 14;
  const circumference = 2 * Math.PI * radius;
  const center = 75;

  const validCategories = (categories || []).filter((c) => c && c.count > 0);
  const actualTotal = totalCount || validCategories.reduce((s, c) => s + (c.count || 0), 0);

  // Compute stroke dash offsets for consecutive arcs
  let accumulatedPercent = 0;
  const segments = validCategories.map((cat, idx) => {
    const pct = actualTotal > 0 ? (cat.count / actualTotal) * 100 : (cat.percentage || 0);
    const strokeDasharray = `${(pct / 100) * circumference} ${circumference}`;
    const strokeDashoffset = -((accumulatedPercent / 100) * circumference);
    accumulatedPercent += pct;
    return {
      ...cat,
      id: cat.id || cat.name || String(idx),
      percentage: Math.round(pct),
      strokeDasharray,
      strokeDashoffset,
    };
  });

  return (
    <div className="flex h-full flex-col justify-between rounded-2xl border border-[#16233b] bg-[#0b1222]/90 p-5 shadow-sm">
      <h3 className="text-sm font-semibold text-white">Usage by Category</h3>

      {actualTotal === 0 ? (
        <div className="flex h-[170px] flex-col items-center justify-center text-center p-6">
          <div className="grid size-10 place-items-center rounded-xl bg-purple-500/10 text-purple-400 ring-1 ring-purple-500/20 mb-2">
            <PieChart className="size-5" />
          </div>
          <span className="text-xs font-medium text-slate-300">
            No category distribution yet
          </span>
          <span className="text-[11px] text-slate-500 mt-0.5">
            Your categorized prompt creations will appear here.
          </span>
        </div>
      ) : (
        <div className="mt-3 flex items-center justify-between gap-4">
          {/* Donut Chart SVG */}
          <div className="relative shrink-0">
            <svg
              width="150"
              height="150"
              viewBox="0 0 150 150"
              className="rotate-[-90deg] animate-donut-spin"
            >
              <circle
                cx={center}
                cy={center}
                r={radius}
                fill="transparent"
                stroke="#131e33"
                strokeWidth={strokeWidth}
              />

              {segments.map((seg) => {
                const isSelected = activeCategory === seg.id;
                return (
                  <circle
                    key={seg.id}
                    cx={center}
                    cy={center}
                    r={radius}
                    fill="transparent"
                    stroke={seg.color}
                    strokeWidth={isSelected ? strokeWidth + 3 : strokeWidth}
                    strokeDasharray={seg.strokeDasharray}
                    strokeDashoffset={seg.strokeDashoffset}
                    strokeLinecap="round"
                    className="cursor-pointer transition-all duration-200"
                    style={{
                      filter: isSelected ? `drop-shadow(0 0 6px ${seg.color})` : "none",
                    }}
                    onMouseEnter={() => setActiveCategory(seg.id)}
                    onMouseLeave={() => setActiveCategory(null)}
                  />
                );
              })}
            </svg>

            {/* Center text */}
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-2xl font-bold tracking-tight text-white">
                {activeCategory
                  ? segments.find((s) => s.id === activeCategory)?.count || actualTotal
                  : actualTotal}
              </span>
              <span className="text-[11px] font-medium text-slate-400">
                {activeCategory
                  ? segments.find((s) => s.id === activeCategory)?.name
                  : "Prompts"}
              </span>
            </div>
          </div>

          {/* Legend List */}
          <div className="flex flex-1 flex-col justify-center space-y-2">
            {segments.map((cat) => {
              const isSelected = activeCategory === cat.id;
              return (
                <div
                  key={cat.id}
                  onMouseEnter={() => setActiveCategory(cat.id)}
                  onMouseLeave={() => setActiveCategory(null)}
                  className={`flex cursor-pointer items-center justify-between text-xs transition-colors ${
                    isSelected ? "text-white font-medium" : "text-slate-300 hover:text-white"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span
                      className="size-2.5 rounded-full shrink-0 transition-transform"
                      style={{
                        backgroundColor: cat.color,
                        transform: isSelected ? "scale(1.25)" : "scale(1)",
                        boxShadow: isSelected ? `0 0 8px ${cat.color}` : "none",
                      }}
                    />
                    <span className="text-[12px]">{cat.name}</span>
                  </div>
                  <span className="text-[12px] font-medium text-slate-400">
                    {cat.percentage}%
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
