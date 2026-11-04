import { useState } from "react";
import { Cpu } from "lucide-react";

export default function AnalyticsModelBarChart({ models = [] }) {
  const [hoveredModel, setHoveredModel] = useState(null);

  const modelList = (models || []).filter((m) => m && m.count > 0 || m.percentage > 0);

  // Maximum percentage for scaling height
  const maxPercent = Math.max(50, ...modelList.map((m) => m.percentage || 0));

  return (
    <div className="flex h-full min-w-0 flex-col justify-between rounded-2xl border border-[#16233b] bg-[#0b1222]/90 p-5 shadow-sm overflow-hidden">
      <h3 className="text-sm font-semibold text-white">Model Usage</h3>

      {modelList.length === 0 ? (
        <div className="flex h-[155px] flex-col items-center justify-center text-center p-6">
          <div className="grid size-10 place-items-center rounded-xl bg-blue-500/10 text-blue-400 ring-1 ring-blue-500/20 mb-2">
            <Cpu className="size-5" />
          </div>
          <span className="text-xs font-medium text-slate-300">
            No model telemetry recorded yet
          </span>
          <span className="text-[11px] text-slate-500 mt-0.5">
            Your LLM model choices across prompt generations will be tracked here.
          </span>
        </div>
      ) : (
        <div className="mt-4 flex h-[155px] min-w-0 items-end justify-between gap-1.5 sm:gap-2.5 px-0.5 sm:px-2">
          {modelList.map((m, idx) => {
            const isHovered = hoveredModel === m.id;
            const pct = m.percentage || 0;
            const heightPercent = maxPercent > 0 ? (pct / maxPercent) * 100 : 0;

            return (
              <div
                key={m.id || m.name || idx}
                className="group flex flex-1 min-w-0 flex-col items-center justify-end h-full cursor-pointer"
                onMouseEnter={() => setHoveredModel(m.id || m.name)}
                onMouseLeave={() => setHoveredModel(null)}
              >
                {/* Percentage label above the bar */}
                <span
                  className={`mb-1.5 text-[10px] sm:text-[11px] font-semibold transition-colors ${
                    isHovered ? "text-white scale-110" : "text-slate-300"
                  }`}
                >
                  {pct}%
                </span>

                {/* The Vertical Bar */}
                <div className="relative w-full max-w-[34px] sm:max-w-[42px] flex-1 flex items-end">
                  <div
                    className="w-full rounded-t-md transition-all duration-300 animate-bar-grow"
                    style={{
                      height: `${Math.max(6, heightPercent)}%`,
                      animationDelay: `${idx * 75}ms`,
                      background: isHovered
                        ? "linear-gradient(to top, #1d4ed8, #3b82f6)"
                        : "linear-gradient(to top, #1e40af, #2563eb)",
                      boxShadow: isHovered ? "0 0 12px rgba(59, 130, 246, 0.5)" : "none",
                    }}
                  />
                </div>

                {/* X-axis Model label */}
                <span
                  className={`mt-2.5 text-[9.5px] sm:text-[10.5px] font-medium truncate max-w-full text-center transition-colors ${
                    isHovered ? "text-blue-400 font-semibold" : "text-slate-400"
                  }`}
                  title={m.name}
                >
                  {m.name}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
