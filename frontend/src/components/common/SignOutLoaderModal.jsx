import { LogOut, ShieldCheck } from "lucide-react";

export default function SignOutLoaderModal({ isOpen }) {
  if (!isOpen) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
    >
      <div
        className="relative w-full max-w-sm rounded-3xl border border-[#1f2e4d] bg-[#0c1322]/95 p-8 text-center shadow-2xl shadow-black/90 backdrop-blur-xl animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Ambient background glow */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-3xl">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 size-40 bg-blue-600/15 blur-3xl rounded-full" />
        </div>

        {/* Animated Spinner & Icon */}
        <div className="relative mx-auto mb-5 flex size-20 items-center justify-center">
          {/* Outer glowing pulsating ring */}
          <div className="absolute inset-0 rounded-full bg-blue-500/10 blur-md animate-pulse" />

          {/* Rotating gradient ring */}
          <div className="size-20 rounded-full border-4 border-slate-800/80 border-t-blue-500 border-r-indigo-500 animate-spin" />

          {/* Inner badge */}
          <div className="absolute grid size-12 place-items-center rounded-2xl bg-gradient-to-br from-blue-600/20 to-indigo-600/20 border border-blue-500/30 text-blue-400 shadow-inner">
            <LogOut className="size-5 animate-pulse" />
          </div>
        </div>

        {/* Text */}
        <h3 className="text-lg font-bold text-white tracking-tight">
          Signing you out...
        </h3>
        <p className="text-xs text-slate-400 mt-2 leading-relaxed">
          Safely clearing your session and redirecting you to the sign-in page.
        </p>

        {/* Security badge pill */}
        <div className="mt-5 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-900/80 border border-slate-800 text-[11px] font-medium text-slate-400">
          <ShieldCheck className="size-3.5 text-emerald-400" />
          <span>Session secured</span>
        </div>
      </div>
    </div>
  );
}
