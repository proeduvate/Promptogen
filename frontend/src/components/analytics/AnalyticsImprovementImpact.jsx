import { ArrowUpRight, Sparkles, RefreshCw } from "lucide-react";

export default function AnalyticsImprovementImpact({
  avgIncrease = "0%",
  improvedPercent = "0%",
  avgVersions = "0.0",
}) {
  return (
    <div className="flex h-full flex-col justify-between rounded-2xl border border-[#16233b] bg-[#0b1222]/90 p-5 shadow-sm">
      <h3 className="text-sm font-semibold text-white">Improvement Impact</h3>

      <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Metric 1: Avg Strength Increase */}
        <div className="flex flex-col justify-between rounded-xl border border-[#18263f] bg-[#0a1120] p-3.5">
          <div className="grid size-9 place-items-center rounded-lg border border-emerald-500/20 bg-emerald-500/10 text-emerald-400">
            <ArrowUpRight className="size-4 stroke-[2.5]" />
          </div>
          <div className="mt-3">
            <div className="text-xl font-bold tracking-tight text-emerald-400">{avgIncrease}</div>
            <div className="mt-0.5 text-xs font-medium text-slate-200">Avg. Strength Increase</div>
            <div className="text-[11px] text-slate-400">After improvements</div>
          </div>
        </div>

        {/* Metric 2: Prompts Improved */}
        <div className="flex flex-col justify-between rounded-xl border border-[#18263f] bg-[#0a1120] p-3.5">
          <div className="grid size-9 place-items-center rounded-lg border border-cyan-500/20 bg-cyan-500/10 text-cyan-400">
            <Sparkles className="size-4" />
          </div>
          <div className="mt-3">
            <div className="text-xl font-bold tracking-tight text-cyan-400">{improvedPercent}</div>
            <div className="mt-0.5 text-xs font-medium text-slate-200">Prompts Improved</div>
            <div className="text-[11px] text-slate-400">At least once</div>
          </div>
        </div>

        {/* Metric 3: Avg Versions */}
        <div className="flex flex-col justify-between rounded-xl border border-[#18263f] bg-[#0a1120] p-3.5">
          <div className="grid size-9 place-items-center rounded-lg border border-purple-500/20 bg-purple-500/10 text-purple-400">
            <RefreshCw className="size-4" />
          </div>
          <div className="mt-3">
            <div className="text-xl font-bold tracking-tight text-white">{avgVersions}</div>
            <div className="mt-0.5 text-xs font-medium text-slate-200">Avg. Versions</div>
            <div className="text-[11px] text-slate-400">Per prompt</div>
          </div>
        </div>
      </div>
    </div>
  );
}
