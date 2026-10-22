import { useState, useEffect } from "react";
import {
  Zap,
  Lightbulb,
  Code2,
  FileText,
  GraduationCap,
  ArrowRight,
  Package,
  Sparkles,
  Cpu,
  RotateCw,
} from "lucide-react";
import { PROMPT_TEMPLATES } from "../data/promptTemplates";

const ICON_MAP = {
  Lightbulb,
  FileText,
  Code2,
  Cpu,
  Package,
  GraduationCap,
  Sparkles,
};

function getRandomTemplates(count = 4) {
  if (!PROMPT_TEMPLATES || PROMPT_TEMPLATES.length === 0) return [];
  const pool = [...PROMPT_TEMPLATES];
  // Fisher-Yates sample
  const selected = [];
  for (let i = 0; i < count && pool.length > 0; i++) {
    const idx = Math.floor(Math.random() * pool.length);
    selected.push(pool.splice(idx, 1)[0]);
  }
  return selected;
}

export default function ExampleCards({ onSelectExample, onViewAll }) {
  // Load 4 random prompt templates dynamically on each page mount
  const [items, setItems] = useState(() => getRandomTemplates(4));
  const [isRotating, setIsRotating] = useState(false);

  const handleShuffle = () => {
    setIsRotating(true);
    setItems(getRandomTemplates(4));
    setTimeout(() => setIsRotating(false), 400);
  };

  return (
    <div className="mt-8">
      {/* Header Row */}
      <div className="flex items-center justify-between pb-3.5">
        <div className="flex items-center gap-2.5 text-[14px] font-semibold text-slate-200">
          <Zap className="size-4 text-blue-400" />
          <span>Try these prompt templates</span>
          <button
            type="button"
            onClick={handleShuffle}
            title="Load different random templates"
            className="flex items-center gap-1 rounded-lg border border-[#1b2740] bg-[#0c1426] px-2 py-0.5 text-[11px] font-medium text-slate-400 hover:text-white hover:border-slate-500 transition-colors"
          >
            <RotateCw className={`size-3 ${isRotating ? "animate-spin" : ""}`} />
            <span>Shuffle</span>
          </button>
        </div>

        <button
          type="button"
          onClick={onViewAll}
          className="group flex items-center gap-1 text-[13px] font-medium text-blue-400 transition-colors hover:text-blue-300"
        >
          <span>View all library prompts</span>
          <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
        </button>
      </div>

      {/* Grid of 4 Random Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {items.map((item) => {
          const IconComponent = ICON_MAP[item.icon] || Sparkles;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelectExample(item.prompt)}
              className="group flex flex-col items-start rounded-2xl border border-[#162138] bg-[#0a101d]/80 p-4 text-left transition-all hover:border-blue-500/50 hover:bg-[#0f172a] hover:shadow-[0_0_20px_-5px_rgba(37,99,235,0.2)] active:scale-[0.99]"
            >
              <div className="mb-3 grid size-8 place-items-center rounded-xl bg-blue-500/10 text-blue-400 ring-1 ring-blue-500/20 group-hover:bg-blue-500/20 group-hover:text-blue-300 transition-colors">
                <IconComponent className="size-4" />
              </div>
              <div className="text-[13.5px] font-semibold text-slate-100 group-hover:text-white line-clamp-1">
                {item.title}
              </div>
              <div className="mt-1 text-[11px] font-medium text-blue-400/80 uppercase tracking-wider">
                {item.category}
              </div>
              <div className="mt-1 text-[12px] leading-relaxed text-slate-400 group-hover:text-slate-300 line-clamp-2">
                "{item.prompt}"
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
