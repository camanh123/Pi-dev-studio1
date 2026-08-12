/**
 * Home dashboard data provider hook.
 * UI should consume this view-model — not call demo catalogs or APIs directly.
 */

import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useTeam } from '../contexts/TeamContext';
import { isLocalDemoModeActive } from '../lib/localDemoMode';
import { getHomeDataSource } from './resolveHomeDataSource';
import type {
  HomeDashboardViewModel,
  HomeDataEnvironment,
  HomeDataSource,
  HomeListSlice,
} from './types';

const LOADING_SLICE = <T,>(): HomeListSlice<T> => ({ state: 'loading', items: [] });

function buildLoadingModel(partial: {
  environment: HomeDataEnvironment;
  greetingName: string;
  userDisplayName: string;
  userSubtitle: string;
  planLabel: string;
  showUpgrade: boolean;
  authState: 'authenticated' | 'unauthenticated';
}): HomeDashboardViewModel {
  return {
    ...partial,
    heroSubtitle: 'Loading studio dashboard…',
    capabilities: {
      canMutateBackend: partial.environment === 'production',
      showPresentationBadges: partial.environment === 'demo',
      piAuthSimulated: false,
    },
    projects: LOADING_SLICE(),
    agents: LOADING_SLICE(),
    marketplace: LOADING_SLICE(),
    activity: LOADING_SLICE(),
    systemStatus: [
      {
        id: 'loading',
        label: 'Dashboard',
        detail: 'Loading…',
        state: 'loading',
        tone: 'pending',
      },
    ],
    systemStatusFootnote: '',
    piBalance: {
      ledgerEnvironment:
        partial.environment === 'demo'
          ? 'DEMO'
          : partial.environment === 'testnet'
            ? 'TESTNET'
            : 'PRODUCTION',
      displayAmount: null,
      currencySymbol: 'π',
      state: 'loading',
      paymentsEnabled: false,
      title: 'Pi Balance',
      footnote: 'Loading…',
      ctaLabel: 'Open Settings',
      ctaHref: '/settings',
      isPresentationData: partial.environment === 'demo',
    },
  };
}

export type UseHomeDashboardOptions = {
  /** Test / future override. Prefer leaving unset in the app. */
  requestedEnvironment?: HomeDataEnvironment;
  /** Inject a source (tests). */
  sourceOverride?: HomeDataSource;
};

export function useHomeDashboard(options: UseHomeDashboardOptions = {}) {
  const { user, authMethod, isAuthenticated } = useAuth();
  const { activeTeam, teamSwitchKey } = useTeam();

  const isLocalDemo = authMethod === 'local_demo' || isLocalDemoModeActive();
  const source = useMemo(
    () =>
      options.sourceOverride ??
      getHomeDataSource({
        isLocalDemo,
        requested: options.requestedEnvironment,
      }),
    [isLocalDemo, options.requestedEnvironment, options.sourceOverride],
  );

  const greetingName = (
    user?.name?.split(' ')[0] ||
    user?.username ||
    user?.name ||
    'there'
  ).trim();
  const userDisplayName = user?.name || user?.username || 'User';
  const subscriptionTier = activeTeam?.subscription_tier || 'free';
  const planLabel =
    subscriptionTier.charAt(0).toUpperCase() + subscriptionTier.slice(1);
  const showUpgrade = subscriptionTier === 'free' && source.environment === 'production';

  const [viewModel, setViewModel] = useState<HomeDashboardViewModel>(() =>
    buildLoadingModel({
      environment: source.environment,
      greetingName,
      userDisplayName,
      userSubtitle: isLocalDemo ? 'Local Demo' : activeTeam?.name || 'Pi Dev Studio',
      planLabel,
      showUpgrade,
      authState: isAuthenticated ? 'authenticated' : 'unauthenticated',
    }),
  );

  useEffect(() => {
    let cancelled = false;
    setViewModel(
      buildLoadingModel({
        environment: source.environment,
        greetingName,
        userDisplayName,
        userSubtitle: isLocalDemo ? 'Local Demo' : activeTeam?.name || 'Pi Dev Studio',
        planLabel,
        showUpgrade,
        authState: isAuthenticated ? 'authenticated' : 'unauthenticated',
      }),
    );

    source
      .load({
        teamSlug: activeTeam?.slug,
        teamSwitchKey,
        userName: user?.name,
        userUsername: user?.username,
        teamName: activeTeam?.name,
        subscriptionTier,
        isAuthenticated: !!isAuthenticated,
      })
      .then((loaded) => {
        if (cancelled) return;
        setViewModel({
          environment: loaded.environment,
          authState: isAuthenticated ? 'authenticated' : 'unauthenticated',
          greetingName: loaded.greetingName || greetingName,
          userDisplayName: loaded.userDisplayName || userDisplayName,
          userSubtitle: loaded.userSubtitle || activeTeam?.name || 'Pi Dev Studio',
          heroSubtitle: loaded.heroSubtitle,
          planLabel: loaded.planLabel || planLabel,
          showUpgrade:
            typeof loaded.showUpgrade === 'boolean' ? loaded.showUpgrade : showUpgrade,
          capabilities: loaded.capabilities,
          projects: loaded.projects,
          agents: loaded.agents,
          marketplace: loaded.marketplace,
          activity: loaded.activity,
          systemStatus: loaded.systemStatus,
          systemStatusFootnote: loaded.systemStatusFootnote,
          piBalance: loaded.piBalance,
        });
      })
      .catch(() => {
        if (cancelled) return;
        setViewModel((prev) => ({
          ...prev,
          projects: {
            state: 'failed',
            items: [],
            errorMessage: 'Failed to load dashboard data',
          },
          agents: { state: 'failed', items: [], errorMessage: 'Failed to load agents' },
          marketplace: {
            state: 'failed',
            items: [],
            errorMessage: 'Failed to load marketplace',
          },
          activity: { state: 'failed', items: [] },
        }));
      });

    return () => {
      cancelled = true;
    };
  }, [
    source,
    activeTeam?.slug,
    activeTeam?.name,
    teamSwitchKey,
    user?.name,
    user?.username,
    subscriptionTier,
    isAuthenticated,
    isLocalDemo,
    greetingName,
    userDisplayName,
    planLabel,
    showUpgrade,
  ]);

  return {
    viewModel,
    isLoading:
      viewModel.projects.state === 'loading' ||
      viewModel.agents.state === 'loading' ||
      viewModel.marketplace.state === 'loading',
    sourceEnvironment: source.environment,
  };
}
