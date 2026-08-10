/**
 * Additive Pi project wizard / setup checklist (Phase 6).
 * Distinguishes OpenSail identity/billing from generated-app Pi identity/payments,
 * and never collapses OpenSail deployment, SDK sandbox, Portal network, and
 * payment DTO network into one "environment" toggle.
 */

import {
  PI_AUTH_STARTER_SLUG,
  PI_BILLING_BOUNDARY,
  PI_ENVIRONMENT_CONCEPTS,
  PI_IDENTITY_BOUNDARY,
  PI_PAYMENT_SAFETY,
  PI_PAYMENTS_STARTER_SLUG,
  PI_STARTER_SUMMARIES,
  PI_WIZARD_STEPS,
  type PiBaseSlug,
  isPiBaseSlug,
} from '../../lib/piDevStudio';

export interface PiSetupChecklistProps {
  baseSlug: string;
  /** When true, show Phase 1 knowledge provenance note. */
  showKnowledgeNote?: boolean;
  compact?: boolean;
  className?: string;
}

export function PiSetupChecklist({
  baseSlug,
  showKnowledgeNote = false,
  compact = false,
  className = '',
}: PiSetupChecklistProps) {
  if (!isPiBaseSlug(baseSlug)) return null;

  const summary = PI_STARTER_SUMMARIES[baseSlug as PiBaseSlug];
  const isAuth = baseSlug === PI_AUTH_STARTER_SLUG || baseSlug === PI_PAYMENTS_STARTER_SLUG;
  const isPayments = baseSlug === PI_PAYMENTS_STARTER_SLUG;

  return (
    <section
      className={[
        'rounded-[var(--radius-small)] border border-[var(--border)] bg-[var(--surface)]',
        compact ? 'p-3' : 'p-4',
        className,
      ].join(' ')}
      aria-label="Pi project setup checklist"
      data-testid="pi-setup-checklist"
      data-pi-base={baseSlug}
    >
      <header className="mb-3">
        <h3 className={`${compact ? 'text-[12px]' : 'text-[13px]'} font-semibold text-[var(--text)]`}>
          Pi setup — {summary.name}
        </h3>
        <p className="mt-1 text-[11px] leading-snug text-[var(--text-muted)]">
          {summary.shortDescription}
        </p>
      </header>

      <ul className="mb-3 space-y-1">
        {summary.highlights.map((line) => (
          <li key={line} className="text-[11px] leading-snug text-[var(--text-muted)]">
            · {line}
          </li>
        ))}
      </ul>

      <div className="mb-3 rounded-[var(--radius-small)] border border-[var(--border)] bg-[var(--bg)] p-2.5">
        <p className="text-[10px] font-medium uppercase tracking-wide text-[var(--text-subtle)]">
          Keep these separate
        </p>
        <ul className="mt-1.5 space-y-2">
          {PI_ENVIRONMENT_CONCEPTS.map((concept) => (
            <li key={concept.id}>
              <div className="text-[11px] font-medium text-[var(--text)]">{concept.title}</div>
              <p className="text-[10px] leading-snug text-[var(--text-muted)]">{concept.body}</p>
            </li>
          ))}
        </ul>
      </div>

      <ol className="mb-3 space-y-2">
        {PI_WIZARD_STEPS.map((step, index) => (
          <li key={step.id} className="flex gap-2 text-[11px] leading-snug">
            <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-[rgba(var(--primary-rgb),0.12)] text-[10px] font-semibold text-[var(--primary)]">
              {index + 1}
            </span>
            <div className="min-w-0">
              <div className="font-medium text-[var(--text)]">
                {step.title}{' '}
                <span className="font-normal text-[var(--text-subtle)]">({step.owner})</span>
              </div>
              <p className="text-[var(--text-muted)]">{step.detail}</p>
            </div>
          </li>
        ))}
      </ol>

      {isAuth && (
        <div
          className="mb-3 rounded-[var(--radius-small)] border border-[var(--border)] bg-[var(--bg)] p-2.5 text-[11px] leading-snug text-[var(--text-muted)]"
          data-testid="pi-identity-boundary"
        >
          <div className="mb-1 text-[10px] font-medium uppercase tracking-wide text-[var(--text-subtle)]">
            Identity boundary
          </div>
          {PI_IDENTITY_BOUNDARY}
        </div>
      )}

      {isPayments && (
        <div
          className="mb-3 rounded-[var(--radius-small)] border border-[var(--border)] bg-[var(--bg)] p-2.5"
          data-testid="pi-payment-safety"
        >
          <div className="mb-1 text-[10px] font-medium uppercase tracking-wide text-[var(--text-subtle)]">
            Payment safety
          </div>
          <p className="mb-2 text-[11px] leading-snug text-[var(--text-muted)]">
            {PI_BILLING_BOUNDARY}
          </p>
          <ul className="space-y-1">
            {PI_PAYMENT_SAFETY.map((line) => (
              <li key={line} className="text-[11px] leading-snug text-[var(--text-muted)]">
                · {line}
              </li>
            ))}
          </ul>
          <p
            className="mt-2 text-[11px] font-medium leading-snug text-[var(--status-warning, #c48a2a)]"
            data-testid="pi-mainnet-warning"
          >
            Mainnet configuration requires manual Developer Portal setup and human verification. Do
            not treat changing an OpenSail environment variable or SDK sandbox flag as a Mainnet
            switch.
          </p>
        </div>
      )}

      {showKnowledgeNote && (
        <p
          className="text-[10px] leading-snug text-[var(--text-subtle)]"
          data-testid="pi-knowledge-note"
        >
          Provenance for Pi APIs and workflows comes from the Phase 1 official knowledge corpus.
          Unsupported claims (OAuth2 login mapping, App Studio automation, wallet APIs, refunds,
          recurring payments, webhooks) remain UNKNOWN / out of scope.
        </p>
      )}
    </section>
  );
}
