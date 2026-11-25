import { afterEach, describe, expect, it, vi } from 'vitest';
import { getResponseClerkState } from '../utils';

const requestState = {
  status: 'signed-out',
  reason: null,
  message: null,
  publishableKey: 'pk_test_x',
  proxyUrl: '',
  domain: '',
  isSatellite: false,
  signInUrl: '',
  signUpUrl: '',
  afterSignInUrl: '',
  afterSignUpUrl: '',
  isSignedIn: false,
  headers: new Headers(),
  toAuth: () => ({ userId: null, sessionId: null })
} as any;

describe('getResponseClerkState()', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('reads VITE_-prefixed settings, as the client does', () => {
    vi.stubEnv('VITE_CLERK_SIGN_IN_FORCE_REDIRECT_URL', '/vite-sign-in');
    vi.stubEnv('VITE_CLERK_UI_URL', 'https://ui.example.com');
    vi.stubEnv('CLERK_SIGN_UP_FALLBACK_REDIRECT_URL', '/plain-sign-up');

    const state = getResponseClerkState(requestState).__internal_clerk_state;

    expect(state.__signInForceRedirectUrl).toBe('/vite-sign-in');
    expect(state.__clerkUIUrl).toBe('https://ui.example.com');
    expect(state.__signUpFallbackRedirectUrl).toBe('/plain-sign-up');
  });

  it('prefers the options passed to the middleware over the environment', () => {
    vi.stubEnv('VITE_CLERK_SIGN_IN_FORCE_REDIRECT_URL', '/vite-sign-in');

    const state = getResponseClerkState(requestState, {
      signInForceRedirectUrl: '/option-sign-in'
    }).__internal_clerk_state;

    expect(state.__signInForceRedirectUrl).toBe('/option-sign-in');
  });
});
