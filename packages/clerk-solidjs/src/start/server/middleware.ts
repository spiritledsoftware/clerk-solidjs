import type { RequestState } from '@clerk/backend/internal';
import {
  AuthStatus,
  constants,
  createClerkRequest
} from '@clerk/backend/internal';
import { handleNetlifyCacheInDevInstance } from '@clerk/shared/netlifyCacheHandler';
import { patchRequest } from '@clerk/shared/patchRequest';
import type { PendingSessionOptions } from '@clerk/shared/types';
import {
  getRequestEvent,
  type RequestEvent,
  type ResponseStub
} from '@solidjs/web';

import { errorThrower } from '../../errors/error-thrower';
import { clerkClient } from './clerk-client';
import { loadOptions } from './load-options';
import type {
  ClerkMiddlewareOptions,
  ClerkMiddlewareOptionsCallback
} from './types';
import { getResponseClerkState } from './utils';

/**
 * The request event a start-mode middleware receives (`StartRequestEvent` in
 * `@solidjs/vite-plugin`): the base event plus the mutable response head.
 */
export type ClerkMiddlewareEvent = Omit<RequestEvent, 'response'> & {
  response?: ResponseStub;
};

/**
 * A `@solidjs/vite-plugin` start-mode middleware.
 */
export type ClerkMiddleware = (
  // The shipped plugin passes the event; Solid's middleware docs show a bare
  // `Request`. Both are accepted.
  event: ClerkMiddlewareEvent | Request,
  next: () => Promise<Response>
) => Promise<Response>;

/**
 * Returns a start-mode middleware that authenticates every request with Clerk.
 *
 * It stores an `auth(options?)` function and the client's initial Clerk state
 * on `getRequestEvent().locals`, answers Clerk handshakes with a redirect, and
 * adds the headers Clerk asks for to the response. Read the auth state with
 * `auth()` in server functions, API routes, and the page render.
 *
 * @example
 * ```ts
 * // src/middleware.ts (vite.config.ts: solid({ start: { middleware: './src/middleware.ts' } }))
 * import { clerkMiddleware } from 'clerk-solidjs/start/server';
 *
 * export default [clerkMiddleware()];
 * ```
 */
export const clerkMiddleware = (
  options?: ClerkMiddlewareOptions | ClerkMiddlewareOptionsCallback
): ClerkMiddleware => {
  return async (eventArg, next) => {
    // Start mode passes the request event; accept a bare Request too (the
    // `(request, next)` shape some docs show) and take the event from scope.
    const event =
      eventArg instanceof Request
        ? (getRequestEvent() as ClerkMiddlewareEvent | undefined)
        : eventArg;
    if (!event) {
      return errorThrower.throw(
        'clerkMiddleware() must run inside a request (as a start-mode middleware).'
      );
    }
    const request = eventArg instanceof Request ? eventArg : event.request;

    const clerkRequest = createClerkRequest(patchRequest(request));
    const resolvedOptions =
      typeof options === 'function'
        ? await options({ url: clerkRequest.clerkUrl })
        : options;
    const loadedOptions = loadOptions(clerkRequest, resolvedOptions);

    const requestState = await clerkClient().authenticateRequest(clerkRequest, {
      ...loadedOptions,
      acceptsToken: 'any'
    });

    const locationHeader = requestState.headers.get(constants.Headers.Location);
    if (locationHeader) {
      handleNetlifyCacheInDevInstance({
        locationHeader,
        requestStateHeaders: requestState.headers,
        publishableKey: requestState.publishableKey
      });
      // Handshake redirect.
      return new Response(null, { status: 307, headers: requestState.headers });
    }

    if (requestState.status === AuthStatus.Handshake) {
      return errorThrower.throw('handshake status without redirect');
    }

    event.locals.auth = (opts?: PendingSessionOptions) =>
      requestState.toAuth(opts);
    event.locals.clerkInitialState = getResponseClerkState(
      requestState as RequestState,
      loadedOptions
    );

    // Start mode folds the event's response head onto whatever response
    // leaves (page, server function, API route), so write Clerk's headers there.
    if (event.response) {
      appendHeaders(event.response.headers, requestState.headers);
      return next();
    }

    const response = await next();
    try {
      appendHeaders(response.headers, requestState.headers);
      return response;
    } catch {
      // Immutable headers (e.g. `Response.redirect`): copy the response.
      const copy = new Response(response.body, response);
      appendHeaders(copy.headers, requestState.headers);
      return copy;
    }
  };
};

function appendHeaders(target: Headers, source: Headers) {
  source.forEach((value, key) => {
    target.append(key, value);
  });
}
