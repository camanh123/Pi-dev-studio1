import { describe, expect, it } from 'vitest';
import { resolveHomeDataEnvironment, getHomeDataSource } from './resolveHomeDataSource';
import { demoHomeSource, testnetHomeSource, productionHomeSource } from './sources';
import { isDemoPresentationId, DEMO_HOME_PI_BALANCE, DEMO_HOME_PROJECTS } from './demoCatalog';

describe('resolveHomeDataEnvironment', () => {
  it('prefers Local Demo over requested testnet', () => {
    expect(
      resolveHomeDataEnvironment({ isLocalDemo: true, requested: 'testnet' }),
    ).toBe('demo');
  });

  it('returns testnet only when explicitly requested and not Local Demo', () => {
    expect(
      resolveHomeDataEnvironment({ isLocalDemo: false, requested: 'testnet' }),
    ).toBe('testnet');
  });

  it('defaults to production when not demo', () => {
    expect(resolveHomeDataEnvironment({ isLocalDemo: false })).toBe('production');
  });
});

describe('getHomeDataSource', () => {
  it('maps environments to sources', () => {
    expect(getHomeDataSource({ isLocalDemo: true })).toBe(demoHomeSource);
    expect(getHomeDataSource({ isLocalDemo: false, requested: 'testnet' })).toBe(
      testnetHomeSource,
    );
    expect(getHomeDataSource({ isLocalDemo: false })).toBe(productionHomeSource);
  });
});

describe('demo presentation catalog safety', () => {
  it('marks all demo projects as presentation data with demo: ids', () => {
    for (const p of DEMO_HOME_PROJECTS) {
      expect(p.isPresentationData).toBe(true);
      expect(isDemoPresentationId(p.id)).toBe(true);
    }
  });

  it('keeps DEMO Pi balance non-payable and presentation-only', () => {
    expect(DEMO_HOME_PI_BALANCE.ledgerEnvironment).toBe('DEMO');
    expect(DEMO_HOME_PI_BALANCE.paymentsEnabled).toBe(false);
    expect(DEMO_HOME_PI_BALANCE.isPresentationData).toBe(true);
    expect(DEMO_HOME_PI_BALANCE.state).toBe('simulated');
  });

  it('demo source never enables backend mutation or Pi auth simulation', async () => {
    const loaded = await demoHomeSource.load({
      subscriptionTier: 'free',
      isAuthenticated: true,
    });
    expect(loaded.capabilities.canMutateBackend).toBe(false);
    expect(loaded.capabilities.piAuthSimulated).toBe(false);
    expect(loaded.piBalance.paymentsEnabled).toBe(false);
    expect(loaded.environment).toBe('demo');
  });

  it('testnet stub keeps payments disabled and feeds unavailable', async () => {
    const loaded = await testnetHomeSource.load({
      subscriptionTier: 'free',
      isAuthenticated: true,
    });
    expect(loaded.environment).toBe('testnet');
    expect(loaded.piBalance.ledgerEnvironment).toBe('TESTNET');
    expect(loaded.piBalance.paymentsEnabled).toBe(false);
    expect(loaded.projects.state).toBe('unavailable');
    expect(loaded.capabilities.canMutateBackend).toBe(false);
  });
});
