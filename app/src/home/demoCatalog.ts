/**
 * Local Demo / presentation catalog for Home.
 *
 * Every object is presentation-only:
 * - `isPresentationData: true`
 * - ids prefixed with `demo:`
 * - no JWTs, Pi access tokens, or payment credentials
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
    description: 'Storefront + catalog workspace for Pi ecosystem demos',
    projectType: 'Workspace',
    statusLabel: 'Active',
    updatedAt: minutesAgo(12),
    stackLabels: ['Next.js', 'React', 'TypeScript'],
    collaboratorInitials: ['HA', 'MT', 'LK'],
    isPresentationData: true,
  },
  {
    id: `${DEMO_PREFIX}project-social`,
    name: 'Social Dashboard',
    slug: 'social-dashboard-demo',
    description: 'Analytics shell with agent-assisted chart flows',
    projectType: 'App',
    statusLabel: 'Active',
    updatedAt: hoursAgo(5),
    stackLabels: ['Vite', 'React'],
    collaboratorInitials: ['HA', 'QN'],
    isPresentationData: true,
  },
  {
    id: `${DEMO_PREFIX}project-wallet`,
    name: 'Wallet Explorer UI',
    slug: 'wallet-explorer-demo',
    description: 'Presentation UI for DEMO / TESTNET / PRODUCTION ledgers',
    projectType: 'Template',
    statusLabel: 'Idle',
    updatedAt: hoursAgo(28),
    stackLabels: ['SvelteKit'],
    collaboratorInitials: ['HA'],
    isPresentationData: true,
  },
  {
    id: `${DEMO_PREFIX}project-agent`,
    name: 'Agent Ops Console',
    slug: 'agent-ops-demo',
    description: 'Operator console for multi-agent run oversight',
    projectType: 'Workspace',
    statusLabel: 'Active',
    updatedAt: hoursAgo(50),
    stackLabels: ['Vue.js', 'Pinia'],
    collaboratorInitials: ['MT', 'HA', 'VR', 'PL'],
    isPresentationData: true,
  },
];

export const DEMO_HOME_AGENTS: HomeAgentItem[] = [
  {
    id: `${DEMO_PREFIX}agent-code`,
    name: 'Code Assistant',
    description: 'Refactors and explains project code in context',
    icon: '🤖',
    statusLabel: 'RUNNING',
    statusState: 'connected',
    lastActivityLabel: '2 phút trước',
    isPresentationData: true,
  },
  {
    id: `${DEMO_PREFIX}agent-ux`,
    name: 'UI/UX Designer',
    description: 'Suggests layout and accessibility improvements',
    icon: '🎨',
    statusLabel: 'READY',
    statusState: 'success',
    lastActivityLabel: '1 giờ trước',
    isPresentationData: true,
  },
  {
    id: `${DEMO_PREFIX}agent-qa`,
    name: 'QA Reviewer',
    description: 'Pending review queue for PR-style diffs',
    icon: '🧪',
    statusLabel: 'DEMO',
    statusState: 'pending',
    lastActivityLabel: 'Hôm qua',
    isPresentationData: true,
  },
];

export const DEMO_HOME_MARKETPLACE: HomeMarketplaceItem[] = [
  {
    id: `${DEMO_PREFIX}mkt-auth`,
    name: 'Pi Auth Starter',
    description: 'UI scaffolding for Pi-aware login flows (presentation only)',
    kind: 'template',
    categoryLabel: 'Auth',
    href: '/marketplace?type=base',
    ratingLabel: '★ 4.9 · demo',
    isPresentationData: true,
  },
  {
    id: `${DEMO_PREFIX}mkt-pay`,
    name: 'Payments Starter',
    description: 'Layout patterns for DEMO / TESTNET / PRODUCTION ledgers',
    kind: 'template',
    categoryLabel: 'Payments',
    href: '/marketplace?type=base',
    ratingLabel: '★ 4.8 · demo',
    isPresentationData: true,
  },
  {
    id: `${DEMO_PREFIX}mkt-skill`,
    name: 'Pi Knowledge Skill',
    description: 'Skill card for knowledge corpus browsing',
    kind: 'skill',
    categoryLabel: 'Skills',
    href: '/marketplace?type=skill',
    ratingLabel: '★ 4.7 · demo',
    isPresentationData: true,
  },
  {
    id: `${DEMO_PREFIX}mkt-agent`,
    name: 'Stream Builder Agent',
    description: 'Agent card for marketplace preview density',
    kind: 'agent',
    categoryLabel: 'Agents',
    href: '/marketplace?type=agent',
    ratingLabel: '★ 4.9 · demo',
    isPresentationData: true,
  },
];

export const DEMO_HOME_ACTIVITY: HomeActivityItem[] = [
  {
    id: `${DEMO_PREFIX}act-1`,
    title: 'Đã tạo workspace',
    detail: 'Pi E-commerce (presentation)',
    at: minutesAgo(2),
    icon: '✦',
    statusLabel: 'Demo',
    isPresentationData: true,
  },
  {
    id: `${DEMO_PREFIX}act-2`,
    title: 'Cập nhật agent',
    detail: 'Code Assistant → Running',
    at: minutesAgo(18),
    icon: '◎',
    statusLabel: 'Demo',
    isPresentationData: true,
  },
  {
    id: `${DEMO_PREFIX}act-3`,
    title: 'Duyệt Marketplace',
    detail: 'Pi Auth Starter',
    at: hoursAgo(3),
    icon: '◇',
    statusLabel: 'Demo',
    isPresentationData: true,
  },
  {
    id: `${DEMO_PREFIX}act-4`,
    title: 'Mở Local Demo',
    detail: 'UI preview only — no backend',
    at: hoursAgo(6),
    icon: '●',
    statusLabel: 'Local',
    isPresentationData: true,
  },
];

export const DEMO_HOME_SYSTEM_STATUS: HomeSystemStatusItem[] = [
  {
    id: 'ai-service',
    label: 'AI Service',
    detail: 'Mô phỏng',
    state: 'simulated',
    tone: 'demo',
  },
  {
    id: 'pi-network',
    label: 'Pi Network',
    detail: 'Demo — không xác thực Pi',
    state: 'unauthenticated',
    tone: 'off',
  },
  {
    id: 'storage',
    label: 'Storage',
    detail: 'Sẵn sàng (local UI)',
    state: 'success',
    tone: 'ok',
  },
  {
    id: 'database',
    label: 'Database',
    detail: 'Demo catalog',
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
  title: 'Pi Balance',
  footnote: 'DEMO — simulation only. Not a wallet. Payments disabled.',
  ctaLabel: 'Xem ví Pi',
  ctaHref: '/settings',
  isPresentationData: true,
};

export function isDemoPresentationId(id: string): boolean {
  return id.startsWith(DEMO_PREFIX);
}
