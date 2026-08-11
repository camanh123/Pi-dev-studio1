/**
 * Pi Dev Studio brand mark — abstract geometric mark inspired by the Pi
 * ecosystem (purple + gold). Not an official Pi Network trademark asset.
 */

interface PiDevStudioMarkProps {
  className?: string;
  size?: number;
  title?: string;
}

export function PiDevStudioMark({
  className,
  size = 32,
  title = 'Pi Dev Studio',
}: PiDevStudioMarkProps) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label={title}
    >
      <title>{title}</title>
      <defs>
        <linearGradient id="pds-mark-bg" x1="8" y1="4" x2="42" y2="44" gradientUnits="userSpaceOnUse">
          <stop stopColor="#7C3AED" />
          <stop offset="1" stopColor="#4C1D95" />
        </linearGradient>
        <linearGradient id="pds-mark-gold" x1="24" y1="10" x2="24" y2="38" gradientUnits="userSpaceOnUse">
          <stop stopColor="#F5D78E" />
          <stop offset="1" stopColor="#C9A227" />
        </linearGradient>
      </defs>
      <rect x="2" y="2" width="44" height="44" rx="14" fill="url(#pds-mark-bg)" />
      <circle cx="24" cy="18" r="7" stroke="url(#pds-mark-gold)" strokeWidth="2.5" fill="none" />
      <path
        d="M24 25V36"
        stroke="url(#pds-mark-gold)"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <path
        d="M17 36H31"
        stroke="url(#pds-mark-gold)"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <circle cx="24" cy="18" r="2.2" fill="url(#pds-mark-gold)" />
    </svg>
  );
}

interface PiDevStudioWordmarkProps {
  className?: string;
  markSize?: number;
  showTagline?: boolean;
  inverted?: boolean;
}

export function PiDevStudioWordmark({
  className,
  markSize = 28,
  showTagline = false,
  inverted = false,
}: PiDevStudioWordmarkProps) {
  return (
    <div className={`flex items-center gap-2.5 min-w-0 ${className ?? ''}`}>
      <PiDevStudioMark size={markSize} />
      <div className="min-w-0 flex flex-col leading-tight">
        <span
          className={`font-semibold tracking-tight truncate ${
            inverted ? 'text-white' : 'text-[var(--text)]'
          }`}
          style={{ fontSize: markSize >= 28 ? 15 : 13 }}
        >
          Pi Dev Studio
        </span>
        {showTagline && (
          <span
            className={`text-[10px] truncate ${
              inverted ? 'text-white/60' : 'text-[var(--text-muted)]'
            }`}
          >
            AI for the Pi ecosystem
          </span>
        )}
      </div>
    </div>
  );
}
