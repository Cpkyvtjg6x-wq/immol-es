// Logo IMMORA — identique à la landing (cercle + axe X + courbe exponentielle verte)

export function BrandMark({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <defs>
        <clipPath id="brandmark-clip">
          <circle cx="12" cy="12" r="9.1" />
        </clipPath>
      </defs>
      <g clipPath="url(#brandmark-clip)">
        <path d="M 4 18 C 11 18 15 8 19 5" stroke="#4ade80" strokeWidth="1.55" strokeLinecap="butt" fill="none" />
        <line x1="2" y1="18" x2="22" y2="18" stroke="white" strokeWidth="1.8" strokeLinecap="butt" />
      </g>
      <circle cx="12" cy="12" r="10" stroke="white" strokeWidth="1.8" opacity="0.9" />
    </svg>
  )
}

export function BrandLogo({ size = 26, textSize = 18 }: { size?: number; textSize?: number }) {
  return (
    <span className="flex items-center gap-2.5">
      <BrandMark size={size} />
      <span className="select-none text-white" style={{ fontSize: textSize, fontWeight: 600, letterSpacing: '-0.035em' }}>
        Immora
      </span>
    </span>
  )
}
