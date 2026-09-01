export default function Logo({ className = "h-8 w-8" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 200 170"
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="VeloQuest logo"
    >
      <defs>
        <linearGradient
          id="veloquest-logo-gradient"
          x1="190"
          y1="10"
          x2="30"
          y2="160"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor="#f2a865" />
          <stop offset="55%" stopColor="#c9702f" />
          <stop offset="100%" stopColor="#6b3416" />
        </linearGradient>
      </defs>

      <g
        stroke="url(#veloquest-logo-gradient)"
        strokeWidth="9"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="55" cy="115" r="34" />
        <circle cx="145" cy="115" r="34" />

        <path d="M72,40 L100,95 M72,40 L150,50 M100,95 L150,50 M72,40 L55,115 M100,95 L55,115 M150,50 L145,115" />

        <path d="M150,50 C145,38 158,32 168,38 C174,42 170,50 162,48" />

        <path d="M170,140 L188,158" />
      </g>

      <path
        d="M58,36 L88,36 L80,44 L64,44 Z"
        fill="url(#veloquest-logo-gradient)"
        stroke="none"
      />
    </svg>
  );
}
