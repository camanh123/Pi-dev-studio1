/**
 * Shared presentational surfaces for the Pi Dev Studio visual language.
 * Pure CSS/class helpers — no business logic.
 */

import type { CSSProperties, ReactNode } from 'react';

interface StudioSurfaceProps {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
  as?: 'div' | 'section' | 'article';
  elevated?: boolean;
}

export function StudioSurface({
  children,
  className = '',
  style,
  as: Tag = 'div',
  elevated = false,
}: StudioSurfaceProps) {
  return (
    <Tag
      className={[
        'rounded-[var(--radius-xl,16px)] border border-[var(--border)]',
        elevated ? 'studio-surface-elevated' : 'studio-surface',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      style={style}
    >
      {children}
    </Tag>
  );
}

interface StudioPageHeroProps {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  className?: string;
}

export function StudioPageHero({
  eyebrow,
  title,
  subtitle,
  actions,
  className = '',
}: StudioPageHeroProps) {
  return (
    <header className={`relative overflow-hidden ${className}`}>
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 opacity-80"
        style={{
          background:
            'radial-gradient(ellipse 80% 60% at 50% -10%, rgba(124, 58, 237, 0.28), transparent 70%), radial-gradient(ellipse 50% 40% at 90% 20%, rgba(201, 162, 39, 0.08), transparent 60%)',
        }}
      />
      {eyebrow && (
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--accent-gold,#C9A227)]">
          {eyebrow}
        </p>
      )}
      <h1 className="font-heading text-2xl font-semibold tracking-tight text-[var(--text)] sm:text-3xl lg:text-4xl">
        {title}
      </h1>
      {subtitle && (
        <p className="mt-2 max-w-xl text-sm leading-relaxed text-[var(--text-muted)] sm:text-base">
          {subtitle}
        </p>
      )}
      {actions && <div className="mt-5 flex flex-wrap items-center gap-3">{actions}</div>}
    </header>
  );
}
