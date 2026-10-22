import { Sparkles, Calendar, Clock, MessageSquare, Cpu } from "lucide-react";

export default function PromptDetailsPanel({
  modelName = "GPT-4o (Recommended)",
  createdAt = "May 26, 2025 10:24 AM",
  updatedAt = "May 26, 2025 10:27 AM",
  messagesCount = "8 (4 Questions + 1 Prompt)",
}) {
  return (
    <div className="rounded-2xl border border-[#172339] bg-[#0a101d]/90 p-4 shadow-lg backdrop-blur-md">
      <div className="flex items-center gap-2 pb-3 text-[13px] font-semibold text-slate-200">
        <Sparkles className="size-4 text-blue-400" />
        <span>Prompt Details</span>
      </div>

      <div className="space-y-3 text-[12px]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-slate-400">
            <Cpu className="size-3.5" />
            <span>Model</span>
          </div>
          <span className="font-medium text-slate-200">{modelName}</span>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-slate-400">
            <Calendar className="size-3.5" />
            <span>Created At</span>
          </div>
          <span className="text-slate-300">{createdAt}</span>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-slate-400">
            <Clock className="size-3.5" />
            <span>Updated At</span>
          </div>
          <span className="text-slate-300">{updatedAt}</span>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-slate-400">
            <MessageSquare className="size-3.5" />
            <span>Messages</span>
          </div>
          <span className="text-slate-300">{messagesCount}</span>
        </div>
      </div>
    </div>
  );
}
