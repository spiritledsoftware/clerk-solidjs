import { cleanup } from '@solidjs/testing-library';
import { createSignal, flush } from 'solid-js';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useOrganization } from '../use-organization';
import { useOrganizationList } from '../use-organization-list';
import { createTestClerk, pageOf, settle } from './test-utils';

const makeOrg = (id: string) => ({
  id,
  getMemberships: vi.fn(async (p: any) =>
    pageOf(p.initialPage, p.pageSize, 25)
  ),
  getDomains: vi.fn(async () => pageOf(1, 10, 1)),
  getInvitations: vi.fn(async () => pageOf(1, 10, 2)),
  getMembershipRequests: vi.fn(async () => pageOf(1, 10, 0))
});

const resourcesFor = (org: ReturnType<typeof makeOrg> | null) => {
  const membership = org && { id: 'mem_1', organization: { id: org.id } };
  const user = {
    id: 'user_1',
    organizationMemberships: membership ? [membership] : [],
    getOrganizationMemberships: vi.fn(async (p: any) =>
      pageOf(p.initialPage, p.pageSize, 3)
    ),
    getOrganizationInvitations: vi.fn(async () => pageOf(1, 10, 1)),
    getOrganizationSuggestions: vi.fn(async () => pageOf(1, 10, 0))
  };
  return {
    client: {},
    user,
    session: { id: 'sess_1', user },
    organization: org
  } as any;
};

describe('useOrganization', () => {
  afterEach(() => cleanup());

  it('is not loaded before Clerk loads', () => {
    const t = createTestClerk({}, { status: 'loading' });
    const r = t.renderHook(() =>
      useOrganization(() => ({ memberships: true }))
    );

    expect(r.isLoaded()).toBe(false);
    expect(r.organization()).toBeUndefined();
    expect(r.membership()).toBeUndefined();
    expect(r.memberships()?.data()).toBeUndefined();
    expect(r.memberships()?.isLoading()).toBe(false);
    expect(r.memberships()?.fetchNext).toBeUndefined();
  });

  it('returns null lists without an Active Organization', () => {
    const t = createTestClerk({}, { resources: resourcesFor(null) });
    const r = t.renderHook(() =>
      useOrganization(() => ({ memberships: true }))
    );

    expect(r.isLoaded()).toBe(true);
    expect(r.organization()).toBeNull();
    expect(r.membership()).toBeNull();
    expect(r.memberships()).toBeNull();
  });

  it('exposes the organization, membership, and opted-in lists', async () => {
    const org = makeOrg('org_1');
    const t = createTestClerk({}, { resources: resourcesFor(org) });
    const r = t.renderHook(() =>
      useOrganization(() => ({
        memberships: { pageSize: 5, role: ['org:admin'] },
        invitations: true
      }))
    );
    await settle();

    expect(r.isLoaded()).toBe(true);
    expect(r.organization()?.id).toBe('org_1');
    expect(r.membership()?.id).toBe('mem_1');
    expect(org.getMemberships).toHaveBeenCalledWith({
      role: ['org:admin'],
      query: undefined,
      initialPage: 1,
      pageSize: 5
    });
    expect(org.getInvitations).toHaveBeenCalledWith({
      status: ['pending'],
      initialPage: 1,
      pageSize: 10
    });
    // Not opted in.
    expect(org.getDomains).not.toHaveBeenCalled();
    expect(org.getMembershipRequests).not.toHaveBeenCalled();

    const memberships = r.memberships()!;
    expect(memberships.data()).toHaveLength(5);
    expect(memberships.count()).toBe(25);
    expect(memberships.pageCount()).toBe(5);
  });

  it('refetches lists when the Active Organization changes', async () => {
    const first = makeOrg('org_1');
    const second = makeOrg('org_2');
    second.getMemberships.mockImplementation(async () => pageOf(1, 10, 1));
    const t = createTestClerk({}, { resources: resourcesFor(first) });
    const r = t.renderHook(() =>
      useOrganization(() => ({ memberships: true }))
    );
    await settle();
    expect(r.memberships()?.count()).toBe(25);

    t.setResources(resourcesFor(second));
    await settle();
    expect(second.getMemberships).toHaveBeenCalledTimes(1);
    expect(r.memberships()?.count()).toBe(1);
  });

  it('reacts to opting in later', async () => {
    const org = makeOrg('org_1');
    const t = createTestClerk({}, { resources: resourcesFor(org) });
    const [opted, setOpted] = createSignal(false);
    t.renderHook(() =>
      useOrganization(() => (opted() ? { domains: true } : {}))
    );
    await settle();
    expect(org.getDomains).not.toHaveBeenCalled();

    setOpted(true);
    flush();
    await settle();
    expect(org.getDomains).toHaveBeenCalledTimes(1);
  });

  it('prompts to enable Organizations once, unless skipped', async () => {
    const attempt = vi.fn();
    const t = createTestClerk({
      __internal_attemptToEnableEnvironmentSetting: attempt
    });
    t.renderHook(() => {
      useOrganization();
      useOrganization(() => ({
        __internal_skipAttemptToEnableOrganizations: true
      }));
    });
    flush();
    expect(attempt).toHaveBeenCalledTimes(1);
    expect(attempt).toHaveBeenCalledWith({
      for: 'organizations',
      caller: 'useOrganization'
    });
  });
});

describe('useOrganizationList', () => {
  afterEach(() => cleanup());

  it('uses placeholders until a user is loaded', () => {
    const t = createTestClerk({}, { status: 'loading' });
    const r = t.renderHook(() =>
      useOrganizationList(() => ({ userMemberships: true }))
    );
    expect(r.isLoaded()).toBe(false);
    expect(r.userMemberships().data()).toBeUndefined();
    expect(r.userMemberships().fetchNext).toBeUndefined();
  });

  it('fetches the opted-in user lists', async () => {
    const resources = resourcesFor(null);
    const setActive = vi.fn();
    const createOrganization = vi.fn();
    const t = createTestClerk({ setActive, createOrganization }, { resources });
    const r = t.renderHook(() =>
      useOrganizationList(() => ({
        userMemberships: { infinite: true, pageSize: 2 },
        userInvitations: true
      }))
    );
    await settle();

    expect(r.isLoaded()).toBe(true);
    expect(resources.user.getOrganizationMemberships).toHaveBeenCalledWith({
      initialPage: 1,
      pageSize: 2
    });
    expect(resources.user.getOrganizationInvitations).toHaveBeenCalledWith({
      status: 'pending',
      initialPage: 1,
      pageSize: 10
    });
    expect(resources.user.getOrganizationSuggestions).not.toHaveBeenCalled();

    const memberships = r.userMemberships();
    expect(memberships.data()).toHaveLength(2);
    expect(memberships.hasNextPage()).toBe(true);
    memberships.fetchNext?.();
    await settle();
    expect(r.userMemberships().data()).toHaveLength(3);
    expect(r.userMemberships().hasNextPage()).toBe(false);

    void r.setActive({ organization: 'org_1' });
    expect(setActive).toHaveBeenCalledWith({ organization: 'org_1' });
    void r.createOrganization({ name: 'Acme' });
    expect(createOrganization).toHaveBeenCalledWith({ name: 'Acme' });
  });

  it('does not prompt to enable Organizations without any list', () => {
    const attempt = vi.fn();
    const t = createTestClerk(
      { __internal_attemptToEnableEnvironmentSetting: attempt },
      { resources: resourcesFor(null) }
    );
    t.renderHook(() => useOrganizationList());
    flush();
    expect(attempt).not.toHaveBeenCalled();
  });
});
