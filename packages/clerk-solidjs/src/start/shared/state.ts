import type { AuthObject } from '@clerk/backend';
import type { InitialState, PendingSessionOptions } from '@clerk/shared/types';

/**
 * The Clerk state `clerkMiddleware` computes for a request and the start
 * `ClerkProvider` hands to the browser. Plain data only: it crosses the
 * server-to-client hydration channel.
 *
 * @internal
 */
export type ClerkInitialState = {
  __internal_clerk_state: {
    __clerk_ssr_state: InitialState;
    __publishableKey?: string;
    __proxyUrl?: string;
    __domain?: string;
    __isSatellite?: boolean;
    __signInUrl?: string;
    __signUpUrl?: string;
    __afterSignInUrl?: string;
    __afterSignUpUrl?: string;
    __clerk_debug?: unknown;
    __clerkJSUrl?: string;
    __clerkJSVersion?: string;
    __clerkUIUrl?: string;
    __clerkUIVersion?: string;
    __telemetryDisabled?: boolean;
    __telemetryDebug?: boolean;
    __signInForceRedirectUrl?: string;
    __signUpForceRedirectUrl?: string;
    __signInFallbackRedirectUrl?: string;
    __signUpFallbackRedirectUrl?: string;
  };
};

/**
 * Returns the request's auth object. `clerkMiddleware` stores it on
 * `getRequestEvent().locals.auth`.
 */
export type RequestAuthFn = (options?: PendingSessionOptions) => AuthObject;

/**
 * Key of the Clerk state in Solid's keyed hydration channel
 * (`getHydrationWriter().write` / `takeHydrationValue`).
 *
 * @internal
 */
export const CLERK_HYDRATION_KEY = 'clerk:initial-state';

declare module '@solidjs/web' {
  interface RequestEventLocals {
    /**
     * Set by `clerkMiddleware` from `clerk-solidjs/start/server`: returns the
     * auth object for this request. Prefer the `auth()` helper, which also
     * narrows by `acceptsToken`.
     */
    auth?: RequestAuthFn;
    /**
     * Set by `clerkMiddleware`; read by the start `ClerkProvider` during SSR.
     *
     * @internal
     */
    clerkInitialState?: ClerkInitialState;
  }
}
