/**
 * Persistent indicator when Local Demo / Preview Mode is active.
 * Only renders for authMethod === 'local_demo' (never in production auth).
 */

import { useAuth } from '../contexts/AuthContext';

export function LocalDemoBanner() {
  const { authMethod } = useAuth();

  if (authMethod !== 'local_demo') {
    return null;
  }

  return (
    <div
      role="status"
      aria-live="polite"
      data-testid="local-demo-banner"
      style={{
        flexShrink: 0,
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        padding: '6px 12px',
        background: '#7c2d12',
        color: '#fff7ed',
        fontSize: 12,
        fontWeight: 700,
        letterSpacing: '0.06em',
        textTransform: 'uppercase',
        borderBottom: '1px solid #9a3412',
      }}
    >
      <span>LOCAL DEMO MODE</span>
      <span style={{ fontWeight: 500, opacity: 0.85, textTransform: 'none', letterSpacing: 0 }}>
        UI only — no backend connection
      </span>
    </div>
  );
}
