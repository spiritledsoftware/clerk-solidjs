import { cleanup, render, screen } from '@solidjs/testing-library';
import { flush } from 'solid-js';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  CheckoutProvider,
  useCheckout,
  usePaymentMethods,
  usePlans,
  useStatements,
  useSubscription
} from '../billing';
import { useAPIKeys } from '../use-api-keys';
import { createTestClerk, pageOf, settle } from './test-utils';

const environment = (user = true, organization = true) => ({
  __internal_environment: {
    commerceSettings: {
      billing: {
        user: { enabled: user },
        organization: { enabled: organization }
      }
    }
  }
});

const signedIn = (withOrg = false) =>
  ({
    user: {
      id: 'user_1',
      getPaymentMethods: vi.fn(async () => pageOf(1, 10, 1))
    },
    organization: withOrg
      ? {
          id: 'org_1',
          getPaymentMethods: vi.fn(async () => pageOf(1, 10, 2))
        }
      : null
  }) as any;

describe('usePlans', () => {
  const getPlans = vi.fn(async (p: any) =>
    pageOf(p.initialPage, p.pageSize, 3)
  );
  beforeEach(() => vi.clearAllMocks());
  afterEach(() => cleanup());

  it('does not fetch before Clerk loads', async () => {
    const t = createTestClerk(
      { billing: { getPlans }, ...environment() },
      { status: 'loading' }
    );
    t.renderHook(() => usePlans());
    await settle();
    expect(getPlans).not.toHaveBeenCalled();
  });

  it('fetches plans for users and organizations, signed out too', async () => {
    const t = createTestClerk(
      { billing: { getPlans }, ...environment() },
      { resources: { user: null, organization: null } as any }
    );
    const r = t.renderHook(() => ({
      user: usePlans(),
      org: usePlans(() => ({ for: 'organization', pageSize: 5 }))
    }));
    await settle();
    expect(getPlans).toHaveBeenCalledWith({
      initialPage: 1,
      pageSize: 10,
      for: 'user'
    });
    expect(getPlans).toHaveBeenCalledWith({
      initialPage: 1,
      pageSize: 5,
      for: 'organization'
    });
    expect(r.user.data()).toHaveLength(3);

    // Revalidating user plans does not refetch organization plans.
    getPlans.mockClear();
    await r.user.revalidate();
    expect(getPlans).toHaveBeenCalledTimes(1);
    expect(getPlans).toHaveBeenCalledWith(
      expect.objectContaining({ for: 'user' })
    );
  });
});

describe('authenticated billing lists', () => {
  afterEach(() => cleanup());

  it('fetches statements and payment methods for the requested payer', async () => {
    const getStatements = vi.fn(async () => pageOf(1, 10, 4));
    const resources = signedIn(true);
    const t = createTestClerk(
      { billing: { getStatements }, ...environment() },
      { resources }
    );
    const r = t.renderHook(() => ({
      statements: useStatements(() => ({ for: 'organization' })),
      methods: usePaymentMethods(() => ({ for: 'organization' })),
      userMethods: usePaymentMethods()
    }));
    await settle();

    expect(getStatements).toHaveBeenCalledWith({
      orgId: 'org_1',
      initialPage: 1,
      pageSize: 10
    });
    expect(r.statements.count()).toBe(4);
    expect(r.methods.count()).toBe(2);
    expect(r.userMethods.count()).toBe(1);
  });

  it('does not fetch when billing is disabled for the payer', async () => {
    const getStatements = vi.fn(async () => pageOf(1, 10, 4));
    const t = createTestClerk(
      { billing: { getStatements }, ...environment(false, true) },
      { resources: signedIn() }
    );
    t.renderHook(() => useStatements(() => ({ for: 'user' })));
    await settle();
    expect(getStatements).not.toHaveBeenCalled();
  });
});

describe('useSubscription', () => {
  afterEach(() => cleanup());

  it('fetches the subscription and clears it on sign-out', async () => {
    const getSubscription = vi.fn(async () => ({ id: 'sub_1' }));
    const t = createTestClerk(
      { billing: { getSubscription }, ...environment() },
      { resources: signedIn() }
    );
    const r = t.renderHook(() => useSubscription());
    await settle();
    expect(getSubscription).toHaveBeenCalledWith({ orgId: undefined });
    expect(r.data()).toEqual({ id: 'sub_1' });

    t.setResources({ user: null, organization: null } as any);
    await settle();
    expect(r.data()).toBeUndefined();
  });

  it('does not fetch when billing is disabled', async () => {
    const getSubscription = vi.fn();
    const t = createTestClerk(
      { billing: { getSubscription }, ...environment(false, false) },
      { resources: signedIn() }
    );
    const r = t.renderHook(() => useSubscription());
    await settle();
    expect(getSubscription).not.toHaveBeenCalled();
    expect(r.isLoading()).toBe(false);
  });

  it('revalidate fetches the latest subscription', async () => {
    let id = 'sub_1';
    const getSubscription = vi.fn(async () => ({ id }));
    const t = createTestClerk(
      { billing: { getSubscription }, ...environment() },
      { resources: signedIn() }
    );
    const r = t.renderHook(() => useSubscription());
    await settle();
    id = 'sub_2';
    await r.revalidate();
    flush();
    expect(r.data()).toEqual({ id: 'sub_2' });
  });
});

describe('useCheckout', () => {
  afterEach(() => cleanup());

  it('reads the checkout signal with provider options and follows emissions', () => {
    const effects = new Set<() => void>();
    let fetchStatus = 'idle';
    const checkout = vi.fn((params: any) => ({
      checkout: { planId: params.planId },
      errors: { global: null },
      fetchStatus
    }));
    const t = createTestClerk(
      {
        __experimental_checkout: checkout,
        __internal_state: {
          __internal_effect: (cb: () => void) => {
            effects.add(cb);
            cb();
            return () => effects.delete(cb);
          }
        }
      },
      { resources: signedIn() }
    );

    let result!: ReturnType<typeof useCheckout>;
    const Probe = () => {
      result = useCheckout();
      return <p data-testid="status">{result.fetchStatus()}</p>;
    };
    render(() => (
      <t.Wrapper>
        <CheckoutProvider planId="cplan_1" planPeriod="month">
          <Probe />
        </CheckoutProvider>
      </t.Wrapper>
    ));

    expect((result.checkout() as any).planId).toBe('cplan_1');
    expect(checkout).toHaveBeenCalledWith(
      expect.objectContaining({ planId: 'cplan_1', planPeriod: 'month' })
    );

    fetchStatus = 'fetching';
    effects.forEach((cb) => cb());
    flush();
    expect(screen.getByTestId('status').textContent).toBe('fetching');
  });
});

describe('useAPIKeys', () => {
  afterEach(() => cleanup());

  it('fetches keys for the subject and revalidates', async () => {
    let total = 2;
    const getAll = vi.fn(async (p: any) =>
      pageOf(p.initialPage, p.pageSize, total)
    );
    const t = createTestClerk(
      { apiKeys: { getAll } },
      { resources: signedIn() }
    );
    const r = t.renderHook(() =>
      useAPIKeys(() => ({ subject: 'user_1', query: 'ci' }))
    );
    await settle();
    expect(getAll).toHaveBeenCalledWith({
      subject: 'user_1',
      query: 'ci',
      initialPage: 1,
      pageSize: 10
    });
    expect(r.count()).toBe(2);

    total = 3;
    await r.revalidate();
    flush();
    expect(r.count()).toBe(3);
  });

  it('does not fetch when disabled', async () => {
    const getAll = vi.fn();
    const t = createTestClerk(
      { apiKeys: { getAll } },
      { resources: signedIn() }
    );
    t.renderHook(() => useAPIKeys(() => ({ enabled: false })));
    await settle();
    expect(getAll).not.toHaveBeenCalled();
  });
});
