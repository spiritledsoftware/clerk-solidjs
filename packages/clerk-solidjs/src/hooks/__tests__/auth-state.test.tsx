import type { ClerkStatus, InitialState, Resources } from '@clerk/shared/types';
import { cleanup, render, screen } from '@solidjs/testing-library';
import { createEffect, flush } from 'solid-js';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ClerkProvider } from '../../contexts/clerk';
import { useAuth } from '../use-auth';
import { useSessionList } from '../use-session-list';
import { useUser } from '../use-user';

const fake = vi.hoisted(() => {
  type Listener = (resources: any) => void;
  const state = {
    status: 'loading' as ClerkStatus,
    resources: undefined as any,
    statusHandlers: new Set<(s: ClerkStatus) => void>(),
    listeners: new Set<Listener>()
  };
  class IsomorphicClerk {
    get status() {
      return state.status;
    }
    get loaded() {
      return state.status === 'ready' || state.status === 'degraded';
    }
    get __internal_lastEmittedResources() {
      return state.resources;
    }
    get isSignedIn() {
      return !!state.resources?.session;
    }
    telemetry = undefined;
    on = (_: 'status', handler: (s: ClerkStatus) => void) => {
      state.statusHandlers.add(handler);
    };
    off = (_: 'status', handler: (s: ClerkStatus) => void) => {
      state.statusHandlers.delete(handler);
    };
    addListener = (listener: Listener) => {
      state.listeners.add(listener);
      return () => state.listeners.delete(listener);
    };
    __internal_updateProps = vi.fn().mockResolvedValue(undefined);
    static getOrCreateInstance() {
      return new IsomorphicClerk();
    }
    static clearInstance() {}
  }
  const load = (resources: any) => {
    state.resources = resources;
    state.status = 'ready';
    state.statusHandlers.forEach((h) => h('ready'));
    state.listeners.forEach((l) => l(resources));
  };
  const emit = (resources: any) => {
    state.resources = resources;
    state.listeners.forEach((l) => l(resources));
  };
  const reset = () => {
    state.status = 'loading';
    state.resources = undefined;
    state.statusHandlers.clear();
    state.listeners.clear();
  };
  return { IsomorphicClerk, load, emit, reset };
});

vi.mock('../../isomorphic-clerk', () => ({
  IsomorphicClerk: fake.IsomorphicClerk
}));

const pk = 'pk_test_Y2xlcmsuY2xlcmsuZGV2JA';

const signedIn = (userId: string): Resources =>
  ({
    client: { sessions: [], signedInSessions: [] },
    session: {
      id: 'sess_1',
      status: 'active',
      user: { id: userId },
      lastActiveToken: { jwt: { claims: {} } },
      factorVerificationAge: null
    },
    user: { id: userId },
    organization: null
  }) as unknown as Resources;

const signedOut = {
  client: { sessions: [], signedInSessions: [] },
  session: null,
  user: null,
  organization: null
} as unknown as Resources;

function AuthProbe() {
  const { isLoaded, isSignedIn, userId } = useAuth();
  const { user } = useUser();
  return (
    <p data-testid="probe">
      {String(isLoaded())}|{String(isSignedIn())}|{String(userId())}|
      {String(user()?.id)}
    </p>
  );
}

const renderProbe = (initialState?: InitialState) =>
  render(() => (
    <ClerkProvider publishableKey={pk} initialState={initialState}>
      <AuthProbe />
    </ClerkProvider>
  ));

describe('auth state', () => {
  afterEach(() => {
    cleanup();
    fake.reset();
  });

  it('is unloaded before Clerk loads and without initial state', () => {
    renderProbe();
    expect(screen.getByTestId('probe').textContent).toBe(
      'false|undefined|undefined|undefined'
    );
  });

  it('uses the server initial state until Clerk loads', () => {
    renderProbe({
      userId: 'user_ssr',
      sessionId: 'sess_ssr',
      sessionStatus: 'active',
      sessionClaims: {},
      user: { id: 'user_ssr' }
    } as unknown as InitialState);
    expect(screen.getByTestId('probe').textContent).toBe(
      'true|true|user_ssr|user_ssr'
    );
  });

  it('follows Clerk once it loads and on every emission', async () => {
    renderProbe();
    await Promise.resolve();
    flush();

    fake.load(signedIn('user_1'));
    flush();
    expect(screen.getByTestId('probe').textContent).toBe(
      'true|true|user_1|user_1'
    );

    fake.emit(signedOut);
    flush();
    expect(screen.getByTestId('probe').textContent).toBe(
      'true|false|null|undefined'
    );
  });

  it('notifies a useAuth field only when its value changes', async () => {
    const runs: unknown[] = [];
    function Probe() {
      const { userId } = useAuth();
      createEffect(
        () => userId(),
        (value) => {
          runs.push(value);
        }
      );
      return null;
    }
    render(() => (
      <ClerkProvider publishableKey={pk}>
        <Probe />
      </ClerkProvider>
    ));
    await Promise.resolve();
    flush();

    fake.load(signedIn('user_1'));
    flush();
    // Token refreshes and client updates emit again with the same user.
    fake.emit(signedIn('user_1'));
    flush();
    fake.emit(signedIn('user_1'));
    flush();

    expect(runs).toEqual([undefined, 'user_1']);
  });

  it('follows sessions when Clerk updates the client in place', async () => {
    const lengths: number[] = [];
    function Probe() {
      const { sessions } = useSessionList();
      createEffect(
        () => sessions()?.length ?? 0,
        (length) => {
          lengths.push(length);
        }
      );
      return null;
    }
    render(() => (
      <ClerkProvider publishableKey={pk}>
        <Probe />
      </ClerkProvider>
    ));
    await Promise.resolve();
    flush();

    const resources = signedIn('user_1') as any;
    resources.client.sessions = [{ id: 'sess_1' }];
    fake.load(resources);
    flush();

    // Same Client object, new sessions array, as clerk-js does on update.
    resources.client.sessions = [{ id: 'sess_1' }, { id: 'sess_2' }];
    fake.emit({ ...resources });
    flush();

    expect(lengths).toEqual([0, 1, 2]);
  });
});
