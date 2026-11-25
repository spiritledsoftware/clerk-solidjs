import type {
  OAuthDeviceVerificationInfo,
  OAuthDeviceVerificationResult
} from '@clerk/shared/types';
import { cleanup } from '@solidjs/testing-library';
import { createSignal, flush } from 'solid-js';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useOAuthConsent } from '../use-oauth-consent';
import { useOAuthDeviceVerification } from '../use-oauth-device-verification';
import { useOrganizationCreationDefaults } from '../use-organization-creation-defaults';
import { createTestClerk, deferred, settle } from './test-utils';

const verificationInfo: OAuthDeviceVerificationInfo = {
  oauthApplicationName: 'TV App',
  oauthApplicationLogoUrl: null,
  clientId: 'client_device',
  scopes: [],
  status: 'pending',
  expiresAt: 1_800_000_000_000
} as unknown as OAuthDeviceVerificationInfo;

const approvedResult = {
  object: 'oauth_device_verification',
  status: 'approved'
} as OAuthDeviceVerificationResult;

// Ported from @clerk/shared's useOAuthDeviceVerification.spec.tsx.
describe('useOAuthDeviceVerification', () => {
  const lookupDeviceVerification = vi.fn(() =>
    Promise.resolve(verificationInfo)
  );
  const submitDeviceVerification = vi.fn(() => Promise.resolve(approvedResult));
  const setup = (status: 'ready' | 'loading' = 'ready') =>
    createTestClerk(
      {
        oauthApplication: { lookupDeviceVerification, submitDeviceVerification }
      },
      { status }
    );

  beforeEach(() => vi.clearAllMocks());
  afterEach(() => cleanup());

  it('does not make a request until an action is called', () => {
    const r = setup().renderHook(() => useOAuthDeviceVerification());
    expect(r.isLoading()).toBe(false);
    expect(r.isSubmitting()).toBe(false);
    expect(lookupDeviceVerification).not.toHaveBeenCalled();
  });

  it('looks up verification information once and stores it', async () => {
    const r = setup().renderHook(() => useOAuthDeviceVerification());
    await r.lookup({ userCode: 'bcdf ghjk' });
    flush();
    expect(lookupDeviceVerification).toHaveBeenCalledWith({
      userCode: 'BCDFGHJK'
    });
    expect(r.data()).toEqual(verificationInfo);
    expect(r.error()).toBeNull();
  });

  it('submits approve and deny decisions with the expected bodies', async () => {
    submitDeviceVerification
      .mockResolvedValueOnce(approvedResult)
      .mockResolvedValueOnce({ ...approvedResult, status: 'denied' } as any);
    const r = setup().renderHook(() => useOAuthDeviceVerification());

    await r.approve({ userCode: 'bcdf ghjk', organizationId: 'org_123' });
    expect(submitDeviceVerification).toHaveBeenLastCalledWith({
      userCode: 'BCDFGHJK',
      organizationId: 'org_123',
      approved: true
    });
    await r.deny({ userCode: 'BCDF-GHJK' });
    flush();
    expect(submitDeviceVerification).toHaveBeenLastCalledWith({
      userCode: 'BCDFGHJK',
      approved: false
    });
    expect(r.result()?.status).toBe('denied');
  });

  it('coalesces equivalent lookups and rejects a distinct one while pending', async () => {
    const pending = deferred<OAuthDeviceVerificationInfo>();
    lookupDeviceVerification.mockImplementationOnce(() => pending.promise);
    const r = setup().renderHook(() => useOAuthDeviceVerification());

    const first = r.lookup({ userCode: 'BCDF-GHJK' });
    expect(r.lookup({ userCode: 'bcdf ghjk' })).toBe(first);
    await expect(r.lookup({ userCode: 'JKLM-NPQR' })).rejects.toMatchObject({
      code: 'oauth_device_verification_lookup_in_progress'
    });
    flush();
    expect(r.isLoading()).toBe(true);
    expect(lookupDeviceVerification).toHaveBeenCalledOnce();

    pending.resolve(verificationInfo);
    await first;
    flush();
    expect(r.isLoading()).toBe(false);
    expect(r.data()).toEqual(verificationInfo);
  });

  it('rejects before Clerk loads and succeeds after', async () => {
    const t = setup('loading');
    const r = t.renderHook(() => useOAuthDeviceVerification());

    await expect(r.lookup({ userCode: 'BCDF-GHJK' })).rejects.toMatchObject({
      code: 'oauth_device_verification_not_ready'
    });
    await expect(r.approve({ userCode: 'BCDF-GHJK' })).rejects.toMatchObject({
      code: 'oauth_device_verification_not_ready'
    });
    flush();
    expect(r.isLoading()).toBe(false);
    expect(r.isSubmitting()).toBe(false);
    expect(r.error()).toBeNull();

    t.setStatus('ready');
    await r.lookup({ userCode: 'BCDF-GHJK' });
    flush();
    expect(r.data()).toEqual(verificationInfo);
  });

  it('rejects a conflicting decision while another is pending', async () => {
    const pending = deferred<OAuthDeviceVerificationResult>();
    submitDeviceVerification.mockImplementationOnce(() => pending.promise);
    const r = setup().renderHook(() => useOAuthDeviceVerification());

    const first = r.approve({ userCode: 'BCDF-GHJK' });
    expect(r.approve({ userCode: 'bcdf ghjk' })).toBe(first);
    await expect(r.deny({ userCode: 'BCDF-GHJK' })).rejects.toMatchObject({
      code: 'oauth_device_verification_submission_in_progress'
    });
    pending.resolve(approvedResult);
    await first;
    flush();
    expect(r.result()).toEqual(approvedResult);
  });

  it('stores and rethrows an action error', async () => {
    const failure = new Error('lookup failed');
    lookupDeviceVerification.mockRejectedValueOnce(failure);
    const r = setup().renderHook(() => useOAuthDeviceVerification());

    await expect(r.lookup({ userCode: 'BCDF-GHJK' })).rejects.toBe(failure);
    flush();
    expect(r.error()).toBe(failure);
    expect(lookupDeviceVerification).toHaveBeenCalledOnce();
  });

  it('reset clears state and ignores a pending response', async () => {
    const pending = deferred<OAuthDeviceVerificationInfo>();
    lookupDeviceVerification.mockImplementationOnce(() => pending.promise);
    const r = setup().renderHook(() => useOAuthDeviceVerification());

    const request = r.lookup({ userCode: 'BCDF-GHJK' });
    r.reset();
    pending.resolve(verificationInfo);
    await request;
    flush();
    expect(r.isLoading()).toBe(false);
    expect(r.data()).toBeUndefined();
    expect(r.error()).toBeNull();
  });
});

// Ported from @clerk/shared's useOAuthConsent.spec.tsx.
describe('useOAuthConsent', () => {
  const getConsentInfo = vi.fn(async () => ({ oauthApplicationName: 'App' }));
  const signedIn = { user: { id: 'user_1' } } as any;

  beforeEach(() => vi.clearAllMocks());
  afterEach(() => cleanup());

  it('fetches consent metadata when signed in, passing scope', async () => {
    const t = createTestClerk(
      { oauthApplication: { getConsentInfo } },
      { resources: signedIn }
    );
    const r = t.renderHook(() =>
      useOAuthConsent(() => ({ oauthClientId: ' client_1 ', scope: 'email' }))
    );
    expect(r.isLoading()).toBe(true);
    await settle();
    expect(getConsentInfo).toHaveBeenCalledWith({
      oauthClientId: 'client_1',
      scope: 'email',
      redirectUri: undefined
    });
    expect(r.data()).toEqual({ oauthApplicationName: 'App' });
  });

  it.each([
    ['the user is null', { user: null }, {}, 'ready'],
    ['Clerk is not loaded', signedIn, {}, 'loading'],
    ['enabled is false', signedIn, { enabled: false }, 'ready'],
    ['oauthClientId is empty', signedIn, { oauthClientId: '  ' }, 'ready']
  ] as const)('does not fetch when %s', async (_, resources, extra, status) => {
    const t = createTestClerk(
      { oauthApplication: { getConsentInfo } },
      { resources: resources as any, status }
    );
    const r = t.renderHook(() =>
      useOAuthConsent(() => ({ oauthClientId: 'client_1', ...extra }))
    );
    await settle();
    expect(getConsentInfo).not.toHaveBeenCalled();
    expect(r.isLoading()).toBe(false);
  });

  it('refetches when the client id changes, keeping previous data meanwhile', async () => {
    const next = deferred<any>();
    getConsentInfo
      .mockResolvedValueOnce({ oauthApplicationName: 'First' })
      .mockImplementationOnce(() => next.promise);
    const [clientId, setClientId] = createSignal('client_1');
    const t = createTestClerk(
      { oauthApplication: { getConsentInfo } },
      { resources: signedIn }
    );
    const r = t.renderHook(() =>
      useOAuthConsent(() => ({ oauthClientId: clientId() }))
    );
    await settle();

    setClientId('client_2');
    flush();
    expect(r.data()).toEqual({ oauthApplicationName: 'First' });
    expect(r.isFetching()).toBe(true);
    next.resolve({ oauthApplicationName: 'Second' });
    await settle();
    expect(r.data()).toEqual({ oauthApplicationName: 'Second' });
  });
});

describe('useOrganizationCreationDefaults', () => {
  afterEach(() => cleanup());

  const env = (enabled: boolean) => ({
    __internal_environment: {
      organizationSettings: { organizationCreationDefaults: { enabled } }
    }
  });

  it('fetches only when the feature is enabled', async () => {
    const getOrganizationCreationDefaults = vi.fn(async () => ({
      form: { name: 'Acme' }
    }));
    const resources = {
      user: { id: 'user_1', getOrganizationCreationDefaults }
    } as any;

    const off = createTestClerk(env(false), { resources });
    off.renderHook(() => useOrganizationCreationDefaults());
    await settle();
    expect(getOrganizationCreationDefaults).not.toHaveBeenCalled();

    const on = createTestClerk(env(true), { resources });
    const r = on.renderHook(() => useOrganizationCreationDefaults());
    await settle();
    expect(getOrganizationCreationDefaults).toHaveBeenCalledOnce();
    expect(r.data()?.form.name).toBe('Acme');
    expect(r.error()).toBeNull();
  });
});
