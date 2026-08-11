import { beforeEach, describe, expect, it } from 'vitest';
import {
  PI_AUTH_STARTER_SLUG,
  PI_BASE_SLUGS,
  PI_FEATURE_FLAGS,
  PI_PAYMENTS_STARTER_SLUG,
  PI_SKILL_SLUGS,
  PI_SKILLS_FOR_PROMPT,
  PI_WEB_STARTER_SLUG,
  PI_WIZARD_STEPS,
  clearPiSetupBaseSlug,
  getEnabledPiFeaturedSlugs,
  getRecommendedPiSkillsForBase,
  isPiBaseVisible,
  isPiSkillVisible,
  persistPiSetupBaseSlug,
  readPiSetupBaseSlug,
} from './piDevStudio';

describe('piDevStudio Phase 6 helpers', () => {
  beforeEach(() => {
    clearPiSetupBaseSlug();
  });

  it('maps Phase 0.5 semantics to snake_case YAML flag names', () => {
    expect(PI_FEATURE_FLAGS.knowledge).toBe('pi_knowledge');
    expect(PI_FEATURE_FLAGS.skills).toBe('pi_skills');
    expect(PI_FEATURE_FLAGS.templates).toBe('pi_templates');
    expect(PI_FEATURE_FLAGS.paymentsTemplate).toBe('pi_payments_template');
  });

  it('keeps the three MarketplaceBase slugs and seven skills', () => {
    expect([...PI_BASE_SLUGS]).toEqual([
      PI_WEB_STARTER_SLUG,
      PI_AUTH_STARTER_SLUG,
      PI_PAYMENTS_STARTER_SLUG,
    ]);
    expect(PI_SKILL_SLUGS).toHaveLength(7);
  });

  it('hides Pi bases when flags are disabled', () => {
    const off = { pi_templates: false, pi_payments_template: false };
    expect(isPiBaseVisible(PI_WEB_STARTER_SLUG, off)).toBe(false);
    expect(isPiBaseVisible(PI_AUTH_STARTER_SLUG, off)).toBe(false);
    expect(isPiBaseVisible(PI_PAYMENTS_STARTER_SLUG, off)).toBe(false);
    expect(isPiBaseVisible('nextjs-16', off)).toBe(true);
  });

  it('exposes templates and payments independently', () => {
    expect(
      isPiBaseVisible(PI_WEB_STARTER_SLUG, {
        pi_templates: true,
        pi_payments_template: false,
      })
    ).toBe(true);
    expect(
      isPiBaseVisible(PI_PAYMENTS_STARTER_SLUG, {
        pi_templates: true,
        pi_payments_template: false,
      })
    ).toBe(false);
    expect(
      isPiBaseVisible(PI_PAYMENTS_STARTER_SLUG, {
        pi_templates: false,
        pi_payments_template: true,
      })
    ).toBe(true);
  });

  it('gates Pi skills behind pi_skills', () => {
    expect(isPiSkillVisible('pi-sdk', { pi_skills: false })).toBe(false);
    expect(isPiSkillVisible('pi-sdk', { pi_skills: true })).toBe(true);
    expect(isPiSkillVisible('workspace-data-sdk', { pi_skills: false })).toBe(true);
  });

  it('builds featured Pi slug lists from flags', () => {
    expect(
      getEnabledPiFeaturedSlugs({ pi_templates: false, pi_payments_template: false })
    ).toEqual([]);
    expect(
      getEnabledPiFeaturedSlugs({ pi_templates: true, pi_payments_template: false })
    ).toEqual([PI_WEB_STARTER_SLUG, PI_AUTH_STARTER_SLUG]);
    expect(
      getEnabledPiFeaturedSlugs({ pi_templates: true, pi_payments_template: true })
    ).toEqual([PI_WEB_STARTER_SLUG, PI_AUTH_STARTER_SLUG, PI_PAYMENTS_STARTER_SLUG]);
  });

  it('persists Pi setup slug for project setup checklist', () => {
    persistPiSetupBaseSlug(PI_AUTH_STARTER_SLUG);
    expect(readPiSetupBaseSlug()).toBe(PI_AUTH_STARTER_SLUG);
    persistPiSetupBaseSlug('nextjs-16');
    expect(readPiSetupBaseSlug()).toBeNull();
  });

  it('keeps the four environment concepts distinct in wizard copy', () => {
    const text = PI_WIZARD_STEPS.map((s) => `${s.title} ${s.detail}`).join('\n');
    expect(text).toMatch(/OpenSail preview/i);
    expect(text).toMatch(/sandbox/i);
    expect(text).toMatch(/Developer Portal/i);
    expect(text).toMatch(/payment DTO network/i);
    expect(text).toMatch(/AgentSkillAssignment/);
    expect(text).not.toMatch(/sandbox\s*=\s*Testnet/i);
    expect(text).not.toMatch(/Sign in to OpenSail with Pi/i);
  });

  it('maps recommended skills per starter without auto-assign implication', () => {
    expect(getRecommendedPiSkillsForBase(PI_WEB_STARTER_SLUG)).toEqual(
      expect.arrayContaining(['pi-sdk', 'pi-browser'])
    );
    expect(getRecommendedPiSkillsForBase(PI_WEB_STARTER_SLUG)).not.toContain('pi-payments');
    expect(getRecommendedPiSkillsForBase(PI_AUTH_STARTER_SLUG)).toEqual(
      expect.arrayContaining(['pi-auth', 'pi-platform-api'])
    );
    expect(getRecommendedPiSkillsForBase(PI_PAYMENTS_STARTER_SLUG)).toEqual(
      expect.arrayContaining(['pi-payments', 'pi-platform-api'])
    );
    expect(PI_SKILLS_FOR_PROMPT['add-pi-login']).toEqual(
      expect.arrayContaining(['pi-auth', 'pi-sdk', 'pi-browser'])
    );
    expect(PI_SKILLS_FOR_PROMPT['add-pi-payment']).toEqual(
      expect.arrayContaining(['pi-payments', 'pi-platform-api'])
    );
  });
});
