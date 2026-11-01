import {
  FileText,
  Share2,
  Lightbulb,
  Calendar,
  Target,
  DollarSign,
  Bookmark,
} from "lucide-react";

export default function ExpectedOutputPanel({
  items = [
    { id: "strategy", label: "Complete marketing strategy", icon: FileText },
    { id: "channels", label: "Channel recommendations", icon: Share2 },
    { id: "content", label: "Content ideas and examples", icon: Lightbulb },
    { id: "timeline", label: "3-month execution plan", icon: Calendar },
    { id: "metrics", label: "Success metrics and KPIs", icon: Target },
    { id: "budget", label: "Budget recommendations", icon: DollarSign },
  ],
}) {
  return (
    <div className="rounded-2xl border border-[#172339] bg-[#0a101d]/90 p-4 shadow-lg backdrop-blur-md">
      <div className="flex items-center gap-2 pb-3 text-[13px] font-semibold text-slate-200">
        <Bookmark className="size-4 text-blue-400" />
        <span>Expected Output</span>
      </div>

      <ul className="space-y-2.5">
        {items.map(({ id, label, icon: Icon }) => (
          <li key={id} className="flex items-center gap-2.5 text-[12px] text-slate-300">
            <span className="grid size-5 place-items-center rounded-md bg-[#162138] text-slate-400 shrink-0">
              <Icon className="size-3" />
            </span>
            <span className="truncate">{label}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
