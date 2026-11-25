import { render } from '@solidjs/testing-library';
import { useContext } from 'solid-js';
import { afterEach, describe, expect, it, vi } from 'vitest';

const getOrCreateInstance = vi.hoisted(() => vi.fn());

vi.mock('../../../isomorphic-clerk', () => {
  let instance: any;
  class IsomorphicClerk {
    status = 'loading';
    on = vi.fn();
    off = vi.fn();
    addListener = vi.fn(() => () => {});
    __internal_updateProps = vi.fn().mockResolvedValue(undefined);
    static getOrCreateInstance(options: unknown) {
      getOrCreateInstance(options);
      instance ??= new IsomorphicClerk();
      return instance;
    }
    static clearInstance() {
      instance = undefined;
    }
  }
  return { IsomorphicClerk };
});

import { ClerkContext } from '../../../contexts/clerk-instance';
import {
  CLERK_HYDRATION_KEY,
  type ClerkInitialState
} from '../../shared/state';
import { ClerkProvider } from '../clerk-provider';

const PUBLISHABLE_KEY = 'pk_test_Y2xlcmsuZXhhbXBsZS5jb20k';

const serverState: ClerkInitialState = {
  __internal_clerk_state: {
    __clerk_ssr_state: { userId: 'user_123', sessionId: 'sess_123' } as any,
    __publishableKey: PUBLISHABLE_KEY,
    __signInUrl: '/sign-in',
    __signInForceRedirectUrl: ''
  }
};

function InitialUserId() {
  const ctx = useContext(ClerkContext);
  return (
    <span data-testid="user">{ctx?.initialState()?.userId ?? 'none'}</span>
  );
}

describe('start ClerkProvider', () => {
  afterEach(() => {
    delete (globalThis as any)._$HY;
    getOrCreateInstance.mockReset();
  });

  it('takes the server state from the hydration channel', () => {
    (globalThis as any)._$HY = { r: { [CLERK_HYDRATION_KEY]: serverState } };

    const { getByTestId } = render(() => (
      <ClerkProvider>
        <InitialUserId />
      </ClerkProvider>
    ));

    expect(getByTestId('user').textContent).toBe('user_123');
    expect(getOrCreateInstance).toHaveBeenCalledWith(
      expect.objectContaining({
        publishableKey: PUBLISHABLE_KEY,
        signInUrl: '/sign-in',
        signInForceRedirectUrl: undefined
      })
    );
  });

  it('lets props override the server state', () => {
    (globalThis as any)._$HY = { r: { [CLERK_HYDRATION_KEY]: serverState } };

    render(() => (
      <ClerkProvider signInUrl="/login">
        <InitialUserId />
      </ClerkProvider>
    ));

    expect(getOrCreateInstance).toHaveBeenCalledWith(
      expect.objectContaining({ signInUrl: '/login' })
    );
  });
});
