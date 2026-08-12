/**
 * Theme System for Pi Dev Studio
 *
 * Themes are loaded from the API (database) and cached in memory.
 * This file provides the TypeScript interfaces and helper functions
 * to apply themes via CSS variables.
 */

import { themesApi, type Theme, type ThemeListItem } from '../lib/api';

// Re-export types for convenience
export type { Theme, ThemeListItem };

// Also export as ThemePreset for backwards compatibility
export type ThemePreset = Theme;

// ============================================================================
// Theme Cache
// ============================================================================

// In-memory cache of loaded themes
const themesCache: Map<string, Theme> = new Map();
let themesLoaded = false;
let themesLoading: Promise<void> | null = null;

// Default fallback theme (used before API loads / when API unavailable)
// Pi Dev Studio visual language: violet primary, deep navy surfaces, gold accent.
const DEFAULT_FALLBACK_THEME: Theme = {
  id: 'default-dark',
  name: 'Pi Dev Studio Dark',
  mode: 'dark',
  author: 'Pi Dev Studio',
  version: '2.0.0',
  description: 'Pi-inspired dark theme for Pi Dev Studio',
  colors: {
    primary: '#7C3AED',
    primaryHover: '#8B5CF6',
    primaryRgb: '124, 58, 237',
    accent: '#A78BFA',
    background: '#0B0A14',
    surface: '#141225',
    surfaceHover: '#1E1A33',
    text: '#F8F7FF',
    textMuted: 'rgba(248, 247, 255, 0.65)',
    textSubtle: 'rgba(248, 247, 255, 0.42)',
    border: 'rgba(167, 139, 250, 0.14)',
    borderHover: 'rgba(167, 139, 250, 0.28)',
    sidebar: {
      background: '#090812',
      text: '#F8F7FF',
      border: 'rgba(167, 139, 250, 0.12)',
      hover: 'rgba(124, 58, 237, 0.14)',
      active: 'rgba(124, 58, 237, 0.22)',
    },
    input: {
      background: '#1A1730',
      border: 'rgba(167, 139, 250, 0.16)',
      borderFocus: '#7C3AED',
      text: '#F8F7FF',
      placeholder: 'rgba(248, 247, 255, 0.4)',
    },
    scrollbar: {
      thumb: 'rgba(167, 139, 250, 0.28)',
      thumbHover: 'rgba(167, 139, 250, 0.42)',
      track: 'transparent',
    },
    code: {
      inlineBackground: 'rgba(124, 58, 237, 0.18)',
      inlineText: '#C4B5FD',
      blockBackground: 'rgba(0, 0, 0, 0.4)',
      blockBorder: 'rgba(167, 139, 250, 0.14)',
      blockText: '#E8E4FF',
    },
    status: {
      error: '#ef4444',
      errorRgb: '239, 68, 68',
      success: '#22c55e',
      successRgb: '34, 197, 94',
      warning: '#c9a227',
      warningRgb: '201, 162, 39',
      info: '#6366f1',
      infoRgb: '99, 102, 241',
      purple: '#a855f7',
      purpleRgb: '168, 85, 247',
    },
    shadow: {
      small: '0 1px 2px rgba(0, 0, 0, 0.35)',
      medium: '0 8px 24px rgba(12, 8, 28, 0.45)',
      large: '0 16px 40px rgba(8, 4, 24, 0.55)',
    },
  },
  typography: {
    fontFamily:
      "'DM Sans', 'Instrument Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    fontFamilyHeading: "'Outfit', 'Instrument Sans', -apple-system, BlinkMacSystemFont, sans-serif",
    fontFamilyMono: "JetBrains Mono, Menlo, Monaco, 'Courier New', monospace",
    fontSizeBase: '14px',
    lineHeight: '1.5',
  },
  spacing: {
    radiusSmall: '6px',
    radiusMedium: '10px',
    radiusLarge: '14px',
    radiusXl: '18px',
  },
  animation: {
    durationFast: '150ms',
    durationNormal: '200ms',
    durationSlow: '300ms',
    easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
  },
};

/** Built-in light fallback — guarantees dark↔light toggle works without API themes. */
const DEFAULT_FALLBACK_LIGHT_THEME: Theme = {
  id: 'default-light',
  name: 'Pi Dev Studio Light',
  mode: 'light',
  author: 'Pi Dev Studio',
  version: '2.0.0',
  description: 'Pi-inspired light theme for Pi Dev Studio',
  colors: {
    primary: '#7C3AED',
    primaryHover: '#6D28D9',
    primaryRgb: '124, 58, 237',
    accent: '#6D28D9',
    background: '#F7F5FF',
    surface: '#FFFFFF',
    surfaceHover: '#EDE9FE',
    text: '#1A1230',
    textMuted: 'rgba(26, 18, 48, 0.65)',
    textSubtle: 'rgba(26, 18, 48, 0.42)',
    border: 'rgba(124, 58, 237, 0.16)',
    borderHover: 'rgba(124, 58, 237, 0.32)',
    sidebar: {
      background: '#F0ECFF',
      text: '#1A1230',
      border: 'rgba(124, 58, 237, 0.14)',
      hover: 'rgba(124, 58, 237, 0.1)',
      active: 'rgba(124, 58, 237, 0.18)',
    },
    input: {
      background: '#FFFFFF',
      border: 'rgba(124, 58, 237, 0.2)',
      borderFocus: '#7C3AED',
      text: '#1A1230',
      placeholder: 'rgba(26, 18, 48, 0.4)',
    },
    scrollbar: {
      thumb: 'rgba(124, 58, 237, 0.28)',
      thumbHover: 'rgba(124, 58, 237, 0.42)',
      track: 'transparent',
    },
    code: {
      inlineBackground: 'rgba(124, 58, 237, 0.12)',
      inlineText: '#6D28D9',
      blockBackground: '#EDE9FE',
      blockBorder: 'rgba(124, 58, 237, 0.16)',
      blockText: '#1A1230',
    },
    status: {
      error: '#ef4444',
      errorRgb: '239, 68, 68',
      success: '#16a34a',
      successRgb: '22, 163, 74',
      warning: '#c9a227',
      warningRgb: '201, 162, 39',
      info: '#6366f1',
      infoRgb: '99, 102, 241',
      purple: '#7c3aed',
      purpleRgb: '124, 58, 237',
    },
    shadow: {
      small: '0 1px 2px rgba(26, 18, 48, 0.08)',
      medium: '0 8px 24px rgba(26, 18, 48, 0.1)',
      large: '0 16px 40px rgba(26, 18, 48, 0.14)',
    },
  },
  typography: {
    fontFamily:
      "'DM Sans', 'Instrument Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    fontFamilyHeading: "'Outfit', 'Instrument Sans', -apple-system, BlinkMacSystemFont, sans-serif",
    fontFamilyMono: "JetBrains Mono, Menlo, Monaco, 'Courier New', monospace",
    fontSizeBase: '14px',
    lineHeight: '1.5',
  },
  spacing: {
    radiusSmall: '6px',
    radiusMedium: '10px',
    radiusLarge: '14px',
    radiusXl: '18px',
  },
  animation: {
    durationFast: '150ms',
    durationNormal: '200ms',
    durationSlow: '300ms',
    easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
  },
};

const THEME_STORAGE_KEY = 'opensail-theme-preset';

/** Ensure built-in dark + light fallbacks are always available for toggling. */
function ensureBuiltinFallbacks(): void {
  if (!themesCache.has(DEFAULT_FALLBACK_THEME.id)) {
    themesCache.set(DEFAULT_FALLBACK_THEME.id, DEFAULT_FALLBACK_THEME);
  }
  if (!themesCache.has(DEFAULT_FALLBACK_LIGHT_THEME.id)) {
    themesCache.set(DEFAULT_FALLBACK_LIGHT_THEME.id, DEFAULT_FALLBACK_LIGHT_THEME);
  }
}

// Seed fallbacks immediately so first paint / toggle never lacks a light variant.
ensureBuiltinFallbacks();

export function getStoredThemePresetId(): string | null {
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    return stored && stored.trim() ? stored.trim() : null;
  } catch {
    return null;
  }
}

export function storeThemePresetId(presetId: string): void {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, presetId);
  } catch {
    // Ignore quota / private-mode failures
  }
}

// ============================================================================
// Theme Loading
// ============================================================================

/**
 * Load all themes from the API into memory cache.
 * This is called once on app startup.
 */
export async function loadThemes(): Promise<void> {
  // If already loaded, return
  if (themesLoaded) return;

  // If currently loading, wait for that
  if (themesLoading) {
    await themesLoading;
    return;
  }

  // Start loading
  themesLoading = (async () => {
    try {
      const themes = await themesApi.listFull();
      themesCache.clear();
      for (const theme of themes) {
        themesCache.set(theme.id, theme);
      }
      // Always keep builtins so dark↔light toggle cannot soft-fail
      ensureBuiltinFallbacks();
      themesLoaded = true;
      console.debug(`Loaded ${themes.length} themes from API`);
    } catch (error) {
      console.warn('Failed to load themes from API, using fallback:', error);
      ensureBuiltinFallbacks();
      themesLoaded = true;
    }
  })();

  await themesLoading;
  themesLoading = null;
}

/**
 * Force reload themes from the API.
 */
export async function reloadThemes(): Promise<void> {
  themesLoaded = false;
  await loadThemes();
}

// ============================================================================
// Theme Access (Backwards Compatible)
// ============================================================================

/**
 * Get all themes as a record (for backwards compatibility).
 * Note: Returns current cache state, may be empty before loadThemes() is called.
 */
export function getThemePresets(): Record<string, Theme> {
  const result: Record<string, Theme> = {};
  for (const [id, theme] of themesCache) {
    result[id] = theme;
  }
  // Always include fallback if cache is empty
  if (themesCache.size === 0) {
    result[DEFAULT_FALLBACK_THEME.id] = DEFAULT_FALLBACK_THEME;
  }
  return result;
}

// Legacy export for backwards compatibility
export const themePresets: Record<string, Theme> = new Proxy({} as Record<string, Theme>, {
  get(_, prop: string) {
    return themesCache.get(prop) || DEFAULT_FALLBACK_THEME;
  },
  has(_, prop: string) {
    return themesCache.has(prop);
  },
  ownKeys() {
    return Array.from(themesCache.keys());
  },
  getOwnPropertyDescriptor(_, prop: string) {
    if (themesCache.has(prop)) {
      return { enumerable: true, configurable: true, value: themesCache.get(prop) };
    }
    return undefined;
  },
});

/**
 * Get a theme by ID, with fallback to default.
 */
export function getThemePreset(id: string): Theme {
  ensureBuiltinFallbacks();
  return themesCache.get(id) || themesCache.get('default-dark') || DEFAULT_FALLBACK_THEME;
}

/** True when the theme id exists in cache (not a silent fallback). */
export function hasThemePreset(id: string): boolean {
  return themesCache.has(id);
}

/**
 * Get all themes grouped by mode.
 */
export function getThemePresetsByMode(): { dark: Theme[]; light: Theme[] } {
  const themes = Array.from(themesCache.values());
  return {
    dark: themes.filter((t) => t.mode === 'dark'),
    light: themes.filter((t) => t.mode === 'light'),
  };
}

/**
 * Get list of available theme IDs.
 */
export function getAvailableThemeIds(): string[] {
  return Array.from(themesCache.keys());
}

/**
 * Check if themes have been loaded.
 */
export function areThemesLoaded(): boolean {
  return themesLoaded;
}

// ============================================================================
// Theme Application
// ============================================================================

/**
 * Safely set a CSS custom property. Skips if value is undefined/null/empty,
 * preserving the previous value rather than setting "undefined" as a string.
 */
function safeSetProperty(el: HTMLElement, prop: string, value: string | undefined | null): void {
  if (value != null && value !== '') {
    el.style.setProperty(prop, value);
  }
}

/**
 * Apply a theme to the document (sets all CSS variables).
 */
export function applyThemePreset(theme: Theme): void {
  const root = document.documentElement;
  const { colors, typography, spacing, animation } = theme;

  // Guard: bail out if the theme object is fundamentally broken
  if (!colors || !typography || !spacing || !animation) {
    console.warn('applyThemePreset: theme is missing required sections, skipping apply');
    return;
  }

  // === CORE COLORS ===
  safeSetProperty(root, '--primary', colors.primary);
  safeSetProperty(root, '--primary-hover', colors.primaryHover);
  safeSetProperty(root, '--primary-rgb', colors.primaryRgb);
  safeSetProperty(root, '--accent', colors.accent);
  // Gold accent is part of the Pi Dev Studio visual language (not theme-API driven yet)
  safeSetProperty(root, '--accent-gold', '#C9A227');
  safeSetProperty(root, '--accent-gold-soft', 'rgba(201, 162, 39, 0.18)');

  // === BACKGROUNDS ===
  safeSetProperty(root, '--bg', colors.background);
  safeSetProperty(root, '--bg-dark', colors.background); // Legacy alias
  safeSetProperty(root, '--surface', colors.surface);
  safeSetProperty(root, '--surface-hover', colors.surfaceHover);

  const cardHover =
    theme.mode === 'dark'
      ? `color-mix(in srgb, ${colors.surface} 92%, white 8%)`
      : `color-mix(in srgb, ${colors.surface} 88%, ${colors.textMuted} 12%)`;
  safeSetProperty(root, '--card-hover', cardHover);

  // === TEXT ===
  safeSetProperty(root, '--text', colors.text);
  safeSetProperty(root, '--text-muted', colors.textMuted);
  safeSetProperty(root, '--text-subtle', colors.textSubtle);

  // === BORDERS ===
  safeSetProperty(root, '--border', colors.border);
  safeSetProperty(root, '--border-hover', colors.borderHover);
  // Legacy alias used by chat/panels (e.g. ChatMessage) — keep in sync with --border
  // so light themes don't bleed the :root dark fallback through.
  safeSetProperty(root, '--border-color', colors.border);

  // === SIDEBAR ===
  if (colors.sidebar) {
    safeSetProperty(root, '--sidebar-bg', colors.sidebar.background);
    safeSetProperty(root, '--sidebar-text', colors.sidebar.text);
    safeSetProperty(root, '--sidebar-border', colors.sidebar.border);
    safeSetProperty(root, '--sidebar-hover', colors.sidebar.hover);
    safeSetProperty(root, '--sidebar-active', colors.sidebar.active);
  }

  // === INPUT ===
  if (colors.input) {
    safeSetProperty(root, '--input-bg', colors.input.background);
    safeSetProperty(root, '--input-border', colors.input.border);
    safeSetProperty(root, '--input-border-focus', colors.input.borderFocus);
    safeSetProperty(root, '--input-text', colors.input.text);
    safeSetProperty(root, '--input-placeholder', colors.input.placeholder);
  }

  // === SCROLLBAR ===
  if (colors.scrollbar) {
    safeSetProperty(root, '--scrollbar-thumb', colors.scrollbar.thumb);
    safeSetProperty(root, '--scrollbar-thumb-hover', colors.scrollbar.thumbHover);
    safeSetProperty(root, '--scrollbar-track', colors.scrollbar.track);
  }

  // === CODE ===
  if (colors.code) {
    safeSetProperty(root, '--code-inline-bg', colors.code.inlineBackground);
    safeSetProperty(root, '--code-inline-text', colors.code.inlineText);
    safeSetProperty(root, '--code-block-bg', colors.code.blockBackground);
    safeSetProperty(root, '--code-block-border', colors.code.blockBorder);
    safeSetProperty(root, '--code-block-text', colors.code.blockText);
  }

  // === STATUS ===
  if (colors.status) {
    safeSetProperty(root, '--status-error', colors.status.error);
    safeSetProperty(root, '--status-error-rgb', colors.status.errorRgb);
    safeSetProperty(root, '--status-success', colors.status.success);
    safeSetProperty(root, '--status-success-rgb', colors.status.successRgb);
    safeSetProperty(root, '--status-warning', colors.status.warning);
    safeSetProperty(root, '--status-warning-rgb', colors.status.warningRgb);
    safeSetProperty(root, '--status-info', colors.status.info);
    safeSetProperty(root, '--status-info-rgb', colors.status.infoRgb);

    // Legacy status variable names
    safeSetProperty(root, '--status-red', colors.status.error);
    safeSetProperty(root, '--status-green', colors.status.success);
    safeSetProperty(root, '--status-yellow', colors.status.warning);
    safeSetProperty(root, '--status-blue', colors.status.info);
    safeSetProperty(root, '--status-purple', colors.status.purple);
    safeSetProperty(root, '--status-purple-rgb', colors.status.purpleRgb);
  }

  // === SHADOWS ===
  if (colors.shadow) {
    safeSetProperty(root, '--shadow-small', colors.shadow.small);
    safeSetProperty(root, '--shadow-medium', colors.shadow.medium);
    safeSetProperty(root, '--shadow-large', colors.shadow.large);
  }

  // === TYPOGRAPHY ===
  safeSetProperty(root, '--font-family', typography.fontFamily);
  safeSetProperty(root, '--font-family-mono', typography.fontFamilyMono);
  safeSetProperty(root, '--font-size-base', typography.fontSizeBase);
  safeSetProperty(root, '--line-height', typography.lineHeight);
  safeSetProperty(root, '--font-family-heading', typography.fontFamilyHeading);

  // === SPACING / RADIUS ===
  safeSetProperty(root, '--radius-small', spacing.radiusSmall);
  safeSetProperty(root, '--radius-medium', spacing.radiusMedium);
  safeSetProperty(root, '--radius-large', spacing.radiusLarge);
  safeSetProperty(root, '--radius-xl', spacing.radiusXl);
  safeSetProperty(root, '--radius', spacing.radiusXl); // Default radius — main content panels
  safeSetProperty(root, '--control-border-radius', spacing.radiusSmall); // Controls use small radius

  // === ANIMATION ===
  safeSetProperty(root, '--duration-fast', animation.durationFast);
  safeSetProperty(root, '--duration-normal', animation.durationNormal);
  safeSetProperty(root, '--duration-slow', animation.durationSlow);
  safeSetProperty(root, '--easing', animation.easing);
  safeSetProperty(root, '--easing-layout', animation.easing); // Layout transitions use same easing
  safeSetProperty(root, '--ease', animation.easing); // Legacy alias

  // === BORDERLESS OVERRIDE ===
  // When the theme opts into borderless mode, force every border CSS
  // variable to transparent. This catches both the canonical names and
  // legacy aliases without requiring a per-component sweep — anything
  // that resolves through one of these vars vanishes. Components that
  // need a divider regardless can fall back to --surface-hover or read
  // [data-borderless="true"] from the root element.
  if (theme.borderless) {
    root.style.setProperty('--border', 'transparent');
    root.style.setProperty('--border-hover', 'transparent');
    root.style.setProperty('--border-color', 'transparent');
    root.style.setProperty('--sidebar-border', 'transparent');
    root.style.setProperty('--input-border', 'transparent');
    root.style.setProperty('--input-border-focus', 'transparent');
    root.style.setProperty('--code-block-border', 'transparent');
    root.setAttribute('data-borderless', 'true');
  } else {
    root.removeAttribute('data-borderless');
  }

  // === MODE CLASS ===
  // body.*-mode: legacy app CSS. html.dark + data-theme: Tailwind darkMode:'class'.
  document.body.classList.remove('light-mode', 'dark-mode');
  document.body.classList.add(`${theme.mode}-mode`);

  root.classList.toggle('dark', theme.mode === 'dark');
  root.setAttribute('data-theme', theme.mode);
  root.style.colorScheme = theme.mode;

  // Update body styles directly (these are the authoritative values, not CSS overrides)
  if (colors.background) document.body.style.backgroundColor = colors.background;
  if (colors.text) document.body.style.color = colors.text;
}

/**
 * Resolve which theme id to apply before API themes are available.
 * Prefers the exact stored id when already cached; otherwise maps
 * persisted *-light / *-dark preferences onto builtin fallbacks so the
 * correct mode paints immediately (no flash).
 */
export function resolveHydrationThemeId(stored: string | null): string {
  ensureBuiltinFallbacks();
  if (!stored) {
    return DEFAULT_FALLBACK_THEME.id;
  }
  if (themesCache.has(stored)) {
    return stored;
  }
  if (stored.endsWith('-light')) {
    return DEFAULT_FALLBACK_LIGHT_THEME.id;
  }
  if (stored.endsWith('-dark')) {
    return DEFAULT_FALLBACK_THEME.id;
  }
  return DEFAULT_FALLBACK_THEME.id;
}

/**
 * Apply the stored (or default) theme before React mounts to avoid mode flicker.
 * Does not change API precedence — ThemeProvider still resolves user prefs after load.
 * @returns The theme id that was applied for first paint.
 */
export function hydrateThemeFromStorage(): string {
  const stored = getStoredThemePresetId();
  const presetId = resolveHydrationThemeId(stored);
  applyThemePreset(getThemePreset(presetId));
  return presetId;
}
