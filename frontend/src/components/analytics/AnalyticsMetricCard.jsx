import { MessageSquare, Play, BarChart2, Clock, ArrowUpRight } from "lucide-react";

const ICON_MAP = {
  message: MessageSquare,
  play: Play,
  chart: BarChart2,
  clock: Clock,
};

export default function AnalyticsMetricCard({
  title,
  value,
  change,
  vs = "vs previous 30 days",
  icon = "message",
}) {
  const IconComponent = ICON_MAP[icon] || BarChart2;

  return (
    <div className="relative flex flex-col justify-between rounded-2xl border border-[#16233b] bg-[#0b1222]/90 p-5 shadow-sm transition-all duration-300 hover:border-blue-500/40 hover:bg-[#0c1427] hover:scale-[1.01] hover:shadow-lg hover:shadow-blue-500/10">
      <div className="flex items-start justify-between">
        <div className="grid size-11 place-items-center rounded-xl border border-blue-500/20 bg-blue-600/10 text-blue-400">
          <IconComponent className={`size-5 ${icon === "play" ? "fill-blue-400" : ""}`} />
        </div>
      </div>

      <div className="mt-4">
        <div className="text-3xl font-bold tracking-tight text-white">{value}</div>
        <div className="mt-0.5 text-xs font-medium text-slate-400">{title}</div>
      </div>

      <div className="mt-3.5 flex items-center gap-1.5 text-xs">
        <span className="flex items-center gap-0.5 font-semibold text-emerald-400">
          <ArrowUpRight className="size-3.5 stroke-[2.5]" />
          {change}
        </span>
        <span className="text-slate-400">{vs}</span>
      </div>
    </div>
  );
}
