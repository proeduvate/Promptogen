import { AlertTriangle, X, RefreshCw, Key } from "lucide-react";

export default function ErrorMessageBanner({
  error,
  onRetry,
  onDismiss,
  onOpenSettings,
  className = "",
}) {
  if (!error) return null;

  const errorMessage =
    typeof error === "string"
      ? error
      : error.message || error.detail || "An unexpected error occurred.";

  const isApiKeyIssue =
    errorMessage.toLowerCase().includes("api key") ||
    errorMessage.toLowerCase().includes("api_key") ||
    errorMessage.toLowerCase().includes("gemini");

  return (
    <div
      role="alert"
      className={`relative flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-rose-500/40 bg-rose-950/30 p-4 text-slate-200 shadow-lg shadow-rose-950/20 backdrop-blur-md animate-in fade-in slide-in-from-top-2 duration-200 ${className}`}
    >
      <div className="flex items-start gap-3 min-w-0">
        <div className="grid size-8 shrink-0 place-items-center rounded-xl bg-rose-500/20 text-rose-400 ring-1 ring-rose-500/40 mt-0.5 sm:mt-0">
          <AlertTriangle className="size-4" />
        </div>
        <div className="min-w-0">
          <h4 className="text-[13px] font-bold text-rose-300">
            {isApiKeyIssue ? "AI Service Configuration Error" : "Request Failed"}
          </h4>
          <p className="mt-0.5 text-[12px] leading-relaxed text-slate-300 break-words font-mono select-text">
            {errorMessage}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
        {isApiKeyIssue && onOpenSettings && (
          <button
            type="button"
            onClick={onOpenSettings}
            className="flex items-center gap-1.5 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-1.5 text-[11.5px] font-semibold text-amber-300 hover:bg-amber-500/20 transition-all"
          >
            <Key className="size-3.5" />
            <span>Set Gemini Key</span>
          </button>
        )}

        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="flex items-center gap-1.5 rounded-xl bg-rose-600/80 hover:bg-rose-600 px-3 py-1.5 text-[11.5px] font-semibold text-white shadow transition-all"
          >
            <RefreshCw className="size-3.5" />
            <span>Retry</span>
          </button>
        )}

        {onDismiss && (
          <button
            type="button"
            onClick={onDismiss}
            aria-label="Dismiss error"
            className="grid size-7 place-items-center rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="size-4" />
          </button>
        )}
      </div>
    </div>
  );
}
