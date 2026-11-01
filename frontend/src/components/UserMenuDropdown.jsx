import { Settings, HelpCircle, Crown, LogOut } from "lucide-react";

export default function UserMenuDropdown({
  isOpen,
  onClose,
  user,
  onUpgrade,
  onSettings,
  onHelp,
  onSignOut,
}) {
  if (!isOpen || !user) return null;

  const displayName = user?.name || "Account";
  const displayEmail = user?.email || "";
  const initial = displayName.charAt(0).toUpperCase() || "A";

  return (
    <div className="absolute right-0 top-14 z-50 w-64 rounded-2xl border border-[#1b2740] bg-[#0c1322]/95 p-3 shadow-2xl shadow-black/80 backdrop-blur-xl animate-in fade-in zoom-in-95 duration-150">
      {/* Profile Header */}
      <div className="flex items-center gap-3 p-2">
        {user?.avatar_url ? (
          <img
            src={user.avatar_url}
            alt={displayName}
            className="size-10 shrink-0 rounded-xl object-cover ring-1 ring-white/10"
          />
        ) : (
          <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 text-[15px] font-semibold text-white ring-1 ring-white/10 shadow-sm">
            {initial}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="truncate text-[14px] font-semibold text-white">
            {displayName}
          </div>
          <div className="truncate text-[12px] text-slate-400">
            {displayEmail}
          </div>
        </div>
      </div>

      <div className="my-2 h-px bg-[#172339]" />

      {/* Menu Actions */}
      <div className="space-y-0.5">
        <button
          type="button"
          onClick={() => {
            onSettings?.();
            onClose();
          }}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-[13px] font-medium text-slate-300 transition-colors hover:bg-white/5 hover:text-white"
        >
          <Settings className="size-4 text-slate-400" />
          <span>Settings</span>
        </button>

        <button
          type="button"
          onClick={() => {
            onHelp?.();
            onClose();
          }}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-[13px] font-medium text-slate-300 transition-colors hover:bg-white/5 hover:text-white"
        >
          <HelpCircle className="size-4 text-slate-400" />
          <span>Help & Support</span>
        </button>

        <button
          type="button"
          onClick={() => {
            onUpgrade?.();
            onClose();
          }}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-[13px] font-semibold text-blue-400 transition-colors hover:bg-blue-500/10 hover:text-blue-300"
        >
          <Crown className="size-4 text-blue-400" />
          <span>Upgrade to Pro</span>
        </button>

        <button
          type="button"
          onClick={() => {
            onSignOut?.();
            onClose();
          }}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-[13px] font-medium text-slate-300 transition-colors hover:bg-red-500/10 hover:text-red-400"
        >
          <LogOut className="size-4 text-slate-400 group-hover:text-red-400" />
          <span>Sign Out</span>
        </button>
      </div>
    </div>
  );
}
