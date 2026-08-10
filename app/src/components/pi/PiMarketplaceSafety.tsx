/**
 * Marketplace detail safety panel for Pi starters / skills (Phase 6).
 */

import {
  PI_BILLING_BOUNDARY,
  PI_IDENTITY_BOUNDARY,
  PI_PAYMENT_SAFETY,
  PI_PAYMENTS_STARTER_SLUG,
  PI_STARTER_SUMMARIES,
  isPiBaseSlug,
  isPiSkillSlug,
  type PiBaseSlug,
} from '../../lib/piDevStudio';

export interface PiMarketplaceSafetyProps {
  slug: string;
  itemType?: string;
  showKnowledgeNote?: boolean;
}

export function PiMarketplaceSafety({
  slug,
  itemType,
  showKnowledgeNote = false,
}: PiMarketplaceSafetyProps) {
  const isBase = isPiBaseSlug(slug);
  const isSkill = isPiSkillSlug(slug);
  if (!isBase && !isSkill) return null;

  const summary = isBase ? PI_STARTER_SUMMARIES[slug as PiBaseSlug] : null;
  const isPayments = slug === PI_PAYMENTS_STARTER_SLUG;

  return (
    <aside
      className="mt-4 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] p-4"
      data-testid="pi-marketplace-safety"
      data-pi-slug={slug}
      data-pi-item-type={itemType || (isBase ? 'base' : 'skill')}
    >
      <h3 className="text-sm font-semibold text-[var(--text)]">Pi Dev Studio boundaries</h3>
      {summary && (
        <p className="mt-1 text-xs text-[var(--text-muted)]">{summary.shortDescription}</p>
      )}
      {isSkill && (
        <p className="mt-1 text-xs text-[var(--text-muted)]">
          This skill documents official Pi guidance for generated apps. It does not add OpenSail
          login, Stripe billing, or App Studio automation.
        </p>
      )}

      <ul className="mt-3 space-y-1.5 text-xs text-[var(--text-muted)]">
        <li>· {PI_IDENTITY_BOUNDARY}</li>
        <li>· {PI_BILLING_BOUNDARY}</li>
        <li>· OpenSail preview ≠ Pi Browser fidelity</li>
        <li>· SDK sandbox ≠ Developer Portal Testnet/Mainnet</li>
        <li>· Selecting a starter does not register a Pi app</li>
        <li>· Developer Portal registration / domain validation remain MANUAL</li>
      </ul>

      {isPayments && (
        <div className="mt-3 border-t border-[var(--border)] pt-3" data-testid="pi-payment-safety">
          <div className="text-[10px] font-medium uppercase tracking-wide text-[var(--text-subtle)]">
            Payments starter safety
          </div>
          <ul className="mt-1.5 space-y-1 text-xs text-[var(--text-muted)]">
            {PI_PAYMENT_SAFETY.map((line) => (
              <li key={line}>· {line}</li>
            ))}
          </ul>
        </div>
      )}

      {showKnowledgeNote && (
        <p className="mt-3 text-[11px] text-[var(--text-subtle)]" data-testid="pi-knowledge-note">
          Facts are grounded in the Phase 1 official Pi knowledge corpus. No undocumented Portal /
          App Studio APIs are exposed here.
        </p>
      )}
    </aside>
  );
}
