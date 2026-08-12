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
  ArrowRight,
  Code,
  Cube,
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
import '../components/home/homeStudio.css';

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
  const formatter = new Intl.RelativeTimeFormat('vi', { numeric: 'auto', style: 'short' });
  for (const [unit, secondsInUnit] of RELATIVE_UNITS) {
    if (Math.abs(deltaSec) >= secondsInUnit || unit === 'second') {
      return formatter.format(Math.round(deltaSec / secondsInUnit), unit);
    }
  }
  return '';
}

function agentStatusClass(state: HomeResourceState): string {
  if (state === 'connected' || state === 'success') {
    return 'border-[rgba(34,197,94,0.4)] bg-[rgba(34,197,94,0.14)] text-[#4ADE80]';
  }
  if (state === 'pending' || state === 'loading') {
    return 'border-[rgba(245,185,66,0.45)] bg-[rgba(245,185,66,0.14)] text-[#FBBF24]';
  }
  return 'border-white/10 bg-white/5 text-white/55';
}

function listEmptyCopy(
  state: HomeResourceState,
  kind: 'projects' | 'agents' | 'marketplace',
  errorMessage?: string,
): { title: string; description: string } {
  if (state === 'failed') {
    return {
      title: `Không tải được ${kind}`,
      description: errorMessage || 'Nguồn dữ liệu trả về lỗi.',
    };
  }
  if (state === 'unavailable') {
    return {
      title: `${kind} chưa khả dụng`,
      description: errorMessage || 'Feed chưa được nối cho môi trường hiện tại.',
    };
  }
  if (kind === 'projects') {
    return {
      title: 'Chưa có workspace',
      description: 'Tạo workspace để bắt đầu xây dựng với AI cho hệ sinh thái Pi.',
    };
  }
  if (kind === 'agents') {
    return {
      title: 'Chưa có agent',
      description: 'Thêm agent từ Marketplace hoặc tạo với @agent-builder.',
    };
  }
  return {
    title: 'Chưa có preview Marketplace',
    description: 'Catalog trống hoặc API không phản hồi.',
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
  const isDemo = viewModel.environment === 'demo';

  const handleCreateProject = useCallback(
    async (projectName: string, baseId?: string, baseVersion?: string) => {
      if (isCreating) return;
      if (!canMutate) {
        toast.error(
          'Local Demo chỉ là giao diện — tạo workspace cần backend thật.',
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
    [isCreating, navigate, canMutate],
  );

  const handleImportRepo = useCallback(
    async (provider: string, repoUrl: string, branch: string, projectName: string) => {
      if (isCreating) return;
      if (!canMutate) {
        toast.error('Local Demo chỉ là giao diện — import cần backend thật.');
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
    [isCreating, navigate, canMutate],
  );

  const handleUpgrade = () => navigate('/settings/team/billing');
  const handleOpenProject = (slug: string, isPresentation?: boolean) => {
    if (isPresentation) {
      toast('Workspace presentation — mở Workspaces để tạo dự án thật.', { icon: 'ℹ️' });
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

  const demoSafeMetrics = isDemo
    ? [
        { value: String(viewModel.projects.items.length), label: 'Demo Projects' },
        { value: String(viewModel.agents.items.length), label: 'Demo Agents' },
        { value: String(viewModel.marketplace.items.length), label: 'Featured Templates' },
        { value: 'Local', label: 'Demo' },
      ]
    : undefined;

  return (
    <div className="home-studio h-full w-full overflow-y-auto">
      <div className="mx-auto flex min-h-full w-full max-w-[1520px] flex-col gap-4 px-4 py-4 sm:gap-5 sm:px-6 sm:py-5 lg:px-7 lg:py-6">
        <HomeTopBar
          userName={viewModel.userDisplayName}
          userSubtitle={viewModel.userSubtitle}
          theme={theme}
          searchPlaceholder="Tìm kiếm lệnh, dự án, agent…"
          onToggleTheme={toggleTheme}
          onOpenSearch={openCommandPalette}
          onOpenSettings={() => navigate('/settings')}
        />

        <HomeHero
          greeting={`Chào mừng trở lại, ${viewModel.greetingName}`}
          identityLine={PRODUCT_HERO}
          subtitle={viewModel.heroSubtitle}
          primaryCta={{
            label: 'Không gian làm việc mới',
            onClick: () => setShowCreateDialog(true),
          }}
          secondaryCta={{
            label: 'Khám phá Chợ',
            onClick: () => navigate('/marketplace'),
          }}
          planLine={
            <p className="w-full text-[12px] text-white/50 sm:w-auto sm:ml-1">
              <span className="font-medium text-white/80">{viewModel.planLabel} Plan</span>
              {viewModel.showUpgrade && (
                <>
                  <span aria-hidden="true"> · </span>
                  <button
                    type="button"
                    onClick={handleUpgrade}
                    className="text-[#F5B942] hover:underline focus-visible:outline-none focus-visible:underline"
                  >
                    Nâng cấp
                  </button>
                </>
              )}
              {isDemo && (
                <>
                  <span aria-hidden="true"> · </span>
                  <span className="home-badge-demo align-middle">Demo</span>
                </>
              )}
            </p>
          }
        />

        <section aria-labelledby="home-quick-actions">
          <HomeSectionHeader
            id="home-quick-actions"
            title="Bắt đầu nhanh"
            subtitle="Hành động gắn với route / dialog thật"
          />
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-5">
            <HomeQuickAction
              icon={<FolderPlus size={20} weight="duotone" />}
              title="Tạo Workspace mới"
              description="Tạo dự án từ template"
              onClick={() => setShowCreateDialog(true)}
              badge={!canMutate ? 'Demo' : undefined}
              accent="violet"
            />
            <HomeQuickAction
              icon={<Sparkle size={20} weight="duotone" />}
              title="Tạo ứng dụng mới"
              description="Cài app từ Marketplace"
              onClick={() => navigate('/marketplace?type=app')}
              accent="gold"
            />
            <HomeQuickAction
              icon={<MoodyFace size={20} animate trackPointer className="text-[#C4B5FD]" />}
              title="Tạo Agent"
              description="Mở Agents / @agent-builder"
              onClick={() =>
                navigate('/chat', { state: { landingPrompt: '@agent-builder ' } })
              }
              accent="mint"
            />
            <HomeQuickAction
              icon={<GitBranch size={20} weight="duotone" />}
              title="Import Project"
              description="Clone GitHub / GitLab / Bitbucket"
              onClick={() => setShowImportDialog(true)}
              badge={!canMutate ? 'Demo' : undefined}
              accent="violet"
            />
            <HomeQuickAction
              icon={<Storefront size={20} weight="duotone" />}
              title="Khám phá Marketplace"
              description="Templates, skills, connectors"
              onClick={() => navigate('/marketplace')}
              accent="gold"
            />
          </div>
          <div className="mt-2.5 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => navigate('/apps/installed')}
              className="home-card home-card-interactive flex items-center gap-3 px-3.5 py-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7C3AED]"
            >
              <span className="home-icon-well h-9 w-9">
                <SquaresFour size={18} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[13px] font-semibold text-white">Ứng dụng của tôi</span>
                <span className="block text-[11px] text-white/45">Apps đã cài trong workspace</span>
              </span>
              <ArrowRight size={15} className="text-white/35" />
            </button>
            <button
              type="button"
              onClick={() => navigate('/library?tab=mcp_servers')}
              className="home-card home-card-interactive flex items-center gap-3 px-3.5 py-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7C3AED]"
            >
              <span className="home-icon-well h-9 w-9">
                <Package size={18} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[13px] font-semibold text-white">Pi Connectors</span>
                <span className="block text-[11px] text-white/45">MCP trong Library</span>
              </span>
              <ArrowRight size={15} className="text-white/35" />
            </button>
          </div>
        </section>

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-12 xl:gap-5">
          <div className="min-w-0 space-y-5 xl:col-span-8">
            {/* Projects */}
            <section aria-labelledby="home-recent-projects">
              <HomeSectionHeader
                id="home-recent-projects"
                title="Dự án gần đây"
                subtitle={
                  showBadges
                    ? 'Catalog presentation — gắn nhãn Demo'
                    : 'Workspace từ nguồn dữ liệu hiện tại'
                }
                action={<HomeSectionLink to="/dashboard">Xem tất cả</HomeSectionLink>}
              />
              {viewModel.projects.state === 'loading' ? (
                <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                  {[0, 1, 2, 3].map((i) => (
                    <div key={i} className="home-card h-[8.5rem] animate-pulse" />
                  ))}
                </div>
              ) : viewModel.projects.items.length > 0 ? (
                <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                  {viewModel.projects.items.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => handleOpenProject(p.slug, p.isPresentationData)}
                      className="home-card home-card-interactive group relative flex flex-col gap-3 p-3.5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7C3AED]"
                      data-presentation={p.isPresentationData ? 'true' : 'false'}
                    >
                      <div className="flex items-start gap-3">
                        <span className="home-icon-well h-11 w-11 shrink-0">
                          <Folder size={20} weight="duotone" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="flex items-start justify-between gap-2">
                            <span className="truncate text-[14px] font-semibold text-white group-hover:text-[#C4B5FD]">
                              {p.name}
                            </span>
                            {p.isPresentationData && <span className="home-badge-demo">Demo</span>}
                          </span>
                          <span className="mt-0.5 line-clamp-2 text-[12px] leading-snug text-white/50">
                            {p.description || p.slug}
                          </span>
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5">
                        {p.projectType && (
                          <span className="rounded-md border border-white/10 bg-white/[0.04] px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white/55">
                            {p.projectType}
                          </span>
                        )}
                        {p.stackLabels?.map((label) => (
                          <span
                            key={label}
                            className="rounded-md border border-[rgba(124,58,237,0.35)] bg-[rgba(124,58,237,0.12)] px-1.5 py-0.5 text-[10px] font-medium text-[#C4B5FD]"
                          >
                            {label}
                          </span>
                        ))}
                      </div>
                      <div className="mt-auto flex items-center justify-between gap-2 border-t border-white/[0.06] pt-2.5">
                        <span className="flex items-center">
                          {(p.collaboratorInitials || ['HA']).slice(0, 4).map((ini) => (
                            <span key={ini} className="home-avatar" title={ini}>
                              {ini}
                            </span>
                          ))}
                        </span>
                        <span className="flex items-center gap-2 text-[11px] text-white/40">
                          {p.statusLabel && (
                            <span className="inline-flex items-center gap-1 text-[#4ADE80]">
                              <span className="h-1.5 w-1.5 rounded-full bg-[#22C55E]" />
                              {p.statusLabel}
                            </span>
                          )}
                          <span>{formatRelativeTime(p.updatedAt) || 'gần đây'}</span>
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <HomeEmptyState
                  icon={<FolderOpen size={20} />}
                  title={projectsCopy.title}
                  description={projectsCopy.description}
                  actionLabel="Không gian làm việc mới"
                  onAction={() => setShowCreateDialog(true)}
                />
              )}
            </section>

            {/* Agents */}
            <section aria-labelledby="home-agents">
              <HomeSectionHeader
                id="home-agents"
                title="Agent của tôi"
                subtitle={
                  showBadges ? 'Agent presentation — không thực thi backend' : 'Agent từ nguồn hiện tại'
                }
                action={<HomeSectionLink to="/chat">Mở Agents</HomeSectionLink>}
              />
              {viewModel.agents.state === 'loading' ? (
                <div className="space-y-2">
                  {[0, 1, 2].map((i) => (
                    <div key={i} className="home-card h-[4.25rem] animate-pulse" />
                  ))}
                </div>
              ) : viewModel.agents.items.length > 0 ? (
                <ul className="space-y-2">
                  {viewModel.agents.items.map((agent) => (
                    <li key={agent.id}>
                      <button
                        type="button"
                        onClick={() => navigate('/chat')}
                        className="home-card home-card-interactive flex w-full items-center gap-3 px-3.5 py-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7C3AED]"
                        data-presentation={agent.isPresentationData ? 'true' : 'false'}
                      >
                        <span className="home-icon-well flex h-11 w-11 shrink-0 items-center justify-center text-lg">
                          {agent.icon && String(agent.icon).startsWith('http') ? (
                            <img src={agent.icon} alt="" className="h-full w-full object-cover" />
                          ) : (
                            agent.icon || '🤖'
                          )}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="flex items-center gap-2 truncate text-[14px] font-semibold text-white">
                            {agent.name}
                            {agent.isPresentationData && (
                              <span className="home-badge-demo">Demo</span>
                            )}
                          </span>
                          <span className="mt-0.5 block truncate text-[12px] text-white/50">
                            {agent.description || 'Marketplace agent'}
                          </span>
                          {agent.lastActivityLabel && (
                            <span className="mt-0.5 block text-[11px] text-white/35">
                              {agent.lastActivityLabel}
                            </span>
                          )}
                        </span>
                        <span
                          className={`shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-bold tracking-wide ${agentStatusClass(agent.statusState)}`}
                        >
                          {agent.statusLabel}
                        </span>
                        <ArrowRight size={15} className="hidden text-white/30 sm:block" />
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <HomeEmptyState
                  icon={<Robot size={20} />}
                  title={agentsCopy.title}
                  description={agentsCopy.description}
                  actionLabel="Duyệt Agents"
                  actionTo="/marketplace?type=agent"
                />
              )}
            </section>

            {/* Marketplace */}
            <section aria-labelledby="home-marketplace">
              <HomeSectionHeader
                id="home-marketplace"
                title="Khám phá Marketplace"
                subtitle={
                  showBadges
                    ? 'Card presentation — không phải số liệu chính thức'
                    : 'Preview từ catalog hiện tại'
                }
                action={<HomeSectionLink to="/marketplace">Chợ</HomeSectionLink>}
              />
              {viewModel.marketplace.state === 'loading' ? (
                <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
                  {[0, 1, 2, 3].map((i) => (
                    <div key={i} className="home-card h-44 animate-pulse" />
                  ))}
                </div>
              ) : viewModel.marketplace.items.length > 0 ? (
                <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
                  {viewModel.marketplace.items.map((item) => (
                    <Link
                      key={`${item.kind}-${item.id}`}
                      to={item.href}
                      className="home-card home-card-interactive group relative flex min-h-[11rem] flex-col p-3.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7C3AED]"
                      data-presentation={item.isPresentationData ? 'true' : 'false'}
                    >
                      {item.isPresentationData && (
                        <span className="home-badge-demo absolute right-2.5 top-2.5">Demo</span>
                      )}
                      <div className="home-icon-well mb-2.5 h-10 w-10">
                        {item.kind === 'agent' ? (
                          <Robot size={20} />
                        ) : item.kind === 'skill' ? (
                          <Sparkle size={20} />
                        ) : item.kind === 'template' ? (
                          <Cube size={20} />
                        ) : (
                          <Code size={20} />
                        )}
                      </div>
                      <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#A78BFA]">
                        {item.categoryLabel || item.kind}
                      </p>
                      <p className="mt-1 line-clamp-1 text-[13px] font-semibold text-white group-hover:text-[#C4B5FD]">
                        {item.name}
                      </p>
                      <p className="mt-1 line-clamp-2 flex-1 text-[11px] leading-relaxed text-white/50">
                        {item.description || '—'}
                      </p>
                      {item.ratingLabel && (
                        <p className="mt-2 text-[11px] font-medium text-[#F5B942]">
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
                  actionLabel="Mở Marketplace"
                  actionTo="/marketplace"
                />
              )}
            </section>
          </div>

          {/* Right rail */}
          <aside className="min-w-0 space-y-3 xl:col-span-4">
            <HomeSystemStatusPanel
              title="Trạng thái hệ thống"
              footnote={viewModel.systemStatusFootnote}
              items={viewModel.systemStatus.map((s) => ({
                id: s.id,
                label: s.label,
                detail: s.detail,
                tone: s.tone,
              }))}
            />

            <HomePiBalancePanel {...viewModel.piBalance} />

            <section aria-labelledby="home-activity" className="home-rail-card p-4">
              <h2
                id="home-activity"
                className="font-heading text-[14px] font-semibold text-white"
              >
                Hoạt động gần đây
              </h2>
              <p className="mt-1 mb-3 text-[11px] text-white/40">
                {showBadges
                  ? 'Timeline presentation (demo data).'
                  : 'Tóm tắt từ nguồn dữ liệu hiện tại.'}
              </p>
              {viewModel.activity.state === 'loading' ? (
                <div className="space-y-2">
                  {[0, 1, 2].map((i) => (
                    <div key={i} className="h-9 animate-pulse rounded-lg bg-white/5" />
                  ))}
                </div>
              ) : viewModel.activity.items.length > 0 ? (
                <ul className="space-y-2.5">
                  {viewModel.activity.items.map((item) => (
                    <li
                      key={item.id}
                      className="flex gap-2.5 rounded-lg border border-white/[0.05] bg-black/20 px-2.5 py-2"
                    >
                      <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[rgba(124,58,237,0.2)] text-[12px] text-[#C4B5FD]">
                        {item.icon || '●'}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-1.5 truncate text-[12px] font-medium text-white">
                          {item.title}
                          {item.isPresentationData && (
                            <span className="home-badge-demo">Demo</span>
                          )}
                        </span>
                        {item.detail && (
                          <span className="mt-0.5 block truncate text-[11px] text-white/45">
                            {item.detail}
                          </span>
                        )}
                        <span className="mt-0.5 flex items-center justify-between gap-2 text-[10px] text-white/35">
                          <span>{formatRelativeTime(item.at) || '—'}</span>
                          {item.statusLabel && <span>{item.statusLabel}</span>}
                        </span>
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-[12px] text-white/45">
                  {viewModel.activity.state === 'unavailable'
                    ? 'Activity chưa khả dụng.'
                    : 'Chưa có hoạt động.'}
                </p>
              )}
            </section>

            <div className="home-rail-card p-3.5">
              <p className="text-[12px] font-semibold text-white mb-1">{PRODUCT_NAME}</p>
              <p className="mb-2.5 text-[11px] leading-relaxed text-white/45">
                Môi trường dữ liệu:{' '}
                <span className="font-semibold uppercase text-[#F5B942]">
                  {viewModel.environment}
                </span>
                . Có thể đổi sang Pi Testnet sau mà không redesign UI.
              </p>
              <Link
                to="/settings"
                className="inline-flex text-[12px] font-semibold text-[#C4B5FD] hover:text-white focus-visible:outline-none focus-visible:underline"
              >
                Mở Cài đặt
              </Link>
            </div>
          </aside>
        </div>

        <HomeIdentityCta
          title={PRODUCT_HERO}
          subtitle={`${PRODUCT_NAME} — xây dựng với AI, dành cho hệ sinh thái Pi.`}
          primaryLabel="Không gian làm việc mới"
          onPrimary={() => setShowCreateDialog(true)}
          secondaryLabel="Khám phá Chợ"
          onSecondary={() => navigate('/marketplace')}
          metrics={demoSafeMetrics}
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
