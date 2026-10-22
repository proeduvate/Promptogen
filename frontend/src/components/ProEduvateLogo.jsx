export default function ProEduvateLogo({ size = "default", className = "" }) {
  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      {/* Faceted Origami / Supersonic Rocket Mark */}
      <svg
        viewBox="0 0 44 44"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="size-9 shrink-0 drop-shadow-[0_0_12px_rgba(59,130,246,0.6)]"
      >
        <path
          d="M6 18L38 4L24 38L19 23L6 18Z"
          fill="url(#origami-main)"
        />
        <path
          d="M38 4L19 23L24 38L38 4Z"
          fill="url(#origami-facet-1)"
        />
        <path
          d="M6 18L19 23L14 31L6 18Z"
          fill="url(#origami-facet-2)"
        />
        <path
          d="M19 23L24 38L21 28L19 23Z"
          fill="#1d4ed8"
          opacity="0.9"
        />
        <defs>
          <linearGradient id="origami-main" x1="6" y1="4" x2="38" y2="38" gradientUnits="userSpaceOnUse">
            <stop stopColor="#38bdf8" />
            <stop offset="0.5" stopColor="#3b82f6" />
            <stop offset="1" stopColor="#1d4ed8" />
          </linearGradient>
          <linearGradient id="origami-facet-1" x1="19" y1="4" x2="38" y2="38" gradientUnits="userSpaceOnUse">
            <stop stopColor="#60a5fa" />
            <stop offset="1" stopColor="#2563eb" />
          </linearGradient>
          <linearGradient id="origami-facet-2" x1="6" y1="18" x2="19" y2="31" gradientUnits="userSpaceOnUse">
            <stop stopColor="#1e40af" />
            <stop offset="1" stopColor="#1e3a8a" />
          </linearGradient>
        </defs>
      </svg>

      <div className="leading-tight">
        <div className="text-[20px] font-bold tracking-tight text-white">
          Pro<span className="text-[#3b82f6]">Eduvate</span>
        </div>
        <div className="text-[10px] tracking-wide text-slate-400 font-normal">
          people, projects and potential
        </div>
      </div>
    </div>
  );
}
