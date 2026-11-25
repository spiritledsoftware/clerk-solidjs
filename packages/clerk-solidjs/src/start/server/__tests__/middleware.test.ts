import type { RequestEvent, ResponseStub } from '@solidjs/web';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const authenticateRequest = vi.fn();

vi.mock('@clerk/backend', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@clerk/backend')>();
  return {
    ...actual,
    createClerkClient: vi.fn(() => ({ authenticateRequest }))
  };
});

import { clerkMiddleware } from '../middleware';

const PUBLISHABLE_KEY = 'pk_test_Y2xlcmsuZXhhbXBsZS5jb20k';
const SECRET_KEY = 'sk_test_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx';

type Event = RequestEvent & { response: ResponseStub };

function createEvent(url = 'http://localhost:3000/protected'): Event {
  return {
    request: new Request(url, { headers: { cookie: '__session=abc' } }),
    locals: {},
    response: { headers: new Headers() }
  };
}

function signedInState(headers = new Headers()) {
  return {
    status: 'signed-in',
    isSignedIn: true,
    isAuthenticated: true,
    reason: null,
    message: null,
    headers,
    publishableKey: PUBLISHABLE_KEY,
    proxyUrl: '',
    domain: '',
    isSatellite: false,
    signInUrl: '/sign-in',
    signUpUrl: '/sign-up',
    afterSignInUrl: '',
    afterSignUpUrl: '',
    tokenType: 'session_token',
    toAuth: vi.fn((opts?: { treatPendingAsSignedOut?: boolean }) => ({
      tokenType: 'session_token',
      isAuthenticated: true,
      userId: 'user_123',
      sessionId: 'sess_123',
      sessionClaims: { sub: 'user_123' },
      treatPendingAsSignedOut: opts?.treatPendingAsSignedOut,
      getToken: async () => 'token',
      has: () => true,
      debug: () => ({})
    }))
  };
}

function signedOutState() {
  return {
    ...signedInState(),
    status: 'signed-out',
    isSignedIn: false,
    isAuthenticated: false,
    reason: 'session-token-and-uat-missing',
    toAuth: vi.fn(() => ({
      tokenType: 'session_token',
      isAuthenticated: false,
      userId: null,
      sessionId: null,
      sessionClaims: null,
      getToken: async () => null,
      has: () => false,
      debug: () => ({})
    }))
  };
}

describe('clerkMiddleware', () => {
  beforeEach(() => {
    vi.stubEnv('CLERK_SECRET_KEY', SECRET_KEY);
    vi.stubEnv('CLERK_PUBLISHABLE_KEY', PUBLISHABLE_KEY);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    authenticateRequest.mockReset();
  });

  it('stores the auth function and the initial state for a signed-in request', async () => {
    authenticateRequest.mockResolvedValue(
      signedInState(new Headers({ 'x-clerk-auth-status': 'signed-in' }))
    );
    const event = createEvent();
    const page = new Response('page');
    const next = vi.fn(async () => page);

    const response = await clerkMiddleware()(event, next);

    expect(next).toHaveBeenCalledOnce();
    expect(response).toBe(page);
    expect(authenticateRequest).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        acceptsToken: 'any',
        secretKey: SECRET_KEY,
        publishableKey: PUBLISHABLE_KEY
      })
    );

    expect(event.locals.auth?.()).toMatchObject({ userId: 'user_123' });
    expect(
      event.locals.auth?.({ treatPendingAsSignedOut: false })
    ).toMatchObject({ treatPendingAsSignedOut: false });

    const state = event.locals.clerkInitialState?.__internal_clerk_state;
    expect(state?.__publishableKey).toBe(PUBLISHABLE_KEY);
    expect(state?.__signInUrl).toBe('/sign-in');
    expect(state?.__clerk_ssr_state).toMatchObject({
      userId: 'user_123',
      sessionId: 'sess_123'
    });
    // Plain data only: it must survive Solid's hydration serializer.
    expect(
      (state?.__clerk_ssr_state as Record<string, unknown>).getToken
    ).toBeUndefined();

    // Clerk's headers go on the response head start mode folds onto the response.
    expect(event.response.headers.get('x-clerk-auth-status')).toBe('signed-in');
  });

  it('stores a signed-out auth object for a signed-out request', async () => {
    authenticateRequest.mockResolvedValue(signedOutState());
    const event = createEvent();

    await clerkMiddleware()(event, async () => new Response('page'));

    expect(event.locals.auth?.()).toMatchObject({
      isAuthenticated: false,
      userId: null
    });
    expect(
      event.locals.clerkInitialState?.__internal_clerk_state.__clerk_ssr_state
    ).toMatchObject({ userId: null });
  });

  it('returns the handshake redirect without calling next', async () => {
    const headers = new Headers({
      location: 'https://clerk.example.com/v1/client/handshake?redirect_url=x',
      'set-cookie': '__clerk_handshake=1; Path=/'
    });
    authenticateRequest.mockResolvedValue({
      ...signedOutState(),
      status: 'handshake',
      headers
    });
    const event = createEvent();
    const next = vi.fn(async () => new Response('page'));

    const response = await clerkMiddleware()(event, next);

    expect(next).not.toHaveBeenCalled();
    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toBe(headers.get('location'));
    expect(event.locals.auth).toBeUndefined();
  });

  it('throws on a handshake status without a redirect', async () => {
    authenticateRequest.mockResolvedValue({
      ...signedOutState(),
      status: 'handshake'
    });

    await expect(
      clerkMiddleware()(createEvent(), async () => new Response('page'))
    ).rejects.toThrow(/handshake/);
  });

  it('resolves options per request and lets them override the environment', async () => {
    authenticateRequest.mockResolvedValue(signedInState());
    const options = vi.fn(({ url }: { url: URL }) => ({
      secretKey: 'sk_test_override',
      signInUrl: `${url.origin}/login`
    }));

    await clerkMiddleware(options)(
      createEvent(),
      async () => new Response('page')
    );

    expect(options).toHaveBeenCalledWith({ url: expect.any(URL) });
    expect(authenticateRequest).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        secretKey: 'sk_test_override',
        signInUrl: 'http://localhost:3000/login'
      })
    );
  });

  it('appends Clerk headers to the response when the event has no response head', async () => {
    authenticateRequest.mockResolvedValue(
      signedInState(new Headers({ 'x-clerk-auth-status': 'signed-in' }))
    );
    const event = { ...createEvent(), response: undefined };

    const response = await clerkMiddleware()(
      event,
      async () => new Response('page')
    );

    expect(response.headers.get('x-clerk-auth-status')).toBe('signed-in');
  });

  it('requires a secret key', async () => {
    vi.stubEnv('CLERK_SECRET_KEY', '');

    await expect(
      clerkMiddleware()(createEvent(), async () => new Response('page'))
    ).rejects.toThrow(/Missing secretKey/);
    expect(authenticateRequest).not.toHaveBeenCalled();
  });
});
