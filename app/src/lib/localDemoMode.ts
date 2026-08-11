/**
 * Local Demo / Preview Mode — frontend-only UI preview.
 *
 * Allows inspecting authenticated shell UI without a backend.
 * NEVER activates in production builds (gated on import.meta.env.DEV).
 *
 * Activation (DEV only):
 *   1. sessionStorage key set via enterLocalDemoMode() from Login, or
 *   2. VITE_LOCAL_DEMO=true in the Vite env for this dev session
 *
 * Does not mint JWTs, touch backend auth, or change Pi feature flags.
 */

import type { AuthUser } from '../contexts/auth/types';

export const LOCAL_DEMO_SESSION_KEY = 'tesslate_local_demo';

/** In-memory demo user — not a real account; never sent as a credential. */
export const LOCAL_DEMO_USER: AuthUser = {
  id: 'local-demo-user',
  email: 'demo@localhost',
  name: 'Local Demo User',
  username: 'local-demo',
  slug: 'local-demo',
  is_superuser: false,
};

/**
 * Pure gate used by runtime helpers and unit tests.
 * Production protection: `isDev` must be false in production builds
 * (Vite replaces `import.meta.env.DEV` with `false`).
 */
export function evaluateLocalDemoMode(options: {
  isDev: boolean;
  viteLocalDemo?: string;
  sessionOptIn: boolean;
}): boolean {
  if (!options.isDev) {
    return false;
  }
  if (options.viteLocalDemo === 'true') {
    return true;
  }
  return options.sessionOptIn;
}

/**
 * Hard gate: Vite sets `import.meta.env.DEV` to false in production builds.
 * This must remain the sole production protection for demo mode.
 */
export function isLocalDemoModeAllowed(): boolean {
  return import.meta.env.DEV === true;
}

/**
 * Whether demo mode is currently active for this browser session.
 * Always false when not allowed (production builds).
 */
export function isLocalDemoModeActive(): boolean {
  const sessionOptIn =
    typeof sessionStorage !== 'undefined' &&
    sessionStorage.getItem(LOCAL_DEMO_SESSION_KEY) === '1';

  return evaluateLocalDemoMode({
    isDev: import.meta.env.DEV === true,
    viteLocalDemo: import.meta.env.VITE_LOCAL_DEMO,
    sessionOptIn,
  });
}

/** Opt into demo mode for this tab (DEV only). */
export function enterLocalDemoMode(): void {
  if (!isLocalDemoModeAllowed()) {
    throw new Error('Local Demo Mode is only available in local development builds');
  }
  sessionStorage.setItem(LOCAL_DEMO_SESSION_KEY, '1');
}

/** Clear the session opt-in flag (logout / exit). */
export function exitLocalDemoMode(): void {
  if (typeof sessionStorage === 'undefined') return;
  sessionStorage.removeItem(LOCAL_DEMO_SESSION_KEY);
}
