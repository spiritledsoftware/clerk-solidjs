import { cleanup } from '@solidjs/testing-library';
import { createMemo, flush } from 'solid-js';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useSignIn, useSignUp, useWaitlist } from '../use-clerk-signal';
import { createTestClerk } from './test-utils';

/** A stand-in for Clerk's alien-signals `State`: values plus effect subscriptions. */
function createFakeState(prefix: string) {
  const values = {
    signIn: {
      signIn: { status: `${prefix}-a` },
      errors: { raw: null },
      fetchStatus: 'idle'
    },
    signUp: {
      signUp: { status: `${prefix}-a` },
      errors: { raw: null },
      fetchStatus: 'idle'
    },
    waitlist: {
      waitlist: { id: `${prefix}-a` },
      errors: { raw: null },
      fetchStatus: 'idle'
    }
  } as Record<string, any>;
  const effects = new Set<() => void>();
  const state = {
    signInSignal: () => values.signIn,
    signUpSignal: () => values.signUp,
    waitlistSignal: () => values.waitlist,
    __internal_effect: vi.fn((cb: () => void) => {
      effects.add(cb);
      cb();
      return () => effects.delete(cb);
    })
  };
  return {
    state,
    effects,
    emit: (name: string, value: any) => {
      values[name] = value;
      effects.forEach((cb) => cb());
    }
  };
}

describe('signal hooks', () => {
  afterEach(() => cleanup());

  it('reads the pre-load state and switches to Clerk state once loaded', async () => {
    const proxy = createFakeState('proxy');
    const loadedState = createFakeState('loaded');
    let isLoaded = false;
    const t = createTestClerk(
      {
        get __internal_state() {
          return isLoaded ? loadedState.state : proxy.state;
        }
      },
      { status: 'loading' }
    );

    const r = t.renderHook(() => useSignIn());
    expect(r.signIn().status).toBe('proxy-a');
    expect(r.fetchStatus()).toBe('idle');
    // Nothing subscribes before Clerk loads.
    expect(proxy.state.__internal_effect).not.toHaveBeenCalled();

    isLoaded = true;
    t.setStatus('ready');
    expect(r.signIn().status).toBe('loaded-a');
    expect(loadedState.state.__internal_effect).toHaveBeenCalledTimes(1);
  });

  it('updates accessors and dependent memos on every emission', () => {
    const fake = createFakeState('x');
    const t = createTestClerk({ __internal_state: fake.state });

    const r = t.renderHook(() => {
      const { signIn, errors, fetchStatus } = useSignIn();
      const status = createMemo(() => signIn().status);
      return { signIn, errors, fetchStatus, status };
    });
    expect(r.status()).toBe('x-a');

    const sameResource = { status: 'needs_first_factor' };
    fake.emit('signIn', {
      signIn: sameResource,
      errors: { raw: [{ code: 'bad' }] },
      fetchStatus: 'fetching'
    });
    flush();
    expect(r.status()).toBe('needs_first_factor');
    expect(r.fetchStatus()).toBe('fetching');
    expect(r.errors().raw).toEqual([{ code: 'bad' }]);

    // Clerk may mutate the same resource and re-emit; the accessor still updates.
    sameResource.status = 'complete';
    fake.emit('signIn', {
      signIn: sameResource,
      errors: { raw: null },
      fetchStatus: 'idle'
    });
    flush();
    expect(r.status()).toBe('complete');
  });

  it('exposes useSignUp and useWaitlist', () => {
    const fake = createFakeState('y');
    const t = createTestClerk({ __internal_state: fake.state });
    const r = t.renderHook(() => ({ up: useSignUp(), wait: useWaitlist() }));

    expect(r.up.signUp().status).toBe('y-a');
    expect(r.wait.waitlist().id).toBe('y-a');

    fake.emit('waitlist', {
      waitlist: { id: 'joined' },
      errors: { raw: null },
      fetchStatus: 'idle'
    });
    flush();
    expect(r.wait.waitlist().id).toBe('joined');
  });

  it('unsubscribes when the owner is disposed', () => {
    const fake = createFakeState('z');
    const t = createTestClerk({ __internal_state: fake.state });
    t.renderHook(() => useSignIn());
    expect(fake.effects.size).toBe(1);
    cleanup();
    expect(fake.effects.size).toBe(0);
  });
});
