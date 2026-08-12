/**
 * Unit tests for pre-API theme hydration (localStorage → builtin fallback mode).
 * Does not hit auth, Home data sources, or Pi flows.
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  getStoredThemePresetId,
  hasThemePreset,
  resolveHydrationThemeId,
  storeThemePresetId,
} from './themePresets';

const STORAGE_KEY = 'opensail-theme-preset';

describe('theme hydration', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('seeds builtin dark and light presets for toggle before API load', () => {
    expect(hasThemePreset('default-dark')).toBe(true);
    expect(hasThemePreset('default-light')).toBe(true);
  });

  it('persists and reads the theme preference from localStorage', () => {
    storeThemePresetId('default-light');
    expect(getStoredThemePresetId()).toBe('default-light');
    expect(localStorage.getItem(STORAGE_KEY)).toBe('default-light');
  });

  it('resolves missing storage to default-dark', () => {
    expect(resolveHydrationThemeId(null)).toBe('default-dark');
  });

  it('resolves an exact cached id when available', () => {
    expect(resolveHydrationThemeId('default-light')).toBe('default-light');
    expect(resolveHydrationThemeId('default-dark')).toBe('default-dark');
  });

  it('maps unknown *-light preference to builtin light before API themes load', () => {
    expect(resolveHydrationThemeId('ocean-light')).toBe('default-light');
    expect(resolveHydrationThemeId('midnight-light')).toBe('default-light');
  });

  it('maps unknown *-dark preference to builtin dark before API themes load', () => {
    expect(resolveHydrationThemeId('ocean-dark')).toBe('default-dark');
  });

  it('falls back to default-dark for unrecognized stored ids', () => {
    expect(resolveHydrationThemeId('custom-theme')).toBe('default-dark');
  });

  it('round-trips a light preference for first-paint hydration', () => {
    storeThemePresetId('forest-light');
    const stored = getStoredThemePresetId();
    expect(stored).toBe('forest-light');
    // Exact preset may not be cached yet — mode-matched builtin prevents flash
    expect(resolveHydrationThemeId(stored)).toBe('default-light');
  });
});
