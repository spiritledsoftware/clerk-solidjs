import type { RequestState } from '@clerk/backend/internal';
import { debugRequestState } from '@clerk/backend/internal';
import { isTruthy } from '@clerk/shared/underscore';

import { getValue } from '../../shared/env';
import type { ClerkInitialState } from '../../shared/state';
import type { AdditionalStateOptions } from '../types';

/**
 * Builds the state the start `ClerkProvider` hydrates from.
 *
 * The result goes through Solid's hydration serializer, which rejects
 * functions, so the auth object is reduced to its JSON form (dropping
 * `getToken`, `has`, ...), as the other Clerk SDKs do when they embed it in HTML.
 *
 * @internal
 */
export function getResponseClerkState(
  requestState: RequestState,
  additionalStateOptions: AdditionalStateOptions = {}
): ClerkInitialState {
  const state: ClerkInitialState['__internal_clerk_state'] = {
    __clerk_ssr_state: requestState.toAuth() as any,
    __publishableKey: requestState.publishableKey,
    __proxyUrl: requestState.proxyUrl,
    __domain: requestState.domain,
    __isSatellite: requestState.isSatellite,
    __signInUrl: requestState.signInUrl,
    __signUpUrl: requestState.signUpUrl,
    __afterSignInUrl: requestState.afterSignInUrl,
    __afterSignUpUrl: requestState.afterSignUpUrl,
    __clerk_debug: debugRequestState(requestState),
    __clerkJSUrl: getValue('CLERK_JS_URL') || getValue('CLERK_JS'),
    __clerkJSVersion: getValue('CLERK_JS_VERSION'),
    __clerkUIUrl: getValue('CLERK_UI_URL'),
    __clerkUIVersion: getValue('CLERK_UI_VERSION'),
    __telemetryDisabled: isTruthy(getValue('CLERK_TELEMETRY_DISABLED')),
    __telemetryDebug: isTruthy(getValue('CLERK_TELEMETRY_DEBUG')),
    __signInForceRedirectUrl:
      additionalStateOptions.signInForceRedirectUrl ||
      getValue('CLERK_SIGN_IN_FORCE_REDIRECT_URL') ||
      '',
    __signUpForceRedirectUrl:
      additionalStateOptions.signUpForceRedirectUrl ||
      getValue('CLERK_SIGN_UP_FORCE_REDIRECT_URL') ||
      '',
    __signInFallbackRedirectUrl:
      additionalStateOptions.signInFallbackRedirectUrl ||
      getValue('CLERK_SIGN_IN_FALLBACK_REDIRECT_URL') ||
      '',
    __signUpFallbackRedirectUrl:
      additionalStateOptions.signUpFallbackRedirectUrl ||
      getValue('CLERK_SIGN_UP_FALLBACK_REDIRECT_URL') ||
      ''
  };

  return { __internal_clerk_state: JSON.parse(JSON.stringify(state)) };
}
