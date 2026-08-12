/**
 * Home dashboard view-model contracts.
 *
 * Layering (do not collapse these):
 *   UI components  →  view-model  →  data provider  →  demo | testnet | production source
 *
 * Sources may swap later (e.g. Local Demo → Pi Testnet) without redesigning Home UI.
 * Presentation/demo objects MUST set `isPresentationData: true` and never carry credentials.
 */

/** Where Home dashboard data is sourced from. */
export type HomeDataEnvironment = 'demo' | 'testnet' | 'production';

/**
 * Pi ledger presentation environment for balance / payment-related UI.
 * Distinct from auth — DEMO never enables payments; TESTNET/PRODUCTION are
 * reserved for future wiring behind real flags (not enabled by this module).
 */
export type PiLedgerEnvironment = 'DEMO' | 'TESTNET' | 'PRODUCTION';

/**
 * Realistic resource states the Home UI already understands so Testnet can
 * light them up later without layout changes.
 */
export type HomeResourceState =
  | 'loading'
  | 'empty'
  | 'success'
  | 'failed'
  | 'unavailable'
  | 'simulated'
  | 'connected'
  | 'disconnected'
  | 'pending'
  | 'authenticated'
  | 'unauthenticated'
  | 'testnet'
  | 'production';

/** Visual tone for status dots / badges — environment-agnostic. */
export type HomeStatusTone = 'ok' | 'warn' | 'off' | 'info' | 'demo' | 'pending';

export type HomePresentationMeta = {
  /** Always true for non-live catalog rows so UI can badge them. */
  isPresentationData: true;
  environment: HomeDataEnvironment;
};

export type HomeProjectItem = {
  id: string;
  name: string;
  slug: string;
  updatedAt: string;
  stackLabels?: string[];
  isPresentationData?: boolean;
};

export type HomeAgentItem = {
  id: string;
  name: string;
  description?: string | null;
  icon?: string | null;
  /** Presentation status label (e.g. Ready, Running, Pending). */
  statusLabel: string;
  statusState: HomeResourceState;
  isPresentationData?: boolean;
};

export type HomeMarketplaceKind = 'template' | 'skill' | 'agent';

export type HomeMarketplaceItem = {
  id: string;
  name: string;
  description?: string | null;
  kind: HomeMarketplaceKind;
  href: string;
  ratingLabel?: string;
  isPresentationData?: boolean;
};

export type HomeActivityItem = {
  id: string;
  title: string;
  detail?: string;
  at: string;
  isPresentationData?: boolean;
};

export type HomeSystemStatusItem = {
  id: string;
  label: string;
  detail: string;
  state: HomeResourceState;
  tone: HomeStatusTone;
};

/**
 * Pi balance panel view-model.
 * Never includes access tokens, payment intents, or chargeable credentials.
 * `paymentsEnabled` stays false until a real, flagged production/testnet path exists.
 */
export type HomePiBalanceView = {
  ledgerEnvironment: PiLedgerEnvironment;
  /** Display-only amount string (e.g. "1,234.56"); null when unavailable. */
  displayAmount: string | null;
  currencySymbol: 'π';
  state: HomeResourceState;
  /** Hard-false for Local Demo; future sources may flip only behind real flags. */
  paymentsEnabled: boolean;
  title: string;
  footnote: string;
  ctaLabel: string;
  /** Settings/wallet route — never a payment execution endpoint in demo. */
  ctaHref: string;
  isPresentationData: boolean;
};

export type HomeListSlice<T> = {
  state: HomeResourceState;
  items: T[];
  errorMessage?: string;
};

export type HomeCapabilities = {
  /** When false, create/import must not call backend APIs. */
  canMutateBackend: boolean;
  /** When true, show DEMO / presentation badges on applicable cards. */
  showPresentationBadges: boolean;
  /** Pi auth is never simulated as real credentials from this layer. */
  piAuthSimulated: false;
};

export type HomeDashboardViewModel = {
  environment: HomeDataEnvironment;
  authState: 'authenticated' | 'unauthenticated';
  greetingName: string;
  userDisplayName: string;
  userSubtitle: string;
  heroSubtitle: string;
  planLabel: string;
  showUpgrade: boolean;
  capabilities: HomeCapabilities;
  projects: HomeListSlice<HomeProjectItem>;
  agents: HomeListSlice<HomeAgentItem>;
  marketplace: HomeListSlice<HomeMarketplaceItem>;
  activity: HomeListSlice<HomeActivityItem>;
  systemStatus: HomeSystemStatusItem[];
  systemStatusFootnote: string;
  piBalance: HomePiBalanceView;
};

export type HomeDataSourceContext = {
  teamSlug?: string;
  teamSwitchKey?: string | number;
  userName?: string | null;
  userUsername?: string | null;
  teamName?: string | null;
  subscriptionTier: string;
  isAuthenticated: boolean;
};

export interface HomeDataSource {
  readonly environment: HomeDataEnvironment;
  load(ctx: HomeDataSourceContext): Promise<Omit<
    HomeDashboardViewModel,
    'greetingName' | 'userDisplayName' | 'userSubtitle' | 'planLabel' | 'showUpgrade' | 'authState'
  > & {
    /** Optional overrides from the source for identity copy. */
    greetingName?: string;
    userDisplayName?: string;
    userSubtitle?: string;
    heroSubtitle: string;
    planLabel?: string;
    showUpgrade?: boolean;
  }>;
}

export function mapResourceStateToTone(state: HomeResourceState): HomeStatusTone {
  switch (state) {
    case 'success':
    case 'connected':
    case 'authenticated':
    case 'production':
      return 'ok';
    case 'failed':
    case 'unavailable':
    case 'disconnected':
    case 'unauthenticated':
      return 'off';
    case 'pending':
    case 'loading':
      return 'pending';
    case 'empty':
      return 'warn';
    case 'simulated':
    case 'testnet':
      return 'info';
    default:
      return 'info';
  }
}
