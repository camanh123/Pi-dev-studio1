/**
 * Presentational building blocks for the Pi Dev Studio Home dashboard.
 * Parents supply data, routes, and handlers — no auth/API contracts here.
 */

import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, MagnifyingGlass, Sun, Moon, User } from '@phosphor-icons/react';
import { PRODUCT_HERO, PRODUCT_NAME } from '../../lib/branding';
import { modKey } from '../../lib/keyboard-registry';
import { PiHeroArtwork } from './PiHeroArtwork';
import './homeStudio.css';

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
    <div className="flex flex-wrap items-center gap-2.5">
      <button
        type="button"
        onClick={onOpenSearch}
        className="home-card flex min-w-0 flex-1 items-center gap-2.5 px-4 py-3 text-left text-sm text-white/55 transition hover:text-white/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7C3AED]"
        aria-label="Open command palette"
      >
        <MagnifyingGlass size={18} className="flex-shrink-0 text-[#A78BFA]" />
        <span className="truncate text-[13px] sm:text-sm">
          {searchPlaceholder || 'Tìm kiếm lệnh, dự án, agent…'}
        </span>
        <kbd className="ml-auto hidden sm:inline-flex rounded-md border border-white/10 bg-black/30 px-1.5 py-0.5 text-[10px] font-semibold text-white/45">
          {modKey}K
        </kbd>
      </button>
      <button
        type="button"
        onClick={onToggleTheme}
        className="home-card inline-flex h-11 w-11 items-center justify-center text-white/55 transition hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7C3AED]"
        aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
      >
        {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
      </button>
      <button
        type="button"
        onClick={onOpenSettings}
        className="home-card inline-flex max-w-[230px] items-center gap-2.5 px-2.5 py-1.5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7C3AED]"
      >
        <span className="home-icon-well flex h-8 w-8 items-center justify-center">
          <User size={15} weight="fill" />
        </span>
        <span className="min-w-0 hidden sm:block">
          <span className="block truncate text-[13px] font-semibold text-white">{userName}</span>
          <span className="block truncate text-[11px] text-white/45">
            {userSubtitle || PRODUCT_NAME}
          </span>
        </span>
      </button>
    </div>
  );
}

export function HomeHero({
  greeting,
  identityLine,
  subtitle,
  primaryCta,
  secondaryCta,
  planLine,
}: {
  greeting: string;
  identityLine?: string;
  subtitle: string;
  primaryCta: { label: string; onClick: () => void };
  secondaryCta: { label: string; onClick: () => void };
  planLine?: ReactNode;
}) {
  return (
    <section className="home-card relative overflow-hidden px-5 py-6 sm:px-8 sm:py-7 lg:px-10 lg:py-8">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 58% 90% at 92% 35%, rgba(124,58,237,0.42), transparent 58%), radial-gradient(ellipse 35% 50% at 8% 90%, rgba(245,185,66,0.12), transparent 55%)',
        }}
      />
      <div className="relative z-10 grid grid-cols-1 items-center gap-6 lg:grid-cols-12 lg:gap-4">
        <div className="min-w-0 lg:col-span-7 xl:col-span-8">
          <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.18em] text-[#F5B942]">
            {PRODUCT_NAME}
          </p>
          <h1 className="font-heading text-[1.85rem] font-semibold tracking-tight text-white sm:text-4xl lg:text-[2.75rem] lg:leading-[1.08]">
            {greeting}
          </h1>
          <p className="mt-2 font-heading text-lg font-medium text-[#C4B5FD] sm:text-xl">
            {identityLine || PRODUCT_HERO}
          </p>
          <p className="mt-3 max-w-xl text-[14px] leading-relaxed text-white/70 sm:text-[15px]">
            {subtitle}
          </p>
          <div className="mt-5 flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={primaryCta.onClick}
              className="inline-flex items-center justify-center rounded-xl bg-[#7C3AED] px-5 py-2.5 text-sm font-semibold text-white shadow-[0_10px_30px_rgba(124,58,237,0.5)] transition hover:bg-[#9333EA] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7C3AED]"
            >
              {primaryCta.label}
            </button>
            <button
              type="button"
              onClick={secondaryCta.onClick}
              className="inline-flex items-center justify-center rounded-xl border border-white/15 bg-white/[0.04] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-white/[0.08] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7C3AED]"
            >
              {secondaryCta.label}
            </button>
            {planLine}
          </div>
        </div>
        <div className="flex justify-center lg:col-span-5 xl:col-span-4 lg:justify-end">
          <PiHeroArtwork className="w-[min(100%,280px)] sm:w-[300px] lg:w-[320px]" />
        </div>
      </div>
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
    <div className="mb-3 flex items-end justify-between gap-3">
      <div className="min-w-0">
        <h2
          id={id}
          className="font-heading text-[15px] font-semibold tracking-tight text-white sm:text-base"
        >
          {title}
        </h2>
        {subtitle && <p className="mt-0.5 text-[12px] text-white/45">{subtitle}</p>}
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
  accent = 'violet',
}: {
  icon: ReactNode;
  title: string;
  description: string;
  onClick: () => void;
  disabled?: boolean;
  badge?: string;
  accent?: 'violet' | 'gold' | 'mint';
}) {
  const accentClass =
    accent === 'gold'
      ? 'from-[#F5B942]/25 to-transparent text-[#FBBF24]'
      : accent === 'mint'
        ? 'from-[#22C55E]/20 to-transparent text-[#4ADE80]'
        : 'from-[#7C3AED]/30 to-transparent text-[#C4B5FD]';

  return (
    <button
      type="button"
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      aria-disabled={disabled || undefined}
      className={[
        'home-card home-card-interactive group relative flex min-h-[118px] flex-col items-start justify-between gap-3 overflow-hidden p-3.5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7C3AED]',
        disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer',
      ].join(' ')}
    >
      <div
        aria-hidden
        className={`pointer-events-none absolute -right-6 -top-8 h-24 w-24 rounded-full bg-gradient-to-br ${accentClass} opacity-70 blur-2xl transition group-hover:opacity-100`}
      />
      {badge && <span className="home-badge-demo absolute right-2.5 top-2.5 z-10">{badge}</span>}
      <span className="home-icon-well relative z-10 h-10 w-10 transition group-hover:scale-[1.05]">
        {icon}
      </span>
      <span className="relative z-10">
        <span className="block text-[13px] font-semibold text-white sm:text-[14px]">{title}</span>
        <span className="mt-1 block text-[11px] leading-snug text-white/50">{description}</span>
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
    <div className="home-card flex flex-col items-center gap-2 px-5 py-9 text-center">
      {icon && <div className="home-icon-well mb-1 h-12 w-12">{icon}</div>}
      <p className="text-[15px] font-semibold text-white">{title}</p>
      <p className="max-w-md text-[13px] leading-relaxed text-white/55">{description}</p>
      {actionLabel && actionTo && (
        <Link
          to={actionTo}
          className="mt-3 rounded-xl bg-[#7C3AED] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#9333EA] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7C3AED]"
        >
          {actionLabel}
        </Link>
      )}
      {actionLabel && !actionTo && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="mt-3 rounded-xl bg-[#7C3AED] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#9333EA] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7C3AED]"
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
  metrics,
}: {
  title?: string;
  subtitle?: string;
  primaryLabel: string;
  onPrimary: () => void;
  secondaryLabel: string;
  onSecondary: () => void;
  metrics?: Array<{ label: string; value: string }>;
}) {
  return (
    <section className="relative overflow-hidden rounded-2xl border border-[rgba(124,58,237,0.4)] px-5 py-8 sm:px-8 sm:py-9">
      <div
        aria-hidden
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(115deg, rgba(124,58,237,0.5) 0%, rgba(11,8,19,0.96) 45%, rgba(245,185,66,0.18) 100%)',
        }}
      />
      <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 items-center gap-5">
          <div className="hidden sm:block w-[120px] shrink-0">
            <PiHeroArtwork />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#F5B942]">
              {PRODUCT_NAME}
            </p>
            <h2 className="mt-1 font-heading text-2xl font-semibold text-white sm:text-3xl">
              {title || PRODUCT_HERO}
            </h2>
            <p className="mt-2 max-w-xl text-[14px] text-white/65">
              {subtitle || 'Nền tảng developer AI trong hệ sinh thái Pi.'}
            </p>
            {metrics && metrics.length > 0 && (
              <div className="mt-3.5 flex flex-wrap gap-2">
                {metrics.map((m) => (
                  <span
                    key={m.label}
                    className="rounded-full border border-white/10 bg-black/30 px-3 py-1 text-[11px] text-white/55"
                  >
                    <span className="font-semibold text-white">{m.value}</span> {m.label}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
        <div className="flex flex-wrap gap-2.5">
          <button
            type="button"
            onClick={onPrimary}
            className="rounded-xl bg-[#7C3AED] px-5 py-2.5 text-sm font-semibold text-white shadow-[0_10px_28px_rgba(124,58,237,0.45)] transition hover:bg-[#9333EA] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7C3AED]"
          >
            {primaryLabel}
          </button>
          <button
            type="button"
            onClick={onSecondary}
            className="rounded-xl border border-white/15 bg-white/5 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7C3AED]"
          >
            {secondaryLabel}
          </button>
        </div>
      </div>
    </section>
  );
}

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
    ok: 'bg-[#22C55E] shadow-[0_0_8px_rgba(34,197,94,0.55)]',
    warn: 'bg-[#F5B942] shadow-[0_0_8px_rgba(245,185,66,0.45)]',
    off: 'bg-white/25',
    demo: 'bg-[#F5B942] shadow-[0_0_8px_rgba(245,185,66,0.5)]',
    info: 'bg-[#7C3AED] shadow-[0_0_8px_rgba(124,58,237,0.5)]',
    pending: 'bg-[#F5B942] animate-pulse',
  };

  return (
    <aside className="home-rail-card p-4">
      <h2 className="font-heading text-[14px] font-semibold text-white">
        {title || 'Trạng thái hệ thống'}
      </h2>
      {footnote && <p className="mt-1 text-[11px] leading-relaxed text-white/45">{footnote}</p>}
      <ul className="mt-3 space-y-2.5">
        {items.map((item) => (
          <li
            key={item.id || item.label}
            className="flex items-center justify-between gap-3 rounded-lg border border-white/[0.06] bg-black/20 px-2.5 py-2"
          >
            <span className="flex min-w-0 items-center gap-2.5">
              <span className={`h-2 w-2 shrink-0 rounded-full ${toneClass[item.tone]}`} aria-hidden />
              <span className="truncate text-[13px] font-medium text-white">{item.label}</span>
            </span>
            <span className="shrink-0 text-[11px] font-semibold text-white/50">{item.detail}</span>
          </li>
        ))}
      </ul>
    </aside>
  );
}

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
  return (
    <aside
      className="relative overflow-hidden rounded-2xl border border-[rgba(245,185,66,0.35)] p-4"
      style={{
        background:
          'radial-gradient(ellipse 80% 70% at 90% 10%, rgba(245,185,66,0.22), transparent 55%), linear-gradient(160deg, #1B1633 0%, #121020 55%, #0B0813 100%)',
      }}
      data-ledger-env={ledgerEnvironment}
      data-presentation={isPresentationData ? 'true' : 'false'}
      data-payments-enabled={paymentsEnabled ? 'true' : 'false'}
      data-state={state}
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="text-[12px] font-bold uppercase tracking-[0.14em] text-[#F5B942]">
          {title}
        </p>
        <span className="home-badge-demo">{ledgerEnvironment}</span>
      </div>
      {displayAmount != null ? (
        <p className="font-heading text-[2.15rem] font-semibold leading-none tabular-nums text-[#FBBF24] sm:text-[2.4rem]">
          {displayAmount}
          <span className="ml-1.5 text-xl font-medium">{currencySymbol}</span>
        </p>
      ) : (
        <p className="text-sm text-white/55">Balance unavailable</p>
      )}
      {isPresentationData && (
        <p className="mt-2 text-[10px] font-bold uppercase tracking-[0.14em] text-[#F5B942]/90">
          Simulation only · DEMO
        </p>
      )}
      <p className="mt-2 text-[12px] leading-relaxed text-white/50">{footnote}</p>
      {!paymentsEnabled && (
        <p className="mt-1 text-[10px] font-semibold uppercase tracking-wide text-white/35">
          Payments disabled
        </p>
      )}
      <Link
        to={ctaHref}
        className="mt-3.5 inline-flex rounded-xl border border-[rgba(245,185,66,0.4)] bg-[#F5B942]/10 px-3.5 py-2 text-[12px] font-semibold text-[#FBBF24] transition hover:bg-[#F5B942]/18 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7C3AED]"
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
      className="inline-flex items-center gap-1 text-[12px] font-semibold text-[#C4B5FD] transition hover:text-white focus-visible:outline-none focus-visible:underline"
    >
      {children}
      <ArrowRight size={13} />
    </Link>
  );
}
