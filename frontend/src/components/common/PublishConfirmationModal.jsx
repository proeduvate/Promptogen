import { useState } from "react";
import { X, Bookmark, Sparkles, Check, Loader2, Folder, Tag, AlertCircle } from "lucide-react";

const CATEGORIES = [
  "Marketing",
  "Engineering",
  "Strategy",
  "Content & Writing",
  "Business",
  "Education",
  "General",
];

export default function PublishConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  promptTitle = "Structured Prompt",
  promptScore = 92,
  initialCategory = "General",
}) {
  const [category, setCategory] = useState(initialCategory || "General");
  const [tagInput, setTagInput] = useState("Generated, AI Scored");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);

  if (!isOpen) return null;

  const handlePublish = async () => {
    setIsSubmitting(true);
    setError(null);
    try {
      const tags = tagInput
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);

      await onConfirm({
        category: category.toLowerCase(),
        tags,
      });
      onClose();
    } catch (err) {
      setError(err.message || "Failed to publish prompt to library.");
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-black/70 backdrop-blur-md transition-opacity"
      />

      {/* Modal Dialog */}
      <div className="relative w-full max-w-lg rounded-3xl border border-[#1d2a45] bg-[#09101d] p-6 shadow-2xl backdrop-blur-2xl text-slate-100 z-10 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 pb-4 border-b border-[#172339]">
          <div className="flex items-center gap-3">
            <div className="grid size-10 place-items-center rounded-2xl bg-blue-600/15 border border-blue-500/30 text-blue-400">
              <Bookmark className="size-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white tracking-tight">
                Publish to Prompt Library
              </h3>
              <p className="text-xs text-slate-400">
                Make your optimized prompt discoverable and reusable.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="grid size-8 place-items-center rounded-xl border border-transparent text-slate-400 hover:border-[#1b2740] hover:bg-[#0c1426] hover:text-white transition-colors"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Body Details */}
        <div className="mt-5 space-y-4 text-xs">
          {error && (
            <div className="flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-red-300">
              <AlertCircle className="size-4 shrink-0 text-red-400" />
              <span>{error}</span>
            </div>
          )}

          {/* Prompt Preview Card */}
          <div className="rounded-2xl border border-[#16243d] bg-[#0c1527] p-4 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                Target Prompt
              </span>
              <h4 className="mt-0.5 truncate text-sm font-bold text-white">
                {promptTitle}
              </h4>
            </div>

            <div className="shrink-0 flex items-center gap-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 text-emerald-400 font-semibold text-xs">
              <Sparkles className="size-3.5" />
              <span>{promptScore}/100</span>
            </div>
          </div>

          {/* Category Selector */}
          <div>
            <label className="block font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
              <Folder className="size-3.5 text-blue-400" />
              <span>Category / Domain</span>
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full rounded-xl border border-[#1b2844] bg-[#070d18] px-3.5 py-2.5 text-xs text-slate-200 outline-none transition-colors focus:border-blue-500"
            >
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          {/* Tags */}
          <div>
            <label className="block font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
              <Tag className="size-3.5 text-blue-400" />
              <span>Tags (comma-separated)</span>
            </label>
            <input
              type="text"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              placeholder="e.g. Architecture, Strategy, SaaS, Production"
              className="w-full rounded-xl border border-[#1b2844] bg-[#070d18] px-3.5 py-2 text-xs text-slate-200 placeholder:text-slate-500 outline-none transition-colors focus:border-blue-500"
            />
          </div>

          <div className="rounded-xl border border-[#19263f] bg-[#070d18]/60 p-3 text-[11px] text-slate-400 leading-relaxed">
            💡 Once published, this prompt will be tagged as verified and saved into your library collection where it can be searched, copied, and shared.
          </div>
        </div>

        {/* Footer Actions */}
        <div className="mt-6 flex items-center justify-end gap-3 pt-4 border-t border-[#172339]">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="rounded-xl border border-[#1b2740] bg-[#0c1426] px-4 py-2 text-xs font-medium text-slate-300 hover:text-white hover:bg-[#121c33] transition-colors"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handlePublish}
            disabled={isSubmitting}
            className="flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2 text-xs font-semibold text-white shadow-lg shadow-blue-600/30 hover:bg-blue-500 active:scale-95 transition-all disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="size-3.5 animate-spin" />
                <span>Publishing...</span>
              </>
            ) : (
              <>
                <Check className="size-3.5 stroke-[2.5]" />
                <span>Confirm & Publish</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
