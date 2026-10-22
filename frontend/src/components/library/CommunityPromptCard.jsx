import {
  TrendingUp,
  BarChart2,
  Code2,
  Play,
  FileText,
  BookOpen,
  Database,
  ListChecks,
  Mail,
  Image as ImageIcon,
  GraduationCap,
  Heart,
  Megaphone,
  Star,
  Download,
  Bookmark,
} from "lucide-react";

const ICON_MAP = {
  BarChart2: BarChart2,
  TrendingUp: TrendingUp,
  Code2: Code2,
  Play: Play,
  FileText: FileText,
  BookOpen: BookOpen,
  Database: Database,
  ListChecks: ListChecks,
  Mail: Mail,
  Image: ImageIcon,
  GraduationCap: GraduationCap,
  Heart: Heart,
  Megaphone: Megaphone,
};

export default function CommunityPromptCard({
  prompt,
  isSelected,
  onSelect,
  onToggleBookmark,
  isBookmarked = false,
}) {
  const IconComponent = ICON_MAP[prompt.icon] || FileText;

  const radius = 14;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - (prompt.score || 85) / 100);

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onSelect(prompt)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect(prompt);
        }
      }}
      className={`group relative flex flex-col justify-between rounded-2xl border p-4 text-left transition-all cursor-pointer ${
        isSelected
          ? "border-blue-500 bg-[#0e1628] shadow-[0_0_25px_-5px_rgba(59,130,246,0.35)] ring-1 ring-blue-500/50"
          : "border-[#162138] bg-[#0a101d]/90 hover:border-blue-500/40 hover:bg-[#0c1426] hover:shadow-lg"
      }`}
    >
      <div>
        {/* Top Row: Icon on left, Score Ring Badge on right */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="grid size-10 place-items-center rounded-xl bg-blue-500/10 text-blue-400 ring-1 ring-blue-500/20 group-hover:bg-blue-500/20 transition-colors">
            <IconComponent className="size-5" />
          </div>

          {/* Circular Score Badge */}
          <div className="relative size-9 shrink-0">
            <svg viewBox="0 0 36 36" className="size-full -rotate-90">
              <circle
                cx="18"
                cy="18"
                r={radius}
                fill="none"
                stroke="#17243c"
                strokeWidth="3"
              />
              <circle
                cx="18"
                cy="18"
                r={radius}
                fill="none"
                stroke="#3b82f6"
                strokeWidth="3"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                className="transition-all duration-500"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center text-[11px] font-bold text-white">
              {prompt.score}
            </div>
          </div>
        </div>

        {/* Title */}
        <h3 className="line-clamp-1 text-[14.5px] font-bold text-white group-hover:text-blue-300 transition-colors">
          {prompt.title}
        </h3>

        {/* Description */}
        <p className="mt-1.5 line-clamp-2 text-[12px] leading-relaxed text-slate-400">
          {prompt.description}
        </p>

        {/* Tags */}
        <div className="mt-3 flex flex-wrap gap-1.5">
          {(prompt.tags || []).map((tag) => (
            <span
              key={tag}
              className="rounded-lg border border-blue-500/20 bg-blue-500/10 px-2 py-0.5 text-[10.5px] font-medium text-blue-300"
            >
              {tag}
            </span>
          ))}
        </div>
      </div>

      {/* Footer: Author, Rating, Uses, Bookmark */}
      <div className="mt-4 flex items-center justify-between border-t border-[#141e33] pt-3 text-[11px] text-slate-400">
        {/* Author */}
        <div className="flex items-center gap-1.5 min-w-0">
          <img
            src={
              prompt.author?.avatar ||
              "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80"
            }
            alt={prompt.author?.name || "Author"}
            className="size-4.5 rounded-full object-cover ring-1 ring-white/10"
          />
          <span className="truncate font-medium text-slate-300">
            {prompt.author?.name || "Promptogen"}
          </span>
        </div>

        {/* Rating, Uses, Bookmark */}
        <div className="flex items-center gap-2.5 shrink-0">
          <div className="flex items-center gap-1">
            <Star className="size-3 fill-amber-400 text-amber-400" />
            <span className="font-medium text-slate-300">{prompt.rating || 4.9}</span>
            <span className="text-slate-500">({prompt.reviewsCount || 1})</span>
          </div>

          <div className="flex items-center gap-1">
            <Download className="size-3 text-slate-500" />
            <span>{prompt.uses || "Active"}</span>
          </div>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggleBookmark?.(e);
            }}
            title={isBookmarked ? "Remove bookmark" : "Bookmark prompt"}
            className={`transition-colors p-0.5 ${
              isBookmarked ? "text-blue-400" : "text-slate-500 hover:text-blue-400"
            }`}
          >
            <Bookmark
              className={`size-3.5 ${
                isBookmarked ? "fill-blue-500 text-blue-500" : ""
              }`}
            />
          </button>
        </div>
      </div>
    </div>
  );
}
