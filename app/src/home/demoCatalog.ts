/**
 * Local Demo / presentation catalog for Home.
 *
 * Every object is presentation-only:
 * - `isPresentationData: true`
 * - ids prefixed with `demo:`
 * - no JWTs, Pi access tokens, or payment credentials
 *
 * Rich enough to exercise UI states later mirrored by Pi Testnet data.
 */

import type {
  HomeActivityItem,
  HomeAgentItem,
  HomeMarketplaceItem,
  HomePiBalanceView,
  HomeProjectItem,
  HomeSystemStatusItem,
} from './types';

const DEMO_PREFIX = 'demo:';

function minutesAgo(n: number): string {
  return new Date(Date.now() - n * 60_000).toISOString();
}

function hoursAgo(n: number): string {
  return new Date(Date.now() - n * 3_600_000).toISOString();
}

export const DEMO_HOME_PROJECTS: HomeProjectItem[] = [
  {
    id: `${DEMO_PREFIX}project-ecommerce`,
    name: 'Pi E-commerce',
    slug: 'pi-ecommerce-demo',
    updatedAt: minutesAgo(12),
    stackLabels: ['Next.js', 'React'],
    isPresentationData: true,
  },
  {
    id: `${DEMO_PREFIX}project-social`,
    name: 'Social Dashboard',
    slug: 'social-dashboard-demo',
    updatedAt: hoursAgo(5),
    stackLabels: ['Vite', 'React'],
    isPresentationData: true,
  },
  {
    id: `${DEMO_PREFIX}project-wallet`,
    name: 'Wallet Explorer UI',
    slug: 'wallet-explorer-demo',
    updatedAt: hoursAgo(28),
    stackLabels: ['SvelteKit'],
    isPresentationData: true,
  },
  {
    id: `${DEMO_PREFIX}project-agent`,
    name: 'Agent Ops Console',
    slug: 'agent-ops-demo',
    updatedAt: hoursAgo(50),
    stackLabels: ['Vue.js'],
    isPresentationData: true,
  },
];

export const DEMO_HOME_AGENTS: HomeAgentItem[] = [
  {
    id: `${DEMO_PREFIX}agent-code`,
    name: 'Code Assistant',
    description: 'Refactors and explains project code in context',
    icon: '🤖',
    statusLabel: 'Running',
    statusState: 'connected',
    isPresentationData: true,
  },
  {
    id: `${DEMO_PREFIX}agent-ux`,
    name: 'UI/UX Designer',
    description: 'Suggests layout and accessibility improvements',
    icon: '🎨',
    statusLabel: 'Ready',
    statusState: 'success',
    isPresentationData: true,
  },
  {
    id: `${DEMO_PREFIX}agent-qa`,
    name: 'QA Reviewer',
    description: 'Pending review queue for PR-style diffs',
    icon: '🧪',
    statusLabel: 'Pending',
    statusState: 'pending',
    isPresentationData: true,
  },
];

export const DEMO_HOME_MARKETPLACE: HomeMarketplaceItem[] = [
  {
    id: `${DEMO_PREFIX}mkt-auth`,
    name: 'Pi Auth Starter',
    description: 'UI scaffolding for Pi-aware login flows (presentation only)',
    kind: 'template',
    href: '/marketplace?type=base',
    ratingLabel: '4.9 · demo',
    isPresentationData: true,
  },
  {
    id: `${DEMO_PREFIX}mkt-pay`,
    name: 'Payments Starter',
    description: 'Layout patterns for DEMO / TESTNET / PRODUCTION ledgers',
    kind: 'template',
    href: '/marketplace?type=base',
    ratingLabel: '4.8 · demo',
    isPresentationData: true,
  },
  {
    id: `${DEMO_PREFIX}mkt-skill`,
    name: 'Pi Knowledge Skill',
    description: 'Skill card for knowledge corpus browsing',
    kind: 'skill',
    href: '/marketplace?type=skill',
    ratingLabel: '4.7 · demo',
    isPresentationData: true,
  },
  {
    id: `${DEMO_PREFIX}mkt-agent`,
    name: 'Stream Builder Agent',
    description: 'Agent card for marketplace preview density',
    kind: 'agent',
    href: '/marketplace?type=agent',
    ratingLabel: '4.9 · demo',
    isPresentationData: true,
  },
];

export const DEMO_HOME_ACTIVITY: HomeActivityItem[] = [
  {
    id: `${DEMO_PREFIX}act-1`,
    title: 'Created workspace',
    detail: 'Pi E-commerce (presentation)',
    at: minutesAgo(2),
    isPresentationData: true,
  },
  {
    id: `${DEMO_PREFIX}act-2`,
    title: 'Updated agent',
    detail: 'Code Assistant status → Running',
    at: minutesAgo(18),
    isPresentationData: true,
  },
  {
    id: `${DEMO_PREFIX}act-3`,
    title: 'Browsed Marketplace',
    detail: 'Pi Auth Starter',
    at: hoursAgo(3),
    isPresentationData: true,
  },
];

export const DEMO_HOME_SYSTEM_STATUS: HomeSystemStatusItem[] = [
  {
    id: 'demo-mode',
    label: 'Local Demo',
    detail: 'UI preview only · DEV',
    state: 'simulated',
    tone: 'demo',
  },
  {
    id: 'ai-backend',
    label: 'AI / Backend',
    detail: 'Disconnected — no API calls',
    state: 'disconnected',
    tone: 'off',
  },
  {
    id: 'pi-network',
    label: 'Pi Network',
    detail: 'Unauthenticated — no Pi access token',
    state: 'unauthenticated',
    tone: 'off',
  },
  {
    id: 'storage',
    label: 'Storage',
    detail: 'Unavailable in Local Demo',
    state: 'unavailable',
    tone: 'off',
  },
  {
    id: 'database',
    label: 'Database',
    detail: 'Simulated presentation catalog',
    state: 'simulated',
    tone: 'info',
  },
];

/**
 * DEMO ledger presentation — display-only.
 * paymentsEnabled is always false. No tokens. No chargeable intents.
 */
export const DEMO_HOME_PI_BALANCE: HomePiBalanceView = {
  ledgerEnvironment: 'DEMO',
  displayAmount: '1,234.56',
  currencySymbol: 'π',
  state: 'simulated',
  paymentsEnabled: false,
  title: 'Pi Balance (Demo)',
  footnote:
    'Presentation only. Not a wallet, not Testnet, not Production. Payments stay disabled.',
  ctaLabel: 'View Pi Wallet',
  ctaHref: '/settings',
  isPresentationData: true,
};

/** Assert helpers for tests / future Testnet swap checks. */
export function isDemoPresentationId(id: string): boolean {
  return id.startsWith(DEMO_PREFIX);
}
