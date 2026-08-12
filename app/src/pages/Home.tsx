import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  FolderPlus,
  GitBranch,
  SquaresFour,
  Folder,
  FolderOpen,
  Plus,
  Package,
  Storefront,
  Robot,
  Sparkle,
} from '@phosphor-icons/react';
import { MoodyFace } from '../components/ui/MoodyFace';
import { CreateProjectModal, RepoImportModal } from '../components/modals';
import { projectsApi, tasksApi, marketplaceApi } from '../lib/api';
import { useTeam } from '../contexts/TeamContext';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../theme/ThemeContext';
import { isLocalDemoModeActive } from '../lib/localDemoMode';
import {
  PRODUCT_HERO,
  PRODUCT_HERO_SUPPORT,
  PRODUCT_NAME,
} from '../lib/branding';
import {
  HomeTopBar,
  HomeHero,
  HomeSectionHeader,
  HomeQuickAction,
  HomeEmptyState,
  HomeIdentityCta,
  HomeSystemStatusPanel,
  HomeSectionLink,
} from '../components/home/HomeStudioParts';

type RecentProject = {
  id: string;
  name: string;
  slug: string;
  updatedAt: string;
};

type AgentRow = {
  id: string;
  name: string;
  description?: string | null;
  icon?: string | null;
};

type PreviewItem = {
  id: string;
  name: string;
  description?: string | null;
  kind: 'template' | 'skill' | 'agent';
};

const RELATIVE_UNITS: Array<[Intl.RelativeTimeFormatUnit, number]> = [
  ['year', 60 * 60 * 24 * 365],
  ['month', 60 * 60 * 24 * 30],
  ['week', 60 * 60 * 24 * 7],
  ['day', 60 * 60 * 24],
  ['hour', 60 * 60],
  ['minute', 60],
  ['second', 1],
];

function formatRelativeTime(iso: string): string {
  if (!iso) return '';
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return '';
  const deltaSec = Math.round((then - Date.now()) / 1000);
  const formatter = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto', style: 'short' });
  for (const [unit, secondsInUnit] of RELATIVE_UNITS) {
    if (Math.abs(deltaSec) >= secondsInUnit || unit === 'second') {
      return formatter.format(Math.round(deltaSec / secondsInUnit), unit);
    }
  }
  return '';
}

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

export default function Home() {
  const navigate = useNavigate();
  const { activeTeam, teamSwitchKey } = useTeam();
  const { user, authMethod } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const demo = authMethod === 'local_demo' || isLocalDemoModeActive();

  const greetingName = (user?.name?.split(' ')[0] || user?.username || user?.name || 'there').trim();

  const [recent, setRecent] = useState<RecentProject[]>([]);
  const [recentLoading, setRecentLoading] = useState(true);
  const [recentFailed, setRecentFailed] = useState(false);

  const [agents, setAgents] = useState<AgentRow[]>([]);
  const [agentsLoading, setAgentsLoading] = useState(true);
  const [agentsFailed, setAgentsFailed] = useState(false);

  const [previewItems, setPreviewItems] = useState<PreviewItem[]>([]);
  const [previewLoading, setPreviewLoading] = useState(true);

  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  const subscriptionTier = activeTeam?.subscription_tier || 'free';
  const tierLabel = useMemo(
    () => subscriptionTier.charAt(0).toUpperCase() + subscriptionTier.slice(1),
    [subscriptionTier],
  );
  const isPaidPlan = subscriptionTier !== 'free';

  useEffect(() => {
    let cancelled = false;
    setRecentLoading(true);
    setRecentFailed(false);
    projectsApi
      .getAll(activeTeam?.slug)
      .then((data: unknown) => {
        if (cancelled) return;
        const list = (Array.isArray(data) ? data : []) as Array<Record<string, unknown>>;
        const mapped: RecentProject[] = list
          .map((p) => ({
            id: (p.id as string) || '',
            name: (p.name as string) || 'Untitled workspace',
            slug: (p.slug as string) || '',
            updatedAt:
              (p.updated_at as string) || (p.created_at as string) || new Date(0).toISOString(),
          }))
          .filter((p) => p.slug)
          .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
          .slice(0, 6);
        setRecent(mapped);
      })
      .catch(() => {
        if (!cancelled) {
          setRecent([]);
          setRecentFailed(true);
        }
      })
      .finally(() => {
        if (!cancelled) setRecentLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [activeTeam?.slug, teamSwitchKey]);

  useEffect(() => {
    let cancelled = false;
    setAgentsLoading(true);
    setAgentsFailed(false);
    marketplaceApi
      .getMyAgents()
      .then((data: unknown) => {
        if (cancelled) return;
        const list = unwrapList(data);
        setAgents(
          list.slice(0, 6).map((a) => ({
            id: String(a.id ?? a.slug ?? ''),
            name: String(a.name ?? 'Agent'),
            description: (a.description as string) || null,
            icon: (a.icon as string) || (a.avatar_url as string) || null,
          })),
        );
      })
      .catch(() => {
        if (!cancelled) {
          setAgents([]);
          setAgentsFailed(true);
        }
      })
      .finally(() => {
        if (!cancelled) setAgentsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    setPreviewLoading(true);
    Promise.all([
      marketplaceApi.getAllBases({ limit: 2, sort: 'popular' }).catch(() => null),
      marketplaceApi.getAllSkills({ limit: 1, sort: 'popular' }).catch(() => null),
      marketplaceApi.getAllAgents({ limit: 1, sort: 'popular' }).catch(() => null),
    ])
      .then(([bases, skills, agentsList]) => {
        if (cancelled) return;
        const items: PreviewItem[] = [
          ...unwrapList(bases)
            .slice(0, 2)
            .map((b) => ({
              id: String(b.id ?? b.slug ?? ''),
              name: String(b.name ?? 'Template'),
              description: (b.description as string) || null,
              kind: 'template' as const,
            })),
          ...unwrapList(skills)
            .slice(0, 1)
            .map((s) => ({
              id: String(s.id ?? s.slug ?? ''),
              name: String(s.name ?? 'Skill'),
              description: (s.description as string) || null,
              kind: 'skill' as const,
            })),
          ...unwrapList(agentsList)
            .slice(0, 1)
            .map((a) => ({
              id: String(a.id ?? a.slug ?? ''),
              name: String(a.name ?? 'Agent'),
              description: (a.description as string) || null,
              kind: 'agent' as const,
            })),
        ].filter((i) => i.id);
        setPreviewItems(items.slice(0, 4));
      })
      .finally(() => {
        if (!cancelled) setPreviewLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleCreateProject = useCallback(
    async (projectName: string, baseId?: string, baseVersion?: string) => {
      if (isCreating) return;
      if (demo) {
        toast.error('Local Demo Mode is UI-only — workspace creation requires a backend.');
        return;
      }
      setIsCreating(true);
      const creatingToast = toast.loading('Creating workspace...');
      try {
        const response = await projectsApi.create(
          projectName,
          '',
          'base',
          undefined,
          'main',
          baseId,
          baseVersion || undefined,
        );
        const project = response.project;
        const taskId = response.task_id;
        if (taskId) {
          toast.loading('Setting up workspace...', { id: creatingToast });
          try {
            await tasksApi.pollUntilComplete(taskId);
            toast.success('Workspace created!', { id: creatingToast, duration: 2000 });
            setShowCreateDialog(false);
            setIsCreating(false);
            navigate(`/project/${project.slug}/setup`);
          } catch (taskError) {
            const taskErrMsg = taskError instanceof Error ? taskError.message : 'Setup failed';
            toast.error(taskErrMsg, { id: creatingToast });
            setIsCreating(false);
            navigate(`/project/${project.slug}`);
          }
        } else {
          toast.success('Workspace created!', { id: creatingToast, duration: 2000 });
          setShowCreateDialog(false);
          setIsCreating(false);
          navigate(`/project/${project.slug}/setup`);
        }
      } catch (error: unknown) {
        const err = error as { response?: { data?: { detail?: string } } };
        const detail = err?.response?.data?.detail;
        const errorMessage = typeof detail === 'string' ? detail : 'Failed to create workspace';
        toast.error(errorMessage, { id: creatingToast });
        setIsCreating(false);
      }
    },
    [isCreating, navigate, demo],
  );

  const handleImportRepo = useCallback(
    async (provider: string, repoUrl: string, branch: string, projectName: string) => {
      if (isCreating) return;
      if (demo) {
        toast.error('Local Demo Mode is UI-only — importing requires a backend.');
        return;
      }
      setIsCreating(true);
      const creatingToast = toast.loading(`Importing from ${provider}...`);
      try {
        const response = await projectsApi.create(
          projectName,
          '',
          provider as 'github' | 'gitlab' | 'bitbucket',
          repoUrl,
          branch,
          undefined,
        );
        const project = response.project;
        const taskId = response.task_id;
        if (taskId) {
          toast.loading('Setting up workspace...', { id: creatingToast });
          try {
            await tasksApi.pollUntilComplete(taskId);
            toast.success('Workspace imported!', { id: creatingToast, duration: 2000 });
            setShowImportDialog(false);
            setIsCreating(false);
            navigate(`/project/${project.slug}/setup`);
          } catch (taskError) {
            const taskErrMsg = taskError instanceof Error ? taskError.message : 'Import failed';
            toast.error(taskErrMsg, { id: creatingToast });
            setIsCreating(false);
            navigate(`/project/${project.slug}`);
          }
        } else {
          toast.success('Workspace imported!', { id: creatingToast, duration: 2000 });
          setShowImportDialog(false);
          setIsCreating(false);
          navigate(`/project/${project.slug}/setup`);
        }
      } catch (error: unknown) {
        const err = error as { response?: { data?: { detail?: string } } };
        const detail = err?.response?.data?.detail;
        const errorMessage = typeof detail === 'string' ? detail : 'Failed to import workspace';
        toast.error(errorMessage, { id: creatingToast });
        setIsCreating(false);
      }
    },
    [isCreating, navigate, demo],
  );

  const handleUpgrade = () => navigate('/settings/team/billing');
  const handleOpenProject = (slug: string) => navigate(`/project/${slug}`);

  const openCommandPalette = () => {
    window.dispatchEvent(new CustomEvent('tesslate-open-command-palette'));
  };

  const statusItems = demo
    ? [
        { label: 'Local Demo', detail: 'UI preview only · DEV', tone: 'demo' as const },
        { label: 'AI / Backend', detail: 'Not connected', tone: 'off' as const },
        { label: 'Pi Network', detail: 'No Pi authentication', tone: 'off' as const },
        { label: 'Database', detail: 'API unused in demo', tone: 'off' as const },
      ]
    : [
        {
          label: 'Session',
          detail: user ? 'Signed in' : 'Signed out',
          tone: (user ? 'ok' : 'off') as 'ok' | 'off',
        },
        {
          label: 'Workspaces API',
          detail: recentFailed ? 'Unavailable' : recentLoading ? 'Checking…' : 'Responded',
          tone: (recentFailed ? 'warn' : recentLoading ? 'off' : 'ok') as 'ok' | 'warn' | 'off',
        },
        {
          label: 'My Agents API',
          detail: agentsFailed ? 'Unavailable' : agentsLoading ? 'Checking…' : 'Responded',
          tone: (agentsFailed ? 'warn' : agentsLoading ? 'off' : 'ok') as 'ok' | 'warn' | 'off',
        },
        {
          label: PRODUCT_NAME,
          detail: PRODUCT_HERO,
          tone: 'ok' as const,
        },
      ];

  return (
    <div className="h-full w-full overflow-y-auto studio-app-bg">
      <div className="mx-auto flex min-h-full w-full max-w-[1440px] flex-col gap-8 px-4 py-6 sm:gap-10 sm:px-6 sm:py-8 lg:px-8">
        <HomeTopBar
          userName={user?.name || user?.username || 'User'}
          userSubtitle={demo ? 'Local Demo' : activeTeam?.name || PRODUCT_NAME}
          theme={theme}
          searchPlaceholder="Search commands, workspaces, apps…"
          onToggleTheme={toggleTheme}
          onOpenSearch={openCommandPalette}
          onOpenSettings={() => navigate('/settings')}
        />

        <HomeHero
          greeting={`Welcome back, ${greetingName}`}
          subtitle={
            demo
              ? `${PRODUCT_HERO_SUPPORT} Local Demo is UI-only — no backend or Pi auth.`
              : `${PRODUCT_HERO_SUPPORT} Start from a workspace, agent, or the Marketplace.`
          }
          primaryCta={{
            label: 'New Workspace',
            onClick: () => setShowCreateDialog(true),
          }}
          secondaryCta={{
            label: 'Explore Marketplace',
            onClick: () => navigate('/marketplace'),
          }}
          planLine={
            <p className="w-full text-xs text-[var(--text-muted)] sm:w-auto sm:ml-1">
              <span>{tierLabel} Plan</span>
              {!isPaidPlan && !demo && (
                <>
                  <span aria-hidden="true"> · </span>
                  <button
                    type="button"
                    onClick={handleUpgrade}
                    className="text-[var(--accent-gold,#C9A227)] hover:underline focus-visible:outline-none focus-visible:underline"
                  >
                    Upgrade
                  </button>
                </>
              )}
              {demo && (
                <>
                  <span aria-hidden="true"> · </span>
                  <span className="text-[var(--accent-gold,#C9A227)]">Demo</span>
                </>
              )}
            </p>
          }
        />

        <section aria-labelledby="home-quick-actions">
          <HomeSectionHeader
            id="home-quick-actions"
            title="Quick start"
            subtitle="Actions wired to existing studio routes and dialogs"
          />
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            <HomeQuickAction
              icon={<FolderPlus size={20} weight="duotone" />}
              title="New Workspace"
              description="Create a project from a template"
              onClick={() => setShowCreateDialog(true)}
              badge={demo ? 'Demo' : undefined}
            />
            <HomeQuickAction
              icon={<Sparkle size={20} weight="duotone" />}
              title="Create App"
              description="Browse and install Marketplace apps"
              onClick={() => navigate('/marketplace?type=app')}
            />
            <HomeQuickAction
              icon={<MoodyFace size={20} animate trackPointer className="text-[var(--primary)]" />}
              title="Create Agent"
              description="Open Agents or start @agent-builder"
              onClick={() =>
                navigate('/chat', { state: { landingPrompt: '@agent-builder ' } })
              }
            />
            <HomeQuickAction
              icon={<GitBranch size={20} weight="duotone" />}
              title="Import Project"
              description="Clone from GitHub, GitLab, or Bitbucket"
              onClick={() => setShowImportDialog(true)}
              badge={demo ? 'Demo' : undefined}
            />
            <HomeQuickAction
              icon={<Storefront size={20} weight="duotone" />}
              title="Marketplace"
              description="Templates, skills, connectors, apps"
              onClick={() => navigate('/marketplace')}
            />
          </div>
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => navigate('/apps/installed')}
              className="flex items-center gap-3 rounded-2xl border border-[var(--border)] studio-surface px-4 py-3 text-left transition hover:border-[var(--border-hover)] hover:bg-[var(--surface-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
            >
              <SquaresFour size={18} className="text-[var(--primary)]" />
              <span className="min-w-0">
                <span className="block text-sm font-semibold text-[var(--text)]">My Apps</span>
                <span className="block text-[11px] text-[var(--text-muted)]">
                  Installed apps in your workspaces
                </span>
              </span>
            </button>
            <button
              type="button"
              onClick={() => navigate('/library?tab=mcp_servers')}
              className="flex items-center gap-3 rounded-2xl border border-[var(--border)] studio-surface px-4 py-3 text-left transition hover:border-[var(--border-hover)] hover:bg-[var(--surface-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
            >
              <Package size={18} className="text-[var(--primary)]" />
              <span className="min-w-0">
                <span className="block text-sm font-semibold text-[var(--text)]">Connectors</span>
                <span className="block text-[11px] text-[var(--text-muted)]">
                  MCP connectors in your Library
                </span>
              </span>
            </button>
          </div>
        </section>

        <div className="grid grid-cols-1 gap-8 xl:grid-cols-12 xl:gap-8">
          <div className="min-w-0 space-y-8 xl:col-span-8">
            <section aria-labelledby="home-recent-projects">
              <HomeSectionHeader
                id="home-recent-projects"
                title="Recent projects"
                subtitle="Workspaces from the projects API when available"
                action={<HomeSectionLink to="/dashboard">View all</HomeSectionLink>}
              />
              {recentLoading ? (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {[0, 1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className="h-[5.25rem] animate-pulse rounded-2xl border border-[var(--border)] bg-[var(--surface)]"
                    />
                  ))}
                </div>
              ) : recent.length > 0 ? (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {recent.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => handleOpenProject(p.slug)}
                      className="group flex items-start gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface)]/80 p-4 text-left transition hover:border-[color-mix(in_srgb,var(--primary)_40%,var(--border))] hover:shadow-[0_0_28px_-16px_rgba(124,58,237,0.55)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
                    >
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--primary)]/14 text-[var(--primary)]">
                        <Folder size={20} weight="duotone" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold text-[var(--text)] group-hover:text-[var(--primary)]">
                          {p.name}
                        </span>
                        <span className="mt-0.5 block truncate text-[11px] text-[var(--text-muted)]">
                          {activeTeam?.slug ? `${activeTeam.slug}/` : ''}
                          {p.slug}
                        </span>
                        <span
                          className="mt-2 block text-[10px] uppercase tracking-wide text-[var(--text-subtle)]"
                          title={new Date(p.updatedAt).toLocaleString()}
                        >
                          {formatRelativeTime(p.updatedAt) || 'Recently'}
                        </span>
                      </span>
                    </button>
                  ))}
                </div>
              ) : (
                <HomeEmptyState
                  icon={<FolderOpen size={20} />}
                  title={demo || recentFailed ? 'No workspace data' : 'No workspaces yet'}
                  description={
                    demo
                      ? 'Local Demo does not call the backend — an empty list is expected.'
                      : recentFailed
                        ? 'Could not load projects from the API.'
                        : 'Create a workspace to start building with AI for the Pi ecosystem.'
                  }
                  actionLabel="New Workspace"
                  onAction={() => setShowCreateDialog(true)}
                />
              )}
            </section>

            <section aria-labelledby="home-agents">
              <HomeSectionHeader
                id="home-agents"
                title="My Agents"
                subtitle="Agents linked to your account when the API returns data"
                action={<HomeSectionLink to="/chat">Open Agents</HomeSectionLink>}
              />
              {agentsLoading ? (
                <div className="space-y-2">
                  {[0, 1, 2].map((i) => (
                    <div
                      key={i}
                      className="h-16 animate-pulse rounded-2xl border border-[var(--border)] bg-[var(--surface)]"
                    />
                  ))}
                </div>
              ) : agents.length > 0 ? (
                <ul className="space-y-2">
                  {agents.map((agent) => (
                    <li key={agent.id}>
                      <button
                        type="button"
                        onClick={() => navigate('/chat')}
                        className="flex w-full items-center gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface)]/80 px-4 py-3 text-left transition hover:border-[color-mix(in_srgb,var(--primary)_35%,var(--border))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
                      >
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-[var(--primary)]/12 text-lg">
                          {agent.icon && String(agent.icon).startsWith('http') ? (
                            <img src={agent.icon} alt="" className="h-full w-full object-cover" />
                          ) : (
                            agent.icon || '🤖'
                          )}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-semibold text-[var(--text)]">
                            {agent.name}
                          </span>
                          <span className="block truncate text-xs text-[var(--text-muted)]">
                            {agent.description || 'Marketplace agent'}
                          </span>
                        </span>
                        <span className="shrink-0 rounded-full border border-[color-mix(in_srgb,var(--status-success)_35%,var(--border))] bg-[color-mix(in_srgb,var(--status-success)_12%,transparent)] px-2 py-0.5 text-[10px] font-semibold text-[var(--status-success)]">
                          Ready
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <HomeEmptyState
                  icon={<Robot size={20} />}
                  title={demo || agentsFailed ? 'No agent data' : 'No agents yet'}
                  description={
                    demo
                      ? 'Local Demo does not load agents from the backend.'
                      : agentsFailed
                        ? 'Agents API did not respond.'
                        : 'Add agents from the Marketplace or create one with @agent-builder.'
                  }
                  actionLabel="Browse Agents"
                  actionTo="/marketplace?type=agent"
                />
              )}
            </section>

            <section aria-labelledby="home-marketplace">
              <HomeSectionHeader
                id="home-marketplace"
                title="Explore Marketplace"
                subtitle="Preview from catalog APIs (templates / skills / agents)"
                action={<HomeSectionLink to="/marketplace">Marketplace</HomeSectionLink>}
              />
              {previewLoading ? (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  {[0, 1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className="h-36 animate-pulse rounded-2xl border border-[var(--border)] bg-[var(--surface)]"
                    />
                  ))}
                </div>
              ) : previewItems.length > 0 ? (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  {previewItems.map((item) => (
                    <Link
                      key={`${item.kind}-${item.id}`}
                      to={
                        item.kind === 'template'
                          ? '/marketplace?type=base'
                          : item.kind === 'skill'
                            ? '/marketplace?type=skill'
                            : '/marketplace?type=agent'
                      }
                      className="group rounded-2xl border border-[var(--border)] bg-[var(--surface)]/80 p-4 transition hover:-translate-y-0.5 hover:border-[color-mix(in_srgb,var(--primary)_40%,var(--border))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
                    >
                      <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--primary)]/14 text-[var(--primary)]">
                        {item.kind === 'agent' ? (
                          <Robot size={20} />
                        ) : item.kind === 'skill' ? (
                          <Sparkle size={20} />
                        ) : (
                          <Package size={20} />
                        )}
                      </div>
                      <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                        {item.kind}
                      </p>
                      <p className="line-clamp-1 text-sm font-semibold text-[var(--text)] group-hover:text-[var(--primary)]">
                        {item.name}
                      </p>
                      <p className="mt-1 line-clamp-2 text-xs text-[var(--text-muted)]">
                        {item.description || '—'}
                      </p>
                    </Link>
                  ))}
                </div>
              ) : (
                <HomeEmptyState
                  icon={<Storefront size={20} />}
                  title="No marketplace preview"
                  description={
                    demo
                      ? 'Local Demo does not load the catalog — open Marketplace to explore the UI.'
                      : 'Catalog is empty or the API did not respond.'
                  }
                  actionLabel="Open Marketplace"
                  actionTo="/marketplace"
                />
              )}
            </section>
          </div>

          <aside className="min-w-0 space-y-6 xl:col-span-4">
            <HomeSystemStatusPanel
              title="System status"
              demoMode={demo}
              footnote={
                demo
                  ? 'Status reflects Local Demo — not production health.'
                  : 'Based on session and recent API responses on this page — not infrastructure monitoring.'
              }
              items={statusItems}
            />

            <section
              aria-labelledby="home-activity"
              className="rounded-2xl border border-[var(--border)] studio-surface p-4 sm:p-5"
            >
              <h2
                id="home-activity"
                className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)]"
              >
                Recent activity
              </h2>
              <p className="mt-1 mb-4 text-[11px] text-[var(--text-subtle)]">
                {demo
                  ? 'No activity feed in Local Demo.'
                  : 'Summary from workspaces loaded on this page.'}
              </p>
              {!demo && recent.length > 0 ? (
                <ul className="space-y-3">
                  {recent.slice(0, 5).map((p) => (
                    <li key={`act-${p.id}`} className="flex gap-3">
                      <div className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-[var(--primary)]" />
                      <div className="min-w-0">
                        <p className="truncate text-xs text-[var(--text)]">Workspace: {p.name}</p>
                        <p className="text-[10px] text-[var(--text-muted)]">
                          {formatRelativeTime(p.updatedAt) || '—'}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs leading-relaxed text-[var(--text-muted)]">
                  {demo
                    ? 'Demo does not invent an activity timeline.'
                    : 'Nothing to show yet.'}
                </p>
              )}
            </section>

            <div className="rounded-2xl border border-[color-mix(in_srgb,var(--accent-gold,#C9A227)_28%,var(--border))] bg-[color-mix(in_srgb,var(--accent-gold,#C9A227)_8%,var(--surface))] p-4">
              <div className="mb-2 flex items-center gap-2">
                <Plus size={14} className="text-[var(--accent-gold,#C9A227)]" weight="bold" />
                <p className="text-xs font-semibold text-[var(--text)]">{PRODUCT_NAME}</p>
              </div>
              <p className="mb-3 text-[11px] leading-relaxed text-[var(--text-muted)]">
                {demo
                  ? 'Upgrades and Pi wallet belong to production flows — not activated in Local Demo.'
                  : 'Manage team billing and preferences from Settings when you are ready.'}
              </p>
              <Link
                to="/settings"
                className="inline-flex text-xs font-semibold text-[var(--primary)] hover:underline focus-visible:outline-none focus-visible:underline"
              >
                Open Settings
              </Link>
            </div>
          </aside>
        </div>

        <HomeIdentityCta
          title={PRODUCT_HERO}
          subtitle={`${PRODUCT_NAME} — an AI developer platform for the Pi ecosystem.`}
          primaryLabel="Create workspace"
          onPrimary={() => setShowCreateDialog(true)}
          secondaryLabel="Explore Marketplace"
          onSecondary={() => navigate('/marketplace')}
        />
      </div>

      <CreateProjectModal
        isOpen={showCreateDialog}
        onClose={() => setShowCreateDialog(false)}
        onConfirm={handleCreateProject}
        isLoading={isCreating}
      />
      <RepoImportModal
        isOpen={showImportDialog}
        onClose={() => setShowImportDialog(false)}
        onCreateProject={handleImportRepo}
      />
    </div>
  );
}
