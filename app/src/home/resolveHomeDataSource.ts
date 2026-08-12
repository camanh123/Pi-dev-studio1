/**
 * Resolves which Home data source to use.
 *
 * Safety:
 * - Local Demo always wins when active (DEV-only gate elsewhere).
 * - `testnet` is reserved for an explicit future opt-in; never implied by Local Demo.
 * - This module does not read production payment feature flags or mint Pi tokens.
 */

import { isLocalDemoModeActive } from '../lib/localDemoMode';
import type { HomeDataEnvironment, HomeDataSource } from './types';
import { demoHomeSource, productionHomeSource, testnetHomeSource } from './sources';

export type HomeSourceRequest = {
  /** Explicit override for tests / future Testnet shell. */
  requested?: HomeDataEnvironment;
  /** Injected Local Demo flag (defaults to runtime helper). */
  isLocalDemo?: boolean;
};

/**
 * Pure resolver — prefer this in unit tests.
 * Local Demo → demo. Explicit testnet request → testnet stub. Else production.
 */
export function resolveHomeDataEnvironment(options: HomeSourceRequest = {}): HomeDataEnvironment {
  const isLocalDemo =
    typeof options.isLocalDemo === 'boolean' ? options.isLocalDemo : isLocalDemoModeActive();

  if (isLocalDemo) {
    return 'demo';
  }
  if (options.requested === 'testnet') {
    return 'testnet';
  }
  if (options.requested === 'demo') {
    // Demo catalog outside Local Demo is still presentation-only; allowed for tests.
    return 'demo';
  }
  return 'production';
}

export function getHomeDataSource(options: HomeSourceRequest = {}): HomeDataSource {
  const env = resolveHomeDataEnvironment(options);
  switch (env) {
    case 'demo':
      return demoHomeSource;
    case 'testnet':
      return testnetHomeSource;
    default:
      return productionHomeSource;
  }
}
