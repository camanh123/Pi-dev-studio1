import { describe, it, expect, beforeEach } from 'vitest';
import {
  evaluateLocalDemoMode,
  isLocalDemoModeAllowed,
  isLocalDemoModeActive,
  enterLocalDemoMode,
  exitLocalDemoMode,
  LOCAL_DEMO_SESSION_KEY,
} from './localDemoMode';

describe('evaluateLocalDemoMode (production protection)', () => {
  it('never activates when isDev is false, even with env flag and session key', () => {
    expect(
      evaluateLocalDemoMode({
        isDev: false,
        viteLocalDemo: 'true',
        sessionOptIn: true,
      })
    ).toBe(false);
  });

  it('activates in DEV via VITE_LOCAL_DEMO=true', () => {
    expect(
      evaluateLocalDemoMode({
        isDev: true,
        viteLocalDemo: 'true',
        sessionOptIn: false,
      })
    ).toBe(true);
  });

  it('activates in DEV via session opt-in', () => {
    expect(
      evaluateLocalDemoMode({
        isDev: true,
        viteLocalDemo: undefined,
        sessionOptIn: true,
      })
    ).toBe(true);
  });

  it('stays inactive in DEV without flag or session opt-in', () => {
    expect(
      evaluateLocalDemoMode({
        isDev: true,
        viteLocalDemo: undefined,
        sessionOptIn: false,
      })
    ).toBe(false);
  });
});

describe('localDemoMode runtime helpers (Vite DEV)', () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it('is allowed under vitest/Vite DEV', () => {
    // Vitest runs with import.meta.env.DEV === true
    expect(isLocalDemoModeAllowed()).toBe(true);
  });

  it('is inactive by default without flag or session key', () => {
    // Only assert when VITE_LOCAL_DEMO is not forced on in the environment
    if (import.meta.env.VITE_LOCAL_DEMO === 'true') {
      expect(isLocalDemoModeActive()).toBe(true);
      return;
    }
    expect(isLocalDemoModeActive()).toBe(false);
  });

  it('activates and clears via sessionStorage opt-in', () => {
    if (!isLocalDemoModeAllowed()) return;
    enterLocalDemoMode();
    expect(sessionStorage.getItem(LOCAL_DEMO_SESSION_KEY)).toBe('1');
    expect(isLocalDemoModeActive()).toBe(true);
    exitLocalDemoMode();
    if (import.meta.env.VITE_LOCAL_DEMO !== 'true') {
      expect(isLocalDemoModeActive()).toBe(false);
    }
  });
});
