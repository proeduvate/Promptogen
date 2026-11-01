export default function AmbientWaves() {
  return (
    <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-44 overflow-hidden z-0">
      <svg
        viewBox="0 0 1440 260"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        preserveAspectRatio="none"
        className="absolute bottom-0 w-full h-full opacity-70"
      >
        <path
          d="M0,130 C320,60 520,200 840,110 C1140,30 1320,150 1440,90 L1440,260 L0,260 Z"
          fill="url(#wave-grad-1)"
        />
        <path
          d="M0,160 C360,90 620,220 960,140 C1200,80 1360,180 1440,130 L1440,260 L0,260 Z"
          fill="url(#wave-grad-2)"
          opacity="0.85"
        />
        <defs>
          <linearGradient id="wave-grad-1" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#1e3a8a" stopOpacity="0.4" />
            <stop offset="50%" stopColor="#0f2552" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#06122c" stopOpacity="0.6" />
          </linearGradient>
          <linearGradient id="wave-grad-2" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#2563eb" stopOpacity="0.25" />
            <stop offset="60%" stopColor="#0b1b3a" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#040916" stopOpacity="0.9" />
          </linearGradient>
        </defs>
      </svg>
    </div>
  );
}
