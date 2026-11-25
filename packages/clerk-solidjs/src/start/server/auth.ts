import type { SessionAuthObject } from '@clerk/backend';
import type { AuthOptions, GetAuthFnNoRequest } from '@clerk/backend/internal';
import { getAuthObjectForAcceptedToken } from '@clerk/backend/internal';
import { getRequestEvent } from '@solidjs/web';

import { errorThrower } from '../../errors/error-thrower';

/**
 * Returns the auth state of the current request. Requires `clerkMiddleware`.
 *
 * Call it on the server inside a request: a `"use server"` function, an API
 * route, a middleware after `clerkMiddleware`, or the page render.
 *
 * @example
 * ```ts
 * import { auth } from 'clerk-solidjs/start/server';
 *
 * export async function getSecret() {
 *   'use server';
 *   const { isAuthenticated, userId } = await auth();
 *   if (!isAuthenticated) throw new Error('Unauthorized');
 *   return `secret for ${userId}`;
 * }
 * ```
 */
export const auth: GetAuthFnNoRequest<SessionAuthObject, true> = (async (
  opts?: AuthOptions
) => {
  const event = getRequestEvent();
  if (!event) {
    return errorThrower.throw(
      'auth() must be called on the server inside a request, such as from a "use server" function or an API route.'
    );
  }

  const authFn = event.locals.auth;
  if (!authFn) {
    return errorThrower.throw(
      'auth() was called but clerkMiddleware() did not run for this request. Add clerkMiddleware() from "clerk-solidjs/start/server" to start.middleware.'
    );
  }

  const authObject = authFn({
    treatPendingAsSignedOut: opts?.treatPendingAsSignedOut
  });
  return getAuthObjectForAcceptedToken({
    authObject,
    acceptsToken: opts?.acceptsToken
  });
}) as GetAuthFnNoRequest<SessionAuthObject, true>;
