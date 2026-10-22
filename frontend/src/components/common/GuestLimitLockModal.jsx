import { Lock, Sparkles, CheckCircle2, ArrowRight, X } from "lucide-react";

export default function GuestLimitLockModal({
  isOpen,
  onClose,
  onNavigateLogin,
  onGoogleSignIn,
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-lg rounded-3xl border border-amber-500/30 bg-[#0c1322] p-7 shadow-2xl shadow-amber-500/10 text-left"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute right-5 top-5 rounded-full p-2 text-slate-400 hover:bg-white/5 hover:text-white transition-colors"
        >
          <X className="size-5" />
        </button>

        {/* Header Icon */}
        <div className="flex items-center gap-4 mb-4">
          <div className="grid size-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-amber-500/20 to-orange-500/10 border border-amber-500/30 text-amber-400">
            <Lock className="size-6" />
          </div>
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-semibold mb-1">
              Guest Daily Limit Reached (2/2)
            </div>
            <h3 className="text-xl font-bold text-white tracking-tight">
              Sign In to Continue Generating
            </h3>
          </div>
        </div>

        {/* Description */}
        <p className="text-sm text-slate-300 mb-5 leading-relaxed">
          You have used your 2 free prompt generations for today in guest mode.
          Log in or create a free account to unlock full unlimited access.
        </p>

        {/* Feature List */}
        <div className="space-y-2.5 rounded-2xl bg-[#070b14]/70 border border-[#1b2740] p-4 mb-6">
          <div className="flex items-start gap-2.5 text-xs text-slate-200">
            <CheckCircle2 className="size-4 shrink-0 text-emerald-400 mt-0.5" />
            <span><strong className="text-white">Unlimited prompt generations</strong> with no daily IP lock.</span>
          </div>
          <div className="flex items-start gap-2.5 text-xs text-slate-200">
            <CheckCircle2 className="size-4 shrink-0 text-emerald-400 mt-0.5" />
            <span><strong className="text-white">Auto-save to your library</strong> with tags, folders, and favorites.</span>
          </div>
          <div className="flex items-start gap-2.5 text-xs text-slate-200">
            <CheckCircle2 className="size-4 shrink-0 text-emerald-400 mt-0.5" />
            <span><strong className="text-white">Full prompt analytics</strong>, strength scoring, and radar metrics.</span>
          </div>
          <div className="flex items-start gap-2.5 text-xs text-slate-200">
            <CheckCircle2 className="size-4 shrink-0 text-emerald-400 mt-0.5" />
            <span><strong className="text-white">Persistent session cache</strong> — stay logged in until you choose to log out.</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col gap-2.5">
          <button
            type="button"
            onClick={() => {
              onClose();
              onNavigateLogin?.();
            }}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-500/25 transition-all hover:brightness-110 hover:shadow-blue-500/35"
          >
            <span>Log In or Create Account</span>
            <ArrowRight className="size-4" />
          </button>

          <button
            type="button"
            onClick={() => {
              onClose();
              onGoogleSignIn?.();
            }}
            className="flex w-full items-center justify-center gap-2.5 rounded-xl border border-[#233554] bg-[#0f172a] px-5 py-2.5 text-sm font-semibold text-slate-200 hover:border-slate-500 hover:text-white transition-colors"
          >
            <svg className="size-4" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            <span>Quick Sign In with Google</span>
          </button>
        </div>
      </div>
    </div>
  );
}
