/**
 * Home data sources: demo (presentation), testnet (stub), production (live APIs).
 */

import { marketplaceApi, projectsApi } from '../lib/api';
import {
  DEMO_HOME_ACTIVITY,
  DEMO_HOME_AGENTS,
  DEMO_HOME_MARKETPLACE,
  DEMO_HOME_PI_BALANCE,
  DEMO_HOME_PROJECTS,
  DEMO_HOME_SYSTEM_STATUS,
} from './demoCatalog';
import { PRODUCT_HERO, PRODUCT_HERO_SUPPORT, PRODUCT_NAME } from '../lib/branding';
import type {
  HomeAgentItem,
  HomeDataSource,
  HomeDataSourceContext,
  HomeMarketplaceItem,
  HomePiBalanceView,
  HomeProjectItem,
  HomeSystemStatusItem,
} from './types';
import { mapResourceStateToTone } from './types';

function unwrapList(data: unknown): Array<Record<string, unknown>> {
  if (Array.isArray(data)) return data as Array<Record<string, unknown>>;
  if (data && typeof data === 'object') {
    const obj = data as Record<string, unknown>;
    for (const key of ['items', 'agents', 'bases', 'skills', 'results', 'data']) {
      if (Array.isArray(obj[key])) return obj[key] as Array<Record<string, unknown>>;
    }
  }
  return [];
}

/** Local Demo — rich presentation catalog, never hits backend. */
export const demoHomeSource: HomeDataSource = {
  environment: 'demo',
  async load() {
    return {
      environment: 'demo',
      heroSubtitle: `${PRODUCT_HERO_SUPPORT} Local Demo uses presentation data — no backend or Pi auth.`,
      userSubtitle: 'Local Demo',
      capabilities: {
        canMutateBackend: false,
        showPresentationBadges: true,
        piAuthSimulated: false,
      },
      projects: { state: 'simulated', items: DEMO_HOME_PROJECTS },
      agents: { state: 'simulated', items: DEMO_HOME_AGENTS },
      marketplace: { state: 'simulated', items: DEMO_HOME_MARKETPLACE },
      activity: { state: 'simulated', items: DEMO_HOME_ACTIVITY },
      systemStatus: DEMO_HOME_SYSTEM_STATUS,
      systemStatusFootnote:
        'Status reflects Local Demo presentation — not production or Testnet health.',
      piBalance: DEMO_HOME_PI_BALANCE,
    };
  },
};

/**
 * Future Pi Testnet / Sandbox source.
 * Intentionally returns unavailable slices until a real Testnet adapter is wired.
 * Does NOT mint tokens or enable payments.
 */
export const testnetHomeSource: HomeDataSource = {
  environment: 'testnet',
  async load() {
    const piBalance: HomePiBalanceView = {
      ledgerEnvironment: 'TESTNET',
      displayAmount: null,
      currencySymbol: 'π',
      state: 'unavailable',
      paymentsEnabled: false,
      title: 'Pi Balance (Testnet)',
      footnote:
        'Testnet provider is not wired yet. When connected, this panel will show sandbox balance only — still not Production payments.',
      ctaLabel: 'Testnet wallet (soon)',
      ctaHref: '/settings',
      isPresentationData: false,
    };

    const systemStatus: HomeSystemStatusItem[] = [
      {
        id: 'testnet',
        label: 'Pi Testnet',
        detail: 'Provider stub — not connected',
        state: 'testnet',
        tone: 'info',
      },
      {
        id: 'pi-network',
        label: 'Pi Network',
        detail: 'Awaiting Testnet adapter',
        state: 'unavailable',
        tone: 'off',
      },
      {
        id: 'payments',
        label: 'Payments',
        detail: 'Disabled — no production charges',
        state: 'disconnected',
        tone: 'off',
      },
    ];

    return {
      environment: 'testnet',
      heroSubtitle: `${PRODUCT_HERO_SUPPORT} Testnet mode is reserved for future sandbox data.`,
      userSubtitle: 'Pi Testnet (stub)',
      capabilities: {
        canMutateBackend: false,
        showPresentationBadges: false,
        piAuthSimulated: false,
      },
      projects: {
        state: 'unavailable',
        items: [],
        errorMessage: 'Testnet project feed not wired',
      },
      agents: {
        state: 'unavailable',
        items: [],
        errorMessage: 'Testnet agents feed not wired',
      },
      marketplace: {
        state: 'unavailable',
        items: [],
        errorMessage: 'Testnet marketplace feed not wired',
      },
      activity: { state: 'empty', items: [] },
      systemStatus,
      systemStatusFootnote:
        'Testnet stub — replace this source with a real sandbox adapter later.',
      piBalance,
    };
  },
};

/** Production / normal authenticated studio — live APIs, no presentation catalog. */
export const productionHomeSource: HomeDataSource = {
  environment: 'production',
  async load(ctx: HomeDataSourceContext) {
    const [projectsResult, agentsResult, marketplaceResult] = await Promise.all([
      loadProjects(ctx.teamSlug),
      loadAgents(),
      loadMarketplacePreview(),
    ]);

    const systemStatus: HomeSystemStatusItem[] = [
      {
        id: 'session',
        label: 'Session',
        detail: ctx.isAuthenticated ? 'Signed in' : 'Signed out',
        state: ctx.isAuthenticated ? 'authenticated' : 'unauthenticated',
        tone: mapResourceStateToTone(
          ctx.isAuthenticated ? 'authenticated' : 'unauthenticated',
        ),
      },
      {
        id: 'workspaces',
        label: 'Workspaces API',
        detail:
          projectsResult.state === 'failed'
            ? 'Unavailable'
            : projectsResult.state === 'empty'
              ? 'Empty'
              : 'Responded',
        state:
          projectsResult.state === 'failed'
            ? 'failed'
            : projectsResult.state === 'empty'
              ? 'empty'
              : 'connected',
        tone: mapResourceStateToTone(
          projectsResult.state === 'failed'
            ? 'failed'
            : projectsResult.state === 'empty'
              ? 'empty'
              : 'connected',
        ),
      },
      {
        id: 'agents',
        label: 'My Agents API',
        detail:
          agentsResult.state === 'failed'
            ? 'Unavailable'
            : agentsResult.state === 'empty'
              ? 'Empty'
              : 'Responded',
        state:
          agentsResult.state === 'failed'
            ? 'failed'
            : agentsResult.state === 'empty'
              ? 'empty'
              : 'connected',
        tone: mapResourceStateToTone(
          agentsResult.state === 'failed'
            ? 'failed'
            : agentsResult.state === 'empty'
              ? 'empty'
              : 'connected',
        ),
      },
      {
        id: 'product',
        label: PRODUCT_NAME,
        detail: PRODUCT_HERO,
        state: 'production',
        tone: 'ok',
      },
    ];

    const activityItems = projectsResult.items.slice(0, 5).map((p) => ({
      id: `act-${p.id}`,
      title: `Workspace: ${p.name}`,
      detail: p.slug,
      at: p.updatedAt,
      isPresentationData: false as const,
    }));

    const piBalance: HomePiBalanceView = {
      ledgerEnvironment: 'PRODUCTION',
      displayAmount: null,
      currencySymbol: 'π',
      state: 'unavailable',
      paymentsEnabled: false,
      title: 'Pi Balance',
      footnote:
        'Production Pi wallet / payments are not activated from Home. Open Settings for billing when enabled by product flags.',
      ctaLabel: 'Open Settings',
      ctaHref: '/settings',
      isPresentationData: false,
    };

    return {
      environment: 'production',
      heroSubtitle: `${PRODUCT_HERO_SUPPORT} Start from a workspace, agent, or the Marketplace.`,
      userSubtitle: ctx.teamName || PRODUCT_NAME,
      capabilities: {
        canMutateBackend: true,
        showPresentationBadges: false,
        piAuthSimulated: false,
      },
      projects: projectsResult,
      agents: agentsResult,
      marketplace: marketplaceResult,
      activity:
        activityItems.length > 0
          ? { state: 'success', items: activityItems }
          : { state: 'empty', items: [] },
      systemStatus,
      systemStatusFootnote:
        'Based on session and recent API responses on this page — not infrastructure monitoring.',
      piBalance,
    };
  },
};

async function loadProjects(teamSlug?: string) {
  try {
    const data = await projectsApi.getAll(teamSlug);
    const list = (Array.isArray(data) ? data : []) as Array<Record<string, unknown>>;
    const items: HomeProjectItem[] = list
      .map((p) => ({
        id: (p.id as string) || '',
        name: (p.name as string) || 'Untitled workspace',
        slug: (p.slug as string) || '',
        updatedAt:
          (p.updated_at as string) || (p.created_at as string) || new Date(0).toISOString(),
        isPresentationData: false,
      }))
      .filter((p) => p.slug)
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      .slice(0, 6);
    return {
      state: (items.length ? 'success' : 'empty') as 'success' | 'empty',
      items,
    };
  } catch {
    return {
      state: 'failed' as const,
      items: [] as HomeProjectItem[],
      errorMessage: 'Could not load projects from the API.',
    };
  }
}

async function loadAgents() {
  try {
    const data = await marketplaceApi.getMyAgents();
    const list = unwrapList(data);
    const items: HomeAgentItem[] = list.slice(0, 6).map((a) => ({
      id: String(a.id ?? a.slug ?? ''),
      name: String(a.name ?? 'Agent'),
      description: (a.description as string) || null,
      icon: (a.icon as string) || (a.avatar_url as string) || null,
      statusLabel: 'Ready',
      statusState: 'success',
      isPresentationData: false,
    }));
    return {
      state: (items.length ? 'success' : 'empty') as 'success' | 'empty',
      items,
    };
  } catch {
    return {
      state: 'failed' as const,
      items: [] as HomeAgentItem[],
      errorMessage: 'Agents API did not respond.',
    };
  }
}

async function loadMarketplacePreview() {
  try {
    const [bases, skills, agentsList] = await Promise.all([
      marketplaceApi.getAllBases({ limit: 2, sort: 'popular' }).catch(() => null),
      marketplaceApi.getAllSkills({ limit: 1, sort: 'popular' }).catch(() => null),
      marketplaceApi.getAllAgents({ limit: 1, sort: 'popular' }).catch(() => null),
    ]);
    const items: HomeMarketplaceItem[] = [
      ...unwrapList(bases)
        .slice(0, 2)
        .map((b) => ({
          id: String(b.id ?? b.slug ?? ''),
          name: String(b.name ?? 'Template'),
          description: (b.description as string) || null,
          kind: 'template' as const,
          href: '/marketplace?type=base',
          isPresentationData: false,
        })),
      ...unwrapList(skills)
        .slice(0, 1)
        .map((s) => ({
          id: String(s.id ?? s.slug ?? ''),
          name: String(s.name ?? 'Skill'),
          description: (s.description as string) || null,
          kind: 'skill' as const,
          href: '/marketplace?type=skill',
          isPresentationData: false,
        })),
      ...unwrapList(agentsList)
        .slice(0, 1)
        .map((a) => ({
          id: String(a.id ?? a.slug ?? ''),
          name: String(a.name ?? 'Agent'),
          description: (a.description as string) || null,
          kind: 'agent' as const,
          href: '/marketplace?type=agent',
          isPresentationData: false,
        })),
    ].filter((i) => i.id);

    return {
      state: (items.length ? 'success' : 'empty') as 'success' | 'empty',
      items: items.slice(0, 4),
    };
  } catch {
    return {
      state: 'failed' as const,
      items: [] as HomeMarketplaceItem[],
      errorMessage: 'Catalog is empty or the API did not respond.',
    };
  }
}
