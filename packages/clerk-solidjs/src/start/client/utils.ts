import type { InitialState } from '@clerk/shared/types';

import { getPublicEnvVariables } from '../shared/env';
import type { ClerkInitialState } from '../shared/state';

/**
 * Provider options carried by the middleware state, plus the SSR auth state.
 *
 * @internal
 */
export const pickFromClerkInitState = (
  clerkInitState: ClerkInitialState['__internal_clerk_state'] | undefined
) => {
  const {
    __clerk_ssr_state,
    __publishableKey,
    __proxyUrl,
    __domain,
    __isSatellite,
    __signInUrl,
    __signUpUrl,
    __clerkJSUrl,
    __clerkJSVersion,
    __clerkUIUrl,
    __clerkUIVersion,
    __telemetryDisabled,
    __telemetryDebug,
    __signInForceRedirectUrl,
    __signUpForceRedirectUrl,
    __signInFallbackRedirectUrl,
    __signUpFallbackRedirectUrl
  } =
    clerkInitState ||
    ({} as Partial<ClerkInitialState['__internal_clerk_state']>);

  return {
    clerkSsrState: __clerk_ssr_state as InitialState | undefined,
    options: {
      publishableKey: __publishableKey,
      proxyUrl: __proxyUrl,
      domain: __domain,
      isSatellite: !!__isSatellite,
      signInUrl: __signInUrl,
      signUpUrl: __signUpUrl,
      __internal_clerkJSUrl: __clerkJSUrl,
      __internal_clerkJSVersion: __clerkJSVersion,
      __internal_clerkUIUrl: __clerkUIUrl,
      __internal_clerkUIVersion: __clerkUIVersion,
      telemetry: {
        disabled: __telemetryDisabled,
        debug: __telemetryDebug
      },
      signInForceRedirectUrl: __signInForceRedirectUrl || undefined,
      signUpForceRedirectUrl: __signUpForceRedirectUrl || undefined,
      signInFallbackRedirectUrl: __signInFallbackRedirectUrl || undefined,
      signUpFallbackRedirectUrl: __signUpFallbackRedirectUrl || undefined
    }
  };
};

type PickedOptions = ReturnType<typeof pickFromClerkInitState>['options'];

/**
 * Fills options the middleware state left empty from `VITE_CLERK_*` / `CLERK_*`.
 *
 * @internal
 */
export const mergeWithPublicEnvs = (options: PickedOptions) => {
  const env = getPublicEnvVariables();
  return {
    ...options,
    publishableKey: options.publishableKey || env.publishableKey || undefined,
    domain: options.domain || env.domain || undefined,
    proxyUrl: options.proxyUrl || env.proxyUrl || undefined,
    isSatellite: options.isSatellite || env.isSatellite,
    signInUrl: options.signInUrl || env.signInUrl || undefined,
    signUpUrl: options.signUpUrl || env.signUpUrl || undefined,
    __internal_clerkJSUrl:
      options.__internal_clerkJSUrl || env.clerkJsUrl || undefined,
    __internal_clerkJSVersion:
      options.__internal_clerkJSVersion || env.clerkJsVersion || undefined,
    __internal_clerkUIUrl:
      options.__internal_clerkUIUrl || env.clerkUIUrl || undefined,
    __internal_clerkUIVersion:
      options.__internal_clerkUIVersion || env.clerkUIVersion || undefined,
    telemetry: {
      disabled: options.telemetry.disabled || env.telemetryDisabled,
      debug: options.telemetry.debug || env.telemetryDebug
    }
  };
};
