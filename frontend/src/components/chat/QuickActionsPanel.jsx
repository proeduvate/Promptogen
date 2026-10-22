import { Sparkles, FastForward, LayoutTemplate, UserCheck, ChevronRight } from "lucide-react";

export default function QuickActionsPanel({
  onSkipQuestions,
  onUseTemplate,
  onAddContext,
}) {
  return (
    <div className="rounded-2xl border border-[#172339] bg-[#0a101d]/90 p-4 shadow-lg backdrop-blur-md">
      <div className="flex items-center gap-2 pb-2.5 text-[13px] font-semibold text-slate-200">
        <Sparkles className="size-4 text-blue-400" />
        <span>Quick Actions</span>
      </div>

      <div className="space-y-1.5">
        <button
          type="button"
          onClick={onSkipQuestions}
          className="group flex w-full items-center justify-between rounded-xl border border-transparent bg-transparent px-3 py-2 text-left text-[12px] font-medium text-slate-300 transition-colors hover:border-[#1b2740] hover:bg-[#0c1426] hover:text-white"
        >
          <div className="flex items-center gap-2.5">
            <FastForward className="size-3.5 text-slate-400 group-hover:text-blue-400" />
            <span>Skip Questions</span>
          </div>
          <ChevronRight className="size-3.5 text-slate-500 group-hover:text-slate-300" />
        </button>

        <button
          type="button"
          onClick={onUseTemplate}
          className="group flex w-full items-center justify-between rounded-xl border border-transparent bg-transparent px-3 py-2 text-left text-[12px] font-medium text-slate-300 transition-colors hover:border-[#1b2740] hover:bg-[#0c1426] hover:text-white"
        >
          <div className="flex items-center gap-2.5">
            <LayoutTemplate className="size-3.5 text-slate-400 group-hover:text-blue-400" />
            <span>Use a Template</span>
          </div>
          <ChevronRight className="size-3.5 text-slate-500 group-hover:text-slate-300" />
        </button>

        <button
          type="button"
          onClick={onAddContext}
          className="group flex w-full items-center justify-between rounded-xl border border-transparent bg-transparent px-3 py-2 text-left text-[12px] font-medium text-slate-300 transition-colors hover:border-[#1b2740] hover:bg-[#0c1426] hover:text-white"
        >
          <div className="flex items-center gap-2.5">
            <UserCheck className="size-3.5 text-slate-400 group-hover:text-blue-400" />
            <span>Add Context Profile</span>
          </div>
          <ChevronRight className="size-3.5 text-slate-500 group-hover:text-slate-300" />
        </button>
      </div>
    </div>
  );
}
