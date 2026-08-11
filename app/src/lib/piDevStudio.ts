/**
 * Pi Dev Studio (Phase 6) — frontend helpers for feature-flag gating and
 * starter discovery. Does not invent Pi APIs or touch OpenSail auth/billing.
 *
 * Flag name mapping (Phase 0.5 proposal → orchestrator/feature_flags YAML):
 *   pi.knowledge         → pi_knowledge
 *   pi.skills            → pi_skills
 *   pi.templates         → pi_templates
 *   pi.payments_template → pi_payments_template
 */

export const PI_FEATURE_FLAGS = {
  knowledge: 'pi_knowledge',
  skills: 'pi_skills',
  templates: 'pi_templates',
  paymentsTemplate: 'pi_payments_template',
} as const;

export type PiFeatureFlagName = (typeof PI_FEATURE_FLAGS)[keyof typeof PI_FEATURE_FLAGS];

/** MarketplaceBase slugs registered in packages/tesslate-marketplace seeds. */
export const PI_WEB_STARTER_SLUG = 'pi-web-starter';
export const PI_AUTH_STARTER_SLUG = 'pi-auth-starter';
export const PI_PAYMENTS_STARTER_SLUG = 'pi-payments-starter';

export const PI_TEMPLATE_SLUGS = [PI_WEB_STARTER_SLUG, PI_AUTH_STARTER_SLUG] as const;

export const PI_BASE_SLUGS = [
  PI_WEB_STARTER_SLUG,
  PI_AUTH_STARTER_SLUG,
  PI_PAYMENTS_STARTER_SLUG,
] as const;

export type PiBaseSlug = (typeof PI_BASE_SLUGS)[number];

/** Phase 2 marketplace skill slugs. */
export const PI_SKILL_SLUGS = [
  'pi-sdk',
  'pi-auth',
  'pi-platform-api',
  'pi-payments',
  'pi-developer-portal',
  'pi-browser',
  'pi-compliance',
] as const;

export type PiSkillSlug = (typeof PI_SKILL_SLUGS)[number];

/**
 * Recommended marketplace skill slugs per Pi starter.
 * Skills are NOT auto-assigned at project create — they require the existing
 * OpenSail AgentSkillAssignment flow (Marketplace purchase → install on agent).
 */
export const PI_RECOMMENDED_SKILLS_BY_BASE: Record<PiBaseSlug, readonly PiSkillSlug[]> = {
  [PI_WEB_STARTER_SLUG]: ['pi-sdk', 'pi-developer-portal', 'pi-browser', 'pi-compliance'],
  [PI_AUTH_STARTER_SLUG]: [
    'pi-auth',
    'pi-sdk',
    'pi-platform-api',
    'pi-browser',
    'pi-compliance',
    'pi-developer-portal',
  ],
  [PI_PAYMENTS_STARTER_SLUG]: [
    'pi-payments',
    'pi-auth',
    'pi-sdk',
    'pi-platform-api',
    'pi-browser',
    'pi-developer-portal',
    'pi-compliance',
  ],
};

/** Skills expected when a developer asks to extend a starter (agent safety matrix). */
export const PI_SKILLS_FOR_PROMPT: Record<
  'add-pi-login' | 'verify-pi-user' | 'add-pi-payment',
  readonly PiSkillSlug[]
> = {
  'add-pi-login': ['pi-auth', 'pi-sdk', 'pi-browser'],
  'verify-pi-user': ['pi-auth', 'pi-platform-api'],
  'add-pi-payment': ['pi-payments', 'pi-platform-api'],
};

export function getRecommendedPiSkillsForBase(slug: string | null | undefined): PiSkillSlug[] {
  if (!isPiBaseSlug(slug)) return [];
  return [...PI_RECOMMENDED_SKILLS_BY_BASE[slug]];
}

export const PI_SETUP_STORAGE_KEY = 'tesslate.pi.setupBaseSlug';

export interface PiFeatureFlagState {
  pi_knowledge: boolean;
  pi_skills: boolean;
  pi_templates: boolean;
  pi_payments_template: boolean;
}

export function isPiBaseSlug(slug: string | null | undefined): slug is PiBaseSlug {
  return !!slug && (PI_BASE_SLUGS as readonly string[]).includes(slug);
}

export function isPiSkillSlug(slug: string | null | undefined): slug is PiSkillSlug {
  return !!slug && (PI_SKILL_SLUGS as readonly string[]).includes(slug);
}

/** Whether a MarketplaceBase slug should appear given current Pi flags. */
export function isPiBaseVisible(
  slug: string | null | undefined,
  flags: Pick<PiFeatureFlagState, 'pi_templates' | 'pi_payments_template'>
): boolean {
  if (!slug || !isPiBaseSlug(slug)) return true;
  if (slug === PI_PAYMENTS_STARTER_SLUG) return flags.pi_payments_template;
  return flags.pi_templates;
}

/** Whether a marketplace skill slug should appear given current Pi flags. */
export function isPiSkillVisible(
  slug: string | null | undefined,
  flags: Pick<PiFeatureFlagState, 'pi_skills'>
): boolean {
  if (!slug || !isPiSkillSlug(slug)) return true;
  return flags.pi_skills;
}

/** Featured create-flow slugs to append when flags allow. */
export function getEnabledPiFeaturedSlugs(
  flags: Pick<PiFeatureFlagState, 'pi_templates' | 'pi_payments_template'>
): PiBaseSlug[] {
  const out: PiBaseSlug[] = [];
  if (flags.pi_templates) {
    out.push(PI_WEB_STARTER_SLUG, PI_AUTH_STARTER_SLUG);
  }
  if (flags.pi_payments_template) {
    out.push(PI_PAYMENTS_STARTER_SLUG);
  }
  return out;
}

export function persistPiSetupBaseSlug(slug: string | null | undefined): void {
  if (typeof sessionStorage === 'undefined') return;
  if (slug && isPiBaseSlug(slug)) {
    sessionStorage.setItem(PI_SETUP_STORAGE_KEY, slug);
  } else {
    sessionStorage.removeItem(PI_SETUP_STORAGE_KEY);
  }
}

export function readPiSetupBaseSlug(): PiBaseSlug | null {
  if (typeof sessionStorage === 'undefined') return null;
  const value = sessionStorage.getItem(PI_SETUP_STORAGE_KEY);
  return isPiBaseSlug(value) ? value : null;
}

export function clearPiSetupBaseSlug(): void {
  if (typeof sessionStorage === 'undefined') return;
  sessionStorage.removeItem(PI_SETUP_STORAGE_KEY);
}

export interface PiStarterSummary {
  slug: PiBaseSlug;
  name: string;
  shortDescription: string;
  highlights: string[];
}

export const PI_STARTER_SUMMARIES: Record<PiBaseSlug, PiStarterSummary> = {
  [PI_WEB_STARTER_SLUG]: {
    slug: PI_WEB_STARTER_SLUG,
    name: 'Pi Web Starter',
    shortDescription: 'Minimal Pi-compatible web application (SDK init only).',
    highlights: [
      'Official Pi SDK CDN + Pi.init({ version: "2.0", sandbox })',
      'No Pi.authenticate / payments in this starter',
      'Selecting this does not register a Pi app',
    ],
  },
  [PI_AUTH_STARTER_SLUG]: {
    slug: PI_AUTH_STARTER_SLUG,
    name: 'Pi Auth Starter',
    shortDescription: 'Generated-app Pi identity via Pi.authenticate → /v2/me.',
    highlights: [
      'Pi.authenticate(["username"], …) in the generated app',
      'Backend verifies with GET https://api.minepi.com/v2/me',
      'OpenSail account ≠ Pi Pioneer identity',
      'Not OpenSail /api/auth/* login',
    ],
  },
  [PI_PAYMENTS_STARTER_SLUG]: {
    slug: PI_PAYMENTS_STARTER_SLUG,
    name: 'Pi Payments Starter',
    shortDescription: 'Generated-app Pi U2A payments (Testnet-first).',
    highlights: [
      'Testnet-first',
      'Server API Key required (server-side only)',
      'Manual Developer Portal configuration',
      'Mainnet requires human review',
      'Not OpenSail Stripe / Team credits billing',
    ],
  },
};

/** Explicit environment concepts — never collapse into one toggle. */
export const PI_ENVIRONMENT_CONCEPTS = [
  {
    id: 'opensail-preview',
    title: 'OpenSail preview / deployment mode',
    body: 'Use OpenSail preview to test layout, routing, and ordinary frontend behavior. It is not full Pi Browser fidelity and does not guarantee Pi.authenticate() or wallet/payment UI fidelity.',
  },
  {
    id: 'sdk-sandbox',
    title: 'Pi SDK sandbox flag',
    body: 'Pi.init({ sandbox }) / project-local sandbox config is for SDK sandbox testing. Sandbox is not Testnet and is not a Mainnet switch.',
  },
  {
    id: 'portal-network',
    title: 'Developer Portal app network',
    body: 'Testnet vs Mainnet is configured manually in the Developer Portal for your Pi app. OpenSail cannot flip that network for you.',
  },
  {
    id: 'payment-dto',
    title: 'Payment DTO network',
    body: 'Payment approve/complete calls follow the documented Platform API and your registered app network. Do not treat an OpenSail env var as the payment network.',
  },
] as const;

export const PI_WIZARD_STEPS = [
  {
    id: 'choose-starter',
    title: 'Choose Pi starter',
    owner: 'OpenSail assisted',
    detail: 'Pick Pi Web, Auth, or Payments Starter from MarketplaceBases.',
  },
  {
    id: 'choose-environment',
    title: 'Choose intended environment concepts',
    owner: 'Developer decision',
    detail:
      'Review OpenSail preview, SDK sandbox, Developer Portal network, and payment DTO network separately.',
  },
  {
    id: 'review-sdk',
    title: 'Review Pi SDK configuration',
    owner: 'Generated app',
    detail: 'Confirm official CDN + Pi.init version "2.0" and sandbox setting in the starter.',
  },
  {
    id: 'attach-pi-skills',
    title: 'Attach recommended Pi skills',
    owner: 'OpenSail Marketplace',
    detail:
      'Pi skills are not auto-assigned. Purchase each recommended skill in Marketplace, then install it on your project agent (AgentSkillAssignment) so load_skill can resolve the slug.',
  },
  {
    id: 'portal-register',
    title: 'Developer Portal registration',
    owner: 'MANUAL',
    detail: 'Register the Pi app in the Developer Portal. No App Studio API automation exists.',
  },
  {
    id: 'dev-url',
    title: 'Configure development URL',
    owner: 'MANUAL',
    detail: 'Set the application / development URL in the Developer Portal.',
  },
  {
    id: 'domain-validation',
    title: 'Domain validation',
    owner: 'MANUAL when required',
    detail: 'Host validation material as required by the Developer Portal.',
  },
  {
    id: 'sandbox-browser',
    title: 'Test in sandbox / Pi Browser',
    owner: 'MANUAL',
    detail: 'OpenSail preview ≠ Pi Browser. Authorize and test sandbox flows manually.',
  },
  {
    id: 'testnet-verify',
    title: 'Testnet verification',
    owner: 'Developer + Portal',
    detail: 'Verify auth/payments against your Developer Portal Testnet app configuration.',
  },
  {
    id: 'mainnet-review',
    title: 'Mainnet transition',
    owner: 'HUMAN REVIEW',
    detail:
      'Mainnet requires manual Developer Portal setup and human verification. Changing an OpenSail env var or SDK sandbox flag is not a Mainnet switch.',
  },
] as const;

export const PI_PAYMENT_SAFETY = [
  'Server API Key: server-side only',
  'Frontend: never contains Server API Key',
  'Payment approval: backend → documented Platform API',
  'Payment completion: backend → documented Platform API',
  'Fake success: not allowed',
  'Mainnet: manual human review',
] as const;

export const PI_IDENTITY_BOUNDARY =
  'OpenSail account ≠ Pi Pioneer identity. The generated application owns Pi authentication. Do not use Pi as OpenSail login.';

export const PI_BILLING_BOUNDARY =
  'OpenSail subscription / Team credits / Stripe ≠ Pi payments performed by the generated developer application.';
