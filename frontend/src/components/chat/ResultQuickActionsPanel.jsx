import { useState } from "react";
import { Sparkles, RefreshCw, CopyPlus, Bookmark, Download, ChevronDown, Check, BarChart2, ArrowRight } from "lucide-react";

export default function ResultQuickActionsPanel({
  onRegenerate,
  onCreateVersion,
  onSaveToLibrary,
  onExport,
  onViewAnalytics,
  isSaved = false,
  disabled = false,
}) {
  const [exportOpen, setExportOpen] = useState(false);

  return (
    <div className="relative rounded-2xl border border-[#172339] bg-[#0a101d]/90 p-4 shadow-lg backdrop-blur-md">
      <div className="flex items-center gap-2 pb-2.5 text-[13px] font-semibold text-slate-200">
        <Sparkles className="size-4 text-blue-400" />
        <span>Quick Actions</span>
      </div>

      <div className="space-y-1.5 text-[12px]">
        {/* Regenerate Prompt */}
        <button
          type="button"
          onClick={onRegenerate}
          disabled={disabled}
          className="group flex w-full items-center gap-2.5 rounded-xl border border-transparent px-3 py-2 text-left font-medium text-slate-300 transition-colors hover:border-[#1b2740] hover:bg-[#0c1426] hover:text-white disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:border-transparent disabled:hover:bg-transparent disabled:hover:text-slate-300"
        >
          <RefreshCw className="size-3.5 text-slate-400 group-hover:text-blue-400 transition-transform group-hover:rotate-180 duration-500" />
          <span>Regenerate Prompt</span>
        </button>

        {/* Create a New Version */}
        <button
          type="button"
          onClick={onCreateVersion}
          disabled={disabled}
          className="group flex w-full items-center gap-2.5 rounded-xl border border-transparent px-3 py-2 text-left font-medium text-slate-300 transition-colors hover:border-[#1b2740] hover:bg-[#0c1426] hover:text-white disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:border-transparent disabled:hover:bg-transparent disabled:hover:text-slate-300"
        >
          <CopyPlus className="size-3.5 text-slate-400 group-hover:text-blue-400" />
          <span>Create a New Version</span>
        </button>

        {/* View Detailed Analytics */}
        <button
          type="button"
          onClick={onViewAnalytics}
          disabled={disabled}
          className="group flex w-full items-center justify-between rounded-xl border border-transparent px-3 py-2 text-left font-medium text-slate-300 transition-colors hover:border-[#1b2740] hover:bg-[#0c1426] hover:text-white disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:border-transparent disabled:hover:bg-transparent disabled:hover:text-slate-300"
        >
          <div className="flex items-center gap-2.5">
            <BarChart2 className="size-3.5 text-blue-400 group-hover:scale-110 transition-transform" />
            <span>View Detailed Analytics</span>
          </div>
          <ArrowRight className="size-3 text-slate-500 group-hover:text-slate-300" />
        </button>

        {/* Publish to Library Provision */}
        <button
          type="button"
          onClick={onSaveToLibrary}
          disabled={disabled || isSaved}
          className={`group flex w-full items-center justify-between rounded-xl border border-transparent px-3 py-2 text-left font-medium transition-colors ${
            isSaved
              ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/20 cursor-default"
              : disabled
                ? "text-slate-300 opacity-40 cursor-not-allowed"
                : "text-slate-300 hover:border-[#1b2740] hover:bg-[#0c1426] hover:text-white"
          }`}
        >
          <div className="flex items-center gap-2.5">
            <Bookmark className={`size-3.5 ${isSaved ? "text-emerald-400" : "text-slate-400 group-hover:text-blue-400"}`} />
            <span className={isSaved ? "text-emerald-300" : ""}>
              {isSaved ? "Published to Library" : "Publish to Library"}
            </span>
          </div>
          {isSaved && <Check className="size-3.5 text-emerald-400" />}
        </button>

        {/* Export Dropdown */}
        <div className="relative">
          <button
            type="button"
            disabled={disabled}
            onClick={() => !disabled && setExportOpen(!exportOpen)}
            className="group flex w-full items-center justify-between rounded-xl border border-transparent px-3 py-2 text-left font-medium text-slate-300 transition-colors hover:border-[#1b2740] hover:bg-[#0c1426] hover:text-white disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:border-transparent disabled:hover:bg-transparent disabled:hover:text-slate-300"
          >
            <div className="flex items-center gap-2.5">
              <Download className="size-3.5 text-slate-400 group-hover:text-blue-400" />
              <span>Export</span>
            </div>
            <ChevronDown className="size-3 text-slate-500 group-hover:text-slate-300" />
          </button>

          {exportOpen && (
            <div className="absolute left-0 right-0 top-full mt-1 z-30 rounded-xl border border-[#1b2740] bg-[#0c1322] p-1.5 shadow-xl backdrop-blur-xl">
              <button
                type="button"
                onClick={() => {
                  onExport?.("markdown");
                  setExportOpen(false);
                }}
                className="flex w-full items-center px-3 py-1.5 text-left text-[12px] text-slate-300 hover:bg-white/5 hover:text-white rounded-lg"
              >
                Markdown (.md)
              </button>
              <button
                type="button"
                onClick={() => {
                  onExport?.("json");
                  setExportOpen(false);
                }}
                className="flex w-full items-center px-3 py-1.5 text-left text-[12px] text-slate-300 hover:bg-white/5 hover:text-white rounded-lg"
              >
                JSON (.json)
              </button>
              <button
                type="button"
                onClick={() => {
                  onExport?.("text");
                  setExportOpen(false);
                }}
                className="flex w-full items-center px-3 py-1.5 text-left text-[12px] text-slate-300 hover:bg-white/5 hover:text-white rounded-lg"
              >
                Plain Text (.txt)
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
