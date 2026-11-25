import type { RequestEvent } from '@solidjs/web';
import { afterEach, describe, expect, it, vi } from 'vitest';

const requestEvent = vi.hoisted(() => ({
  current: undefined as RequestEvent | undefined
}));

vi.mock('@solidjs/web', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@solidjs/web')>()),
  getRequestEvent: () => requestEvent.current
}));

import { auth } from '../auth';

function sessionAuth(userId: string | null) {
  return {
    tokenType: 'session_token' as const,
    isAuthenticated: !!userId,
    userId,
    debug: () => ({})
  };
}

function withRequestEvent(locals: RequestEvent['locals']) {
  requestEvent.current = {
    request: new Request('http://localhost:3000/_server'),
    locals,
    response: { headers: new Headers() }
  };
}

describe('auth()', () => {
  afterEach(() => {
    requestEvent.current = undefined;
  });

  it('throws outside a request event', async () => {
    await expect(auth()).rejects.toThrow(/inside a request/);
  });

  it('throws when clerkMiddleware did not run for the request', async () => {
    withRequestEvent({});

    await expect(auth()).rejects.toThrow(/clerkMiddleware\(\)/);
  });

  it('returns the auth object clerkMiddleware stored on locals', async () => {
    const authFn = vi.fn(() => sessionAuth('user_123') as any);
    withRequestEvent({ auth: authFn });

    const result = await auth();

    expect(result).toMatchObject({ isAuthenticated: true, userId: 'user_123' });
    expect(authFn).toHaveBeenCalledWith({ treatPendingAsSignedOut: undefined });
  });

  it('forwards treatPendingAsSignedOut', async () => {
    const authFn = vi.fn(() => sessionAuth('user_123') as any);
    withRequestEvent({ auth: authFn });

    await auth({ treatPendingAsSignedOut: false });

    expect(authFn).toHaveBeenCalledWith({ treatPendingAsSignedOut: false });
  });

  it('returns a signed-out object when the token type is not accepted', async () => {
    withRequestEvent({
      auth: () =>
        ({
          tokenType: 'api_key',
          isAuthenticated: true,
          id: 'ak_123',
          debug: () => ({})
        }) as any
    });

    const result = await auth();

    expect(result).toMatchObject({
      tokenType: 'session_token',
      isAuthenticated: false,
      userId: null
    });
    expect(await auth({ acceptsToken: 'api_key' })).toMatchObject({
      tokenType: 'api_key',
      id: 'ak_123'
    });
  });
});
