import { Home, Folder, BarChart3 } from "lucide-react";

export default function BottomNavDock({ active = "home", onNavigate }) {
  const items = [
    { id: "home", label: "Home", icon: Home },
    { id: "my-prompts", label: "Library", icon: Folder },
    { id: "analytics", label: "Analytics", icon: BarChart3 },
  ];

  return (
    <div className="fixed bottom-6 left-1/2 z-40 -translate-x-1/2">
      <nav className="flex items-center gap-1.5 rounded-2xl border border-blue-500/25 bg-[#0a101d]/90 p-1.5 shadow-[0_12px_40px_-8px_rgba(0,0,0,0.8),0_0_25px_-5px_rgba(37,99,235,0.25)] backdrop-blur-2xl">
        {items.map(({ id, label, icon: Icon }) => {
          const isActive =
            active === id ||
            ((id === "my-prompts" || id === "library") &&
              (active === "my-prompts" || active === "library"));
          return (
            <button
              key={id}
              type="button"
              onClick={() => onNavigate(id)}
              className={`flex items-center gap-2 rounded-xl px-5 py-2 text-[13px] font-medium transition-all ${
                isActive
                  ? "bg-[#2563eb] text-white shadow-md shadow-blue-600/30 font-semibold"
                  : "text-slate-400 hover:bg-white/5 hover:text-slate-200"
              }`}
            >
              <Icon className="size-4" />
              <span>{label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
