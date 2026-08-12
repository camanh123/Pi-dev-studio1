/**
 * Futuristic Pi hero artwork — CSS/SVG only.
 * Decorative: not an official Pi Network trademark asset.
 */

export function PiHeroArtwork({ className }: { className?: string }) {
  return (
    <div
      className={`pi-hero-art ${className ?? ''}`}
      aria-hidden="true"
      data-testid="pi-hero-artwork"
    >
      <div className="pi-hero-art__glow" />
      <div className="pi-hero-art__glow pi-hero-art__glow--gold" />

      <svg className="pi-hero-art__rings" viewBox="0 0 320 320" fill="none">
        <defs>
          <linearGradient id="pi-ring-a" x1="40" y1="40" x2="280" y2="280" gradientUnits="userSpaceOnUse">
            <stop stopColor="#9333EA" stopOpacity="0.9" />
            <stop offset="0.5" stopColor="#7C3AED" stopOpacity="0.35" />
            <stop offset="1" stopColor="#F5B942" stopOpacity="0.7" />
          </linearGradient>
          <linearGradient id="pi-ring-b" x1="280" y1="40" x2="40" y2="280" gradientUnits="userSpaceOnUse">
            <stop stopColor="#A78BFA" stopOpacity="0.55" />
            <stop offset="1" stopColor="#7C3AED" stopOpacity="0.15" />
          </linearGradient>
          <radialGradient id="pi-coin-face" cx="50%" cy="38%" r="60%">
            <stop offset="0%" stopColor="#2A1B4D" />
            <stop offset="55%" stopColor="#16122B" />
            <stop offset="100%" stopColor="#0B0813" />
          </radialGradient>
          <linearGradient id="pi-gold" x1="0" y1="0" x2="1" y2="1">
            <stop stopColor="#FBBF24" />
            <stop offset="1" stopColor="#F5B942" />
          </linearGradient>
          <filter id="pi-soft-glow" x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="6" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Outer orbital rings */}
        <ellipse
          cx="160"
          cy="160"
          rx="148"
          ry="148"
          stroke="url(#pi-ring-a)"
          strokeWidth="1.5"
          opacity="0.85"
          className="pi-hero-art__spin-slow"
        />
        <ellipse
          cx="160"
          cy="160"
          rx="128"
          ry="118"
          stroke="url(#pi-ring-b)"
          strokeWidth="1.2"
          strokeDasharray="6 10"
          opacity="0.7"
          className="pi-hero-art__spin-rev"
          transform="rotate(18 160 160)"
        />
        <ellipse
          cx="160"
          cy="160"
          rx="108"
          ry="102"
          stroke="#7C3AED"
          strokeWidth="1"
          opacity="0.35"
        />

        {/* Coin disc */}
        <circle cx="160" cy="160" r="78" fill="url(#pi-coin-face)" filter="url(#pi-soft-glow)" />
        <circle
          cx="160"
          cy="160"
          r="78"
          stroke="url(#pi-ring-a)"
          strokeWidth="2.5"
          fill="none"
        />
        <circle cx="160" cy="160" r="68" stroke="#F5B942" strokeOpacity="0.35" strokeWidth="1" />

        {/* Pi symbol */}
        <g filter="url(#pi-soft-glow)">
          <path
            d="M118 128h84"
            stroke="url(#pi-gold)"
            strokeWidth="10"
            strokeLinecap="round"
          />
          <path
            d="M140 128v72c0 10-6 18-16 18"
            stroke="url(#pi-gold)"
            strokeWidth="10"
            strokeLinecap="round"
            fill="none"
          />
          <path
            d="M180 128v72c0 14 10 22 22 18"
            stroke="url(#pi-gold)"
            strokeWidth="10"
            strokeLinecap="round"
            fill="none"
          />
        </g>

        {/* Accent nodes on rings */}
        <circle cx="160" cy="12" r="3.5" fill="#FBBF24" className="pi-hero-art__spin-slow" />
        <circle cx="300" cy="160" r="2.5" fill="#A78BFA" className="pi-hero-art__spin-rev" />
        <circle cx="48" cy="210" r="2" fill="#F5B942" opacity="0.8" />
      </svg>

      {/* Particles */}
      <span className="pi-hero-art__particle" style={{ top: '8%', left: '18%' }} />
      <span className="pi-hero-art__particle pi-hero-art__particle--gold" style={{ top: '22%', right: '10%' }} />
      <span className="pi-hero-art__particle" style={{ bottom: '18%', left: '8%' }} />
      <span className="pi-hero-art__particle pi-hero-art__particle--gold" style={{ bottom: '12%', right: '22%' }} />
      <span className="pi-hero-art__particle" style={{ top: '48%', left: '2%' }} />
      <span className="pi-hero-art__particle" style={{ top: '62%', right: '4%' }} />
    </div>
  );
}
