import { useState, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  FolderPlus,
  GitBranch,
  SquaresFour,
  Folder,
  FolderOpen,
  Package,
  Storefront,
  Robot,
  Sparkle,
} from '@phosphor-icons/react';
import { MoodyFace } from '../components/ui/MoodyFace';
import { CreateProjectModal, RepoImportModal } from '../components/modals';
import { projectsApi, tasksApi } from '../lib/api';
import { useTheme } from '../theme/ThemeContext';
import { PRODUCT_HERO, PRODUCT_NAME } from '../lib/branding';
import { useHomeDashboard } from '../home/useHomeDashboard';
import type { HomeResourceState } from '../home/types';
import {
  HomeTopBar,
  HomeHero,
  HomeSectionHeader,
  HomeQuickAction,
  HomeEmptyState,
  HomeIdentityCta,
  HomeSystemStatusPanel,
  HomeSectionLink,
  HomePiBalancePanel,
} from '../components/home/HomeStudioParts';

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

function agentStatusClass(state: HomeResourceState): string {
  if (state === 'connected' || state === 'success') {
    return 'border-[color-mix(in_srgb,var(--status-success)_35%,var(--border))] bg-[color-mix(in_srgb,var(--status-success)_12%,transparent)] text-[var(--status-success)]';
  }
  if (state === 'pending' || state === 'loading') {
    return 'border-[color-mix(in_srgb,var(--status-warning,#c9a227)_35%,var(--border))] bg-[color-mix(in_srgb,var(--status-warning,#c9a227)_12%,transparent)] text-[var(--status-warning,#c9a227)]';
  }
  return 'border-[var(--border)] bg-[var(--surface)] text-[var(--text-muted)]';
}

function listEmptyCopy(
  state: HomeResourceState,
  kind: 'projects' | 'agents' | 'marketplace',
  errorMessage?: string,
): { title: string; description: string } {
  if (state === 'simulated') {
    return {
      title: `No ${kind} presentation data`,
      description: 'Presentation catalog is empty for this slice.',
    };
  }
  if (state === 'failed') {
    return {
      title: `Could not load ${kind}`,
      description: errorMessage || 'The data source returned an error.',
    };
  }
  if (state === 'unavailable') {
    return {
      title: `${kind[0].toUpperCase()}${kind.slice(1)} unavailable`,
      description: errorMessage || 'This feed is not wired for the current data environment.',
    };
  }
  if (kind === 'projects') {
    return {
      title: 'No workspaces yet',
      description: 'Create a workspace to start building with AI for the Pi ecosystem.',
    };
  }
  if (kind === 'agents') {
    return {
      title: 'No agents yet',
      description: 'Add agents from the Marketplace or create one with @agent-builder.',
    };
  }
  return {
    title: 'No marketplace preview',
    description: 'Catalog is empty or the API did not respond.',
  };
}

export default function Home() {
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const { viewModel } = useHomeDashboard();

  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  const canMutate = viewModel.capabilities.canMutateBackend;
  const showBadges = viewModel.capabilities.showPresentationBadges;

  const handleCreateProject = useCallback(
    async (projectName: string, baseId?: string, baseVersion?: string) => {
      if (isCreating) return;
      if (!canMutate) {
        toast.error(
          `${viewModel.environment === 'demo' ? 'Local Demo' : 'Current'} mode is presentation-only — workspace creation requires a live backend.`,
        );
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
    [isCreating, navigate, canMutate, viewModel.environment],
  );

  const handleImportRepo = useCallback(
    async (provider: string, repoUrl: string, branch: string, projectName: string) => {
      if (isCreating) return;
      if (!canMutate) {
        toast.error(
          `${viewModel.environment === 'demo' ? 'Local Demo' : 'Current'} mode is presentation-only — importing requires a live backend.`,
        );
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
    [isCreating, navigate, canMutate, viewModel.environment],
  );

  const handleUpgrade = () => navigate('/settings/team/billing');
  const handleOpenProject = (slug: string, isPresentation?: boolean) => {
    if (isPresentation) {
      toast('Presentation workspace — open Workspaces to create a real project.', { icon: 'ℹ️' });
      return;
    }
    navigate(`/project/${slug}`);
  };

  const openCommandPalette = () => {
    window.dispatchEvent(new CustomEvent('tesslate-open-command-palette'));
  };

  const projectsCopy = listEmptyCopy(
    viewModel.projects.state,
    'projects',
    viewModel.projects.errorMessage,
  );
  const agentsCopy = listEmptyCopy(
    viewModel.agents.state,
    'agents',
    viewModel.agents.errorMessage,
  );
  const marketplaceCopy = listEmptyCopy(
    viewModel.marketplace.state,
    'marketplace',
    viewModel.marketplace.errorMessage,
  );

  return (
    <div className="h-full w-full overflow-y-auto studio-app-bg">
      <div className="mx-auto flex min-h-full w-full max-w-[1440px] flex-col gap-8 px-4 py-6 sm:gap-10 sm:px-6 sm:py-8 lg:px-8">
        <HomeTopBar
          userName={viewModel.userDisplayName}
          userSubtitle={viewModel.userSubtitle}
          theme={theme}
          searchPlaceholder="Search commands, workspaces, apps…"
          onToggleTheme={toggleTheme}
          onOpenSearch={openCommandPalette}
          onOpenSettings={() => navigate('/settings')}
        />

        <HomeHero
          greeting={`Welcome back, ${viewModel.greetingName}`}
          subtitle={viewModel.heroSubtitle}
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
              <span>{viewModel.planLabel} Plan</span>
              {viewModel.showUpgrade && (
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
              {viewModel.environment !== 'production' && (
                <>
                  <span aria-hidden="true"> · </span>
                  <span className="text-[var(--accent-gold,#C9A227)] uppercase tracking-wide text-[10px] font-semibold">
                    {viewModel.environment}
                  </span>
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
              badge={!canMutate ? 'Demo' : undefined}
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
              badge={!canMutate ? 'Demo' : undefined}
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
                subtitle={
                  showBadges
                    ? 'Presentation catalog (demo:) — swap source for Testnet/Production later'
                    : 'Workspaces from the active data source'
                }
                action={<HomeSectionLink to="/dashboard">View all</HomeSectionLink>}
              />
              {viewModel.projects.state === 'loading' ? (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {[0, 1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className="h-[5.25rem] animate-pulse rounded-2xl border border-[var(--border)] bg-[var(--surface)]"
                    />
                  ))}
                </div>
              ) : viewModel.projects.items.length > 0 ? (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {viewModel.projects.items.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => handleOpenProject(p.slug, p.isPresentationData)}
                      className="group relative flex items-start gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface)]/80 p-4 text-left transition hover:border-[color-mix(in_srgb,var(--primary)_40%,var(--border))] hover:shadow-[0_0_28px_-16px_rgba(124,58,237,0.55)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
                      data-presentation={p.isPresentationData ? 'true' : 'false'}
                    >
                      {p.isPresentationData && (
                        <span className="absolute right-3 top-3 rounded-full border border-[color-mix(in_srgb,var(--accent-gold,#C9A227)_40%,var(--border))] px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-[var(--accent-gold,#C9A227)]">
                          Demo
                        </span>
                      )}
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--primary)]/14 text-[var(--primary)]">
                        <Folder size={20} weight="duotone" />
                      </span>
                      <span className="min-w-0 flex-1 pr-10">
                        <span className="block truncate text-sm font-semibold text-[var(--text)] group-hover:text-[var(--primary)]">
                          {p.name}
                        </span>
                        <span className="mt-0.5 block truncate text-[11px] text-[var(--text-muted)]">
                          {p.slug}
                        </span>
                        {p.stackLabels && p.stackLabels.length > 0 && (
                          <span className="mt-1 flex flex-wrap gap-1">
                            {p.stackLabels.map((label) => (
                              <span
                                key={label}
                                className="rounded-md border border-[var(--border)] px-1.5 py-0.5 text-[9px] text-[var(--text-muted)]"
                              >
                                {label}
                              </span>
                            ))}
                          </span>
                        )}
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
                  title={projectsCopy.title}
                  description={projectsCopy.description}
                  actionLabel="New Workspace"
                  onAction={() => setShowCreateDialog(true)}
                />
              )}
            </section>

            <section aria-labelledby="home-agents">
              <HomeSectionHeader
                id="home-agents"
                title="My Agents"
                subtitle={
                  showBadges
                    ? 'Presentation agents for UI state coverage'
                    : 'Agents from the active data source'
                }
                action={<HomeSectionLink to="/chat">Open Agents</HomeSectionLink>}
              />
              {viewModel.agents.state === 'loading' ? (
                <div className="space-y-2">
                  {[0, 1, 2].map((i) => (
                    <div
                      key={i}
                      className="h-16 animate-pulse rounded-2xl border border-[var(--border)] bg-[var(--surface)]"
                    />
                  ))}
                </div>
              ) : viewModel.agents.items.length > 0 ? (
                <ul className="space-y-2">
                  {viewModel.agents.items.map((agent) => (
                    <li key={agent.id}>
                      <button
                        type="button"
                        onClick={() => navigate('/chat')}
                        className="relative flex w-full items-center gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface)]/80 px-4 py-3 text-left transition hover:border-[color-mix(in_srgb,var(--primary)_35%,var(--border))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
                        data-presentation={agent.isPresentationData ? 'true' : 'false'}
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
                            {agent.isPresentationData && (
                              <span className="ml-2 text-[9px] font-bold uppercase tracking-wide text-[var(--accent-gold,#C9A227)]">
                                Demo
                              </span>
                            )}
                          </span>
                          <span className="block truncate text-xs text-[var(--text-muted)]">
                            {agent.description || 'Marketplace agent'}
                          </span>
                        </span>
                        <span
                          className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${agentStatusClass(agent.statusState)}`}
                        >
                          {agent.statusLabel}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <HomeEmptyState
                  icon={<Robot size={20} />}
                  title={agentsCopy.title}
                  description={agentsCopy.description}
                  actionLabel="Browse Agents"
                  actionTo="/marketplace?type=agent"
                />
              )}
            </section>

            <section aria-labelledby="home-marketplace">
              <HomeSectionHeader
                id="home-marketplace"
                title="Explore Marketplace"
                subtitle={
                  showBadges
                    ? 'Presentation marketplace cards (not live catalog)'
                    : 'Preview from the active catalog source'
                }
                action={<HomeSectionLink to="/marketplace">Marketplace</HomeSectionLink>}
              />
              {viewModel.marketplace.state === 'loading' ? (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  {[0, 1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className="h-36 animate-pulse rounded-2xl border border-[var(--border)] bg-[var(--surface)]"
                    />
                  ))}
                </div>
              ) : viewModel.marketplace.items.length > 0 ? (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  {viewModel.marketplace.items.map((item) => (
                    <Link
                      key={`${item.kind}-${item.id}`}
                      to={item.href}
                      className="group relative rounded-2xl border border-[var(--border)] bg-[var(--surface)]/80 p-4 transition hover:-translate-y-0.5 hover:border-[color-mix(in_srgb,var(--primary)_40%,var(--border))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
                      data-presentation={item.isPresentationData ? 'true' : 'false'}
                    >
                      {item.isPresentationData && (
                        <span className="absolute right-3 top-3 rounded-full border border-[color-mix(in_srgb,var(--accent-gold,#C9A227)_40%,var(--border))] px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-[var(--accent-gold,#C9A227)]">
                          Demo
                        </span>
                      )}
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
                      {item.ratingLabel && (
                        <p className="mt-2 text-[10px] text-[var(--accent-gold,#C9A227)]">
                          {item.ratingLabel}
                        </p>
                      )}
                    </Link>
                  ))}
                </div>
              ) : (
                <HomeEmptyState
                  icon={<Storefront size={20} />}
                  title={marketplaceCopy.title}
                  description={marketplaceCopy.description}
                  actionLabel="Open Marketplace"
                  actionTo="/marketplace"
                />
              )}
            </section>
          </div>

          <aside className="min-w-0 space-y-6 xl:col-span-4">
            <HomeSystemStatusPanel
              title="System status"
              footnote={viewModel.systemStatusFootnote}
              items={viewModel.systemStatus.map((s) => ({
                id: s.id,
                label: s.label,
                detail: s.detail,
                tone: s.tone,
              }))}
            />

            <HomePiBalancePanel {...viewModel.piBalance} />

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
                {showBadges
                  ? 'Presentation activity timeline (demo data).'
                  : 'Summary from the active data source.'}
              </p>
              {viewModel.activity.state === 'loading' ? (
                <div className="space-y-2">
                  {[0, 1, 2].map((i) => (
                    <div key={i} className="h-8 animate-pulse rounded-lg bg-[var(--surface)]" />
                  ))}
                </div>
              ) : viewModel.activity.items.length > 0 ? (
                <ul className="space-y-3">
                  {viewModel.activity.items.map((item) => (
                    <li key={item.id} className="flex gap-3">
                      <div className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-[var(--primary)]" />
                      <div className="min-w-0">
                        <p className="truncate text-xs text-[var(--text)]">
                          {item.title}
                          {item.isPresentationData && (
                            <span className="ml-1 text-[9px] font-bold uppercase text-[var(--accent-gold,#C9A227)]">
                              Demo
                            </span>
                          )}
                        </p>
                        {item.detail && (
                          <p className="truncate text-[10px] text-[var(--text-muted)]">
                            {item.detail}
                          </p>
                        )}
                        <p className="text-[10px] text-[var(--text-muted)]">
                          {formatRelativeTime(item.at) || '—'}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs leading-relaxed text-[var(--text-muted)]">
                  {viewModel.activity.state === 'unavailable'
                    ? 'Activity feed unavailable for this environment.'
                    : 'Nothing to show yet.'}
                </p>
              )}
            </section>

            <div className="rounded-2xl border border-[var(--border)] studio-surface p-4">
              <p className="text-xs font-semibold text-[var(--text)] mb-1">{PRODUCT_NAME}</p>
              <p className="mb-3 text-[11px] leading-relaxed text-[var(--text-muted)]">
                Data environment:{' '}
                <span className="font-semibold uppercase text-[var(--accent-gold,#C9A227)]">
                  {viewModel.environment}
                </span>
                . Swap the Home data source later for Pi Testnet without redesigning this UI.
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
