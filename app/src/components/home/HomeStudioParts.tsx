/**
 * Presentational building blocks for the Pi Dev Studio Home dashboard.
 * Parents supply data, routes, and handlers — no auth/API contracts here.
 */

import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, MagnifyingGlass, Sun, Moon, User } from '@phosphor-icons/react';
import { PiDevStudioMark } from '../ui/PiDevStudioMark';
import { PRODUCT_HERO, PRODUCT_NAME, PRODUCT_TAGLINE } from '../../lib/branding';
import { modKey } from '../../lib/keyboard-registry';

export function HomeTopBar({
  userName,
  userSubtitle,
  theme,
  searchPlaceholder,
  onToggleTheme,
  onOpenSearch,
  onOpenSettings,
}: {
  userName: string;
  userSubtitle?: string;
  theme: 'light' | 'dark';
  searchPlaceholder?: string;
  onToggleTheme: () => void;
  onOpenSearch: () => void;
  onOpenSettings: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <button
        type="button"
        onClick={onOpenSearch}
        className="flex min-w-0 flex-1 items-center gap-2 rounded-2xl border border-[var(--border)] bg-[var(--surface)]/80 px-3.5 py-2.5 text-left text-sm text-[var(--text-muted)] shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] transition hover:border-[var(--border-hover)] hover:bg-[var(--surface-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
        aria-label="Open command palette"
      >
        <MagnifyingGlass size={16} className="flex-shrink-0" />
        <span className="truncate">{searchPlaceholder || 'Search workspaces, apps, agents…'}</span>
        <kbd className="ml-auto hidden sm:inline-flex rounded-md border border-[var(--border)] bg-[var(--bg)] px-1.5 py-0.5 text-[10px] font-medium text-[var(--text-subtle)]">
          {modKey}K
        </kbd>
      </button>
      <button
        type="button"
        onClick={onToggleTheme}
        className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-[var(--border)] bg-[var(--surface)]/80 text-[var(--text-muted)] transition hover:text-[var(--text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
        aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
      >
        {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
      </button>
      <button
        type="button"
        onClick={onOpenSettings}
        className="inline-flex max-w-[200px] items-center gap-2 rounded-2xl border border-[var(--border)] bg-[var(--surface)]/80 px-2.5 py-1.5 text-left transition hover:border-[var(--border-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
      >
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--primary)]/20 text-[var(--primary)]">
          <User size={14} weight="fill" />
        </span>
        <span className="min-w-0">
          <span className="block truncate text-xs font-medium text-[var(--text)]">{userName}</span>
          <span className="block truncate text-[10px] text-[var(--text-subtle)]">
            {userSubtitle || PRODUCT_NAME}
          </span>
        </span>
      </button>
    </div>
  );
}

export function HomeHero({
  greeting,
  subtitle,
  primaryCta,
  secondaryCta,
  planLine,
}: {
  greeting: string;
  subtitle: string;
  primaryCta: { label: string; onClick: () => void };
  secondaryCta: { label: string; onClick: () => void };
  planLine?: ReactNode;
}) {
  return (
    <section className="relative overflow-hidden rounded-2xl border border-[var(--border)] studio-surface-elevated px-5 py-6 sm:px-7 sm:py-8">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 70% 80% at 88% 28%, rgba(124,58,237,0.38), transparent 55%), radial-gradient(ellipse 42% 50% at 8% 92%, rgba(201,162,39,0.14), transparent 50%)',
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.35]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)',
          backgroundSize: '48px 48px',
          maskImage: 'radial-gradient(ellipse 80% 70% at 70% 40%, black, transparent)',
        }}
      />
      <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="max-w-xl">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--accent-gold,#C9A227)]">
            {PRODUCT_TAGLINE}
          </p>
          <h1 className="font-heading text-2xl font-semibold tracking-tight text-[var(--text)] sm:text-3xl lg:text-[2.15rem] lg:leading-tight">
            {greeting}
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-[var(--text-muted)] sm:text-[15px]">
            {subtitle}
          </p>
          <div className="mt-5 flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={primaryCta.onClick}
              className="inline-flex items-center justify-center rounded-xl bg-[var(--primary)] px-4 py-2.5 text-sm font-semibold text-white shadow-[0_8px_24px_rgba(124,58,237,0.35)] transition hover:bg-[var(--primary-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
            >
              {primaryCta.label}
            </button>
            <button
              type="button"
              onClick={secondaryCta.onClick}
              className="inline-flex items-center justify-center rounded-xl border border-[var(--border-hover)] bg-transparent px-4 py-2.5 text-sm font-semibold text-[var(--text)] transition hover:bg-[var(--surface-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
            >
              {secondaryCta.label}
            </button>
            {planLine}
          </div>
        </div>
        <div className="relative mx-auto flex h-28 w-28 items-center justify-center sm:h-36 sm:w-36 lg:mx-0">
          <div
            aria-hidden
            className="absolute inset-0 rounded-full opacity-80 motion-safe:animate-[home-pi-orbit_14s_linear_infinite]"
            style={{
              background:
                'conic-gradient(from 210deg, rgba(124,58,237,0.55), rgba(201,162,39,0.35), rgba(167,139,250,0.4), rgba(124,58,237,0.55))',
              filter: 'blur(1px)',
            }}
          />
          <div className="absolute inset-2 rounded-full border border-white/10 bg-[#0B0A14]/88 backdrop-blur-sm" />
          <div className="relative z-10 drop-shadow-[0_0_28px_rgba(124,58,237,0.5)]">
            <PiDevStudioMark size={64} />
          </div>
        </div>
      </div>
      <style>{`
        @keyframes home-pi-orbit {
          to { transform: rotate(360deg); }
        }
        @media (prefers-reduced-motion: reduce) {
          .motion-safe\\:animate-\\[home-pi-orbit_14s_linear_infinite\\] {
            animation: none !important;
          }
        }
      `}</style>
    </section>
  );
}

export function HomeSectionHeader({
  id,
  title,
  subtitle,
  action,
}: {
  id?: string;
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-3 flex items-start justify-between gap-3">
      <div className="min-w-0">
        <h2
          id={id}
          className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)]"
        >
          {title}
        </h2>
        {subtitle && (
          <p className="mt-0.5 text-[11px] text-[var(--text-subtle)] leading-snug">{subtitle}</p>
        )}
      </div>
      {action}
    </div>
  );
}

export function HomeQuickAction({
  icon,
  title,
  description,
  onClick,
  disabled,
  badge,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  onClick: () => void;
  disabled?: boolean;
  badge?: string;
}) {
  return (
    <button
      type="button"
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      aria-disabled={disabled || undefined}
      className={[
        'group relative flex min-h-[112px] flex-col items-start gap-3 rounded-2xl border px-3.5 py-3.5 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]',
        disabled
          ? 'cursor-not-allowed border-[var(--border)] studio-surface opacity-60'
          : 'cursor-pointer border-[var(--border)] studio-surface hover:border-[color-mix(in_srgb,var(--primary)_42%,var(--border))] hover:bg-[var(--surface-hover)] hover:shadow-[0_0_28px_-14px_rgba(124,58,237,0.55)]',
      ].join(' ')}
    >
      {badge && (
        <span className="absolute right-2.5 top-2.5 rounded-full border border-[var(--border)] bg-[var(--bg)] px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">
          {badge}
        </span>
      )}
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--primary)]/15 text-[var(--primary)] transition group-hover:bg-[var(--primary)]/25">
        {icon}
      </span>
      <span>
        <span className="block text-sm font-semibold text-[var(--text)]">{title}</span>
        <span className="mt-0.5 block text-[11px] leading-snug text-[var(--text-muted)]">
          {description}
        </span>
      </span>
    </button>
  );
}

export function HomeEmptyState({
  icon,
  title,
  description,
  actionLabel,
  onAction,
  actionTo,
}: {
  icon?: ReactNode;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  actionTo?: string;
}) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-2xl border border-[var(--border)] studio-surface px-4 py-8 text-center">
      {icon && (
        <div className="mb-1 flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--primary)]/12 text-[var(--primary)]">
          {icon}
        </div>
      )}
      <p className="text-sm font-medium text-[var(--text)]">{title}</p>
      <p className="max-w-sm text-xs text-[var(--text-muted)] leading-relaxed">{description}</p>
      {actionLabel && actionTo && (
        <Link
          to={actionTo}
          className="mt-2 rounded-lg bg-[var(--primary)] px-3 py-2 text-xs font-semibold text-white transition hover:bg-[var(--primary-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
        >
          {actionLabel}
        </Link>
      )}
      {actionLabel && !actionTo && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="mt-2 rounded-lg bg-[var(--primary)] px-3 py-2 text-xs font-semibold text-white transition hover:bg-[var(--primary-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}

export function HomeIdentityCta({
  title,
  subtitle,
  primaryLabel,
  onPrimary,
  secondaryLabel,
  onSecondary,
}: {
  title?: string;
  subtitle?: string;
  primaryLabel: string;
  onPrimary: () => void;
  secondaryLabel: string;
  onSecondary: () => void;
}) {
  return (
    <section className="relative overflow-hidden rounded-2xl border border-[var(--border)] px-5 py-7 sm:px-8 sm:py-9">
      <div
        aria-hidden
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(120deg, rgba(124,58,237,0.3) 0%, rgba(20,18,37,0.95) 48%, rgba(201,162,39,0.14) 100%)',
        }}
      />
      <div className="relative z-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="max-w-lg flex items-start gap-4">
          <div className="hidden sm:flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-black/30">
            <PiDevStudioMark size={36} />
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--accent-gold,#C9A227)]">
              {PRODUCT_NAME}
            </p>
            <h2 className="mt-1 font-heading text-xl font-semibold text-[var(--text)] sm:text-2xl">
              {title || PRODUCT_HERO}
            </h2>
            <p className="mt-2 text-sm text-[var(--text-muted)]">
              {subtitle ||
                'A serious AI development platform for the Pi ecosystem — not price speculation.'}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onPrimary}
            className="rounded-xl bg-[var(--primary)] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[var(--primary-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
          >
            {primaryLabel}
          </button>
          <button
            type="button"
            onClick={onSecondary}
            className="rounded-xl border border-[var(--border-hover)] bg-transparent px-4 py-2.5 text-sm font-semibold text-[var(--text)] transition hover:bg-[var(--surface-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
          >
            {secondaryLabel}
          </button>
        </div>
      </div>
    </section>
  );
}

/** Environment-agnostic status tones (demo/testnet/production all map here). */
export type SystemStatusTone = 'ok' | 'warn' | 'off' | 'demo' | 'info' | 'pending';

export function HomeSystemStatusPanel({
  title,
  footnote,
  items,
}: {
  title?: string;
  footnote?: string;
  items: Array<{ id?: string; label: string; detail: string; tone: SystemStatusTone }>;
}) {
  const toneClass: Record<SystemStatusTone, string> = {
    ok: 'bg-[var(--status-success)]',
    warn: 'bg-[var(--status-warning,#c9a227)]',
    off: 'bg-[var(--text-subtle)]',
    demo: 'bg-[var(--accent-gold,#C9A227)]',
    info: 'bg-[var(--primary)]',
    pending: 'bg-[var(--status-warning,#c9a227)] animate-pulse',
  };

  return (
    <aside className="rounded-2xl border border-[var(--border)] studio-surface p-4 sm:p-5">
      <h2 className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
        {title || 'System status'}
      </h2>
      {footnote && (
        <p className="mt-1 text-[10px] leading-relaxed text-[var(--text-muted)]">{footnote}</p>
      )}
      <ul className="mt-3 space-y-2.5">
        {items.map((item) => (
          <li key={item.id || item.label} className="flex items-start gap-2.5">
            <span
              className={`mt-1.5 h-2 w-2 flex-shrink-0 rounded-full ${toneClass[item.tone]}`}
              aria-hidden
            />
            <span className="min-w-0">
              <span className="block text-xs font-medium text-[var(--text)]">{item.label}</span>
              <span className="block text-[11px] text-[var(--text-muted)]">{item.detail}</span>
            </span>
          </li>
        ))}
      </ul>
    </aside>
  );
}

/**
 * Presentational Pi balance / ledger panel.
 * Renders DEMO | TESTNET | PRODUCTION labels from the view-model.
 * Never executes payments — CTA is a plain navigation callback/href.
 */
export function HomePiBalancePanel({
  ledgerEnvironment,
  displayAmount,
  currencySymbol,
  title,
  footnote,
  ctaLabel,
  ctaHref,
  paymentsEnabled,
  isPresentationData,
  state,
}: {
  ledgerEnvironment: 'DEMO' | 'TESTNET' | 'PRODUCTION';
  displayAmount: string | null;
  currencySymbol: string;
  title: string;
  footnote: string;
  ctaLabel: string;
  ctaHref: string;
  paymentsEnabled: boolean;
  isPresentationData: boolean;
  state: string;
}) {
  const envBadgeClass =
    ledgerEnvironment === 'DEMO'
      ? 'border-[color-mix(in_srgb,var(--accent-gold,#C9A227)_40%,var(--border))] text-[var(--accent-gold,#C9A227)]'
      : ledgerEnvironment === 'TESTNET'
        ? 'border-[color-mix(in_srgb,var(--primary)_40%,var(--border))] text-[var(--primary)]'
        : 'border-[var(--border)] text-[var(--text-muted)]';

  return (
    <aside
      className="rounded-2xl border border-[color-mix(in_srgb,var(--accent-gold,#C9A227)_28%,var(--border))] bg-[color-mix(in_srgb,var(--accent-gold,#C9A227)_8%,var(--surface))] p-4 sm:p-5"
      data-ledger-env={ledgerEnvironment}
      data-presentation={isPresentationData ? 'true' : 'false'}
      data-payments-enabled={paymentsEnabled ? 'true' : 'false'}
      data-state={state}
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="text-xs font-semibold text-[var(--text)]">{title}</p>
        <span
          className={`rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ${envBadgeClass}`}
        >
          {ledgerEnvironment}
        </span>
      </div>
      {displayAmount != null ? (
        <p className="font-heading text-2xl font-semibold tabular-nums text-[var(--accent-gold,#C9A227)]">
          {displayAmount}{' '}
          <span className="text-base font-medium">{currencySymbol}</span>
        </p>
      ) : (
        <p className="text-sm text-[var(--text-muted)]">Balance unavailable</p>
      )}
      <p className="mt-2 text-[11px] leading-relaxed text-[var(--text-muted)]">{footnote}</p>
      {!paymentsEnabled && (
        <p className="mt-1 text-[10px] font-medium uppercase tracking-wide text-[var(--text-subtle)]">
          Payments disabled
        </p>
      )}
      <Link
        to={ctaHref}
        className="mt-3 inline-flex text-xs font-semibold text-[var(--primary)] hover:underline focus-visible:outline-none focus-visible:underline"
      >
        {ctaLabel}
      </Link>
    </aside>
  );
}

export function HomeSectionLink({
  to,
  children,
}: {
  to: string;
  children: ReactNode;
}) {
  return (
    <Link
      to={to}
      className="inline-flex items-center gap-1 text-[11px] font-medium text-[var(--text-muted)] transition hover:text-[var(--text)] focus-visible:outline-none focus-visible:underline"
    >
      {children}
      <ArrowRight size={12} />
    </Link>
  );
}
