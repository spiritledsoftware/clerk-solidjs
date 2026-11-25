import { createRoot, createSignal, flush } from 'solid-js';
import { describe, expect, it, vi } from 'vitest';
import { useDerivedAuth } from '../use-auth';

const signedIn = {
  sessionId: 'sess_1',
  sessionStatus: 'active',
  userId: 'user_1',
  actor: null,
  orgId: 'org_1',
  orgRole: 'org:admin',
  orgSlug: 'acme',
  orgPermissions: ['org:sys_memberships:manage'],
  factorVerificationAge: null,
  sessionClaims: { sub: 'user_1' }
};

const signedOut = {
  sessionId: null,
  userId: null,
  actor: null,
  orgId: null,
  orgRole: null,
  orgSlug: null,
  orgPermissions: null,
  sessionClaims: null
};

describe('useDerivedAuth()', () => {
  it('derives the auth state and builds `has` from the claims', () => {
    createRoot((dispose) => {
      const auth = useDerivedAuth(() => signedIn);
      expect(auth.isLoaded()).toBe(true);
      expect(auth.isSignedIn()).toBe(true);
      expect(auth.userId()).toBe('user_1');
      expect(auth.orgSlug()).toBe('acme');
      expect(auth.sessionStatus()).toBe('active');
      expect(auth.has({ role: 'org:admin' })).toBe(true);
      expect(auth.has({ role: 'org:member' })).toBe(false);
      dispose();
    });
  });

  it("uses the auth object's own `has`, `signOut` and `getToken`", async () => {
    const has = vi.fn(() => true);
    const signOut = vi.fn(async () => {});
    const getToken = vi.fn(async () => 'token');
    await createRoot(async (dispose) => {
      const auth = useDerivedAuth(() => ({
        ...signedIn,
        has,
        signOut,
        getToken
      }));
      expect(auth.has({ role: 'org:anything' })).toBe(true);
      expect(has).toHaveBeenCalledWith({ role: 'org:anything' });
      await auth.signOut();
      expect(signOut).toHaveBeenCalled();
      expect(await auth.getToken()).toBe('token');
      dispose();
    });
  });

  it('follows the auth object as it changes', () => {
    const [state, setState] = createSignal<any>(signedIn);
    const { auth, dispose } = createRoot((dispose) => ({
      auth: useDerivedAuth(state),
      dispose
    }));
    expect(auth.isSignedIn()).toBe(true);
    setState(signedOut);
    flush();
    expect(auth.isSignedIn()).toBe(false);
    expect(auth.userId()).toBe(null);
    expect(auth.orgPermissions()).toBeUndefined();
    dispose();
  });
});
