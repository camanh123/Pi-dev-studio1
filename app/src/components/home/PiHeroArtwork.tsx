/**
 * Futuristic Pi hero artwork — CSS/SVG only.
 *
 * Center mark uses the publicly documented Pi Network π glyph geometry
 * (Simple Icons / Pi blockexplorer-derived path). Decorative coin chrome
 * around it is not an official trademark lockup.
 */

import { useId } from 'react';

/**
 * Pi Network π symbol path in a 24×24 viewBox (circle ring omitted —
 * we draw our own coin face). Source geometry: simple-icons/pinetwork.
 */
const PI_NETWORK_GLYPH =
  'M9.102 5.943c-.123 0-.227.1-.227.227v1.139c0 .122.1.226.227.226h1.56a.225.225 0 0 0 .227-.226v-1.14c0-.121-.1-.226-.227-.226h-1.56zm3.685 0c-.122 0-.226.1-.226.227v1.139c0 .122.1.226.226.226h1.559a.228.228 0 0 0 .226-.226v-1.14c0-.121-.1-.226-.226-.226h-1.559zm3.219 1.407v1.19H7.352c-1.895.026-1.975 2.042-1.975 2.042v1.461H7.43l.008-1.447h1.398v7.574c-.005.457.451.285.451.285l1.461-.516c.23-.099.186-.308.186-.308v-7.022h1.591v7.641c.014.357.366.213.366.213l1.591-.565c.14-.076.118-.195.118-.195l-.022-7.062 1.527-.04c1.909-.027 1.963-2.103 1.963-2.103V7.35h-2.062';

export function PiHeroArtwork({ className }: { className?: string }) {
  const uid = useId().replace(/:/g, '');
  const ids = {
    ringA: `pi-ring-a-${uid}`,
    ringB: `pi-ring-b-${uid}`,
    coinFace: `pi-coin-face-${uid}`,
    coinRim: `pi-coin-rim-${uid}`,
    coinHighlight: `pi-coin-hl-${uid}`,
    gold: `pi-gold-${uid}`,
    goldSheen: `pi-gold-sheen-${uid}`,
    softGlow: `pi-soft-glow-${uid}`,
    goldGlow: `pi-gold-glow-${uid}`,
    depthShadow: `pi-depth-${uid}`,
  };

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
          <linearGradient id={ids.ringA} x1="40" y1="40" x2="280" y2="280" gradientUnits="userSpaceOnUse">
            <stop stopColor="#9333EA" stopOpacity="0.9" />
            <stop offset="0.5" stopColor="#7C3AED" stopOpacity="0.35" />
            <stop offset="1" stopColor="#F5B942" stopOpacity="0.7" />
          </linearGradient>
          <linearGradient id={ids.ringB} x1="280" y1="40" x2="40" y2="280" gradientUnits="userSpaceOnUse">
            <stop stopColor="#A78BFA" stopOpacity="0.55" />
            <stop offset="1" stopColor="#7C3AED" stopOpacity="0.15" />
          </linearGradient>

          {/* 3D metallic coin face */}
          <radialGradient id={ids.coinFace} cx="38%" cy="30%" r="72%">
            <stop offset="0%" stopColor="#3B2A6B" />
            <stop offset="35%" stopColor="#1E1638" />
            <stop offset="72%" stopColor="#110C1F" />
            <stop offset="100%" stopColor="#07060D" />
          </radialGradient>
          <linearGradient id={ids.coinRim} x1="70" y1="70" x2="250" y2="250" gradientUnits="userSpaceOnUse">
            <stop stopColor="#F5D78E" stopOpacity="0.95" />
            <stop offset="0.35" stopColor="#7C3AED" stopOpacity="0.9" />
            <stop offset="0.7" stopColor="#A78BFA" stopOpacity="0.55" />
            <stop offset="1" stopColor="#F5B942" stopOpacity="0.85" />
          </linearGradient>
          <radialGradient id={ids.coinHighlight} cx="35%" cy="28%" r="55%">
            <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.22" />
            <stop offset="45%" stopColor="#C4B5FD" stopOpacity="0.06" />
            <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
          </radialGradient>

          {/* Gold metallic π fill */}
          <linearGradient id={ids.gold} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#FFE9A8" />
            <stop offset="40%" stopColor="#F5B942" />
            <stop offset="100%" stopColor="#C9A227" />
          </linearGradient>
          <linearGradient id={ids.goldSheen} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#FFF6D6" stopOpacity="0.85" />
            <stop offset="0.45" stopColor="#F5B942" stopOpacity="0" />
            <stop offset="1%" stopColor="#8B6914" stopOpacity="0.35" />
          </linearGradient>

          <filter id={ids.softGlow} x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="5" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id={ids.goldGlow} x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3.5" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id={ids.depthShadow} x="-30%" y="-20%" width="160%" height="160%">
            <feDropShadow dx="0" dy="10" stdDeviation="12" floodColor="#000000" floodOpacity="0.55" />
          </filter>
        </defs>

        {/* Orbital rings */}
        <ellipse
          cx="160"
          cy="160"
          rx="148"
          ry="148"
          stroke={`url(#${ids.ringA})`}
          strokeWidth="1.5"
          opacity="0.8"
          className="pi-hero-art__spin-slow"
          style={{ filter: 'blur(0.4px)' }}
        />
        <ellipse
          cx="160"
          cy="160"
          rx="132"
          ry="108"
          stroke={`url(#${ids.ringB})`}
          strokeWidth="1.15"
          strokeDasharray="5 12"
          opacity="0.65"
          className="pi-hero-art__spin-rev"
          transform="rotate(22 160 160)"
          style={{ filter: 'blur(0.5px)' }}
        />
        <ellipse
          cx="160"
          cy="160"
          rx="112"
          ry="98"
          stroke="#7C3AED"
          strokeWidth="1"
          opacity="0.32"
          transform="rotate(-12 160 160)"
        />

        {/* Coin disc — depth + metallic face */}
        <g filter={`url(#${ids.depthShadow})`}>
          <circle cx="160" cy="164" r="80" fill="#05040A" opacity="0.45" />
          <circle cx="160" cy="160" r="78" fill={`url(#${ids.coinFace})`} />
        </g>
        <circle
          cx="160"
          cy="160"
          r="78"
          stroke={`url(#${ids.coinRim})`}
          strokeWidth="2.75"
          fill="none"
        />
        <circle cx="160" cy="160" r="71" stroke="#F5B942" strokeOpacity="0.28" strokeWidth="1" />
        <circle cx="160" cy="160" r="66" stroke="#7C3AED" strokeOpacity="0.22" strokeWidth="0.8" />
        {/* Inner specular highlight for 3D read */}
        <ellipse cx="138" cy="128" rx="42" ry="28" fill={`url(#${ids.coinHighlight})`} />

        {/* Accurate Pi Network π glyph — gold metallic */}
        <g transform="translate(160 160) scale(4.55) translate(-12 -12)" filter={`url(#${ids.goldGlow})`}>
          <path d={PI_NETWORK_GLYPH} fill={`url(#${ids.gold})`} />
          <path d={PI_NETWORK_GLYPH} fill={`url(#${ids.goldSheen})`} />
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
