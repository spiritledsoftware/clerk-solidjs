import { getEnvVariable } from '@clerk/shared/getEnvVariable';
import { isTruthy } from '@clerk/shared/underscore';

/**
 * Reads `VITE_<name>` first (Vite exposes those to the browser), then `<name>`.
 *
 * @internal
 */
export const getValue = (name: string): string =>
  getEnvVariable(`VITE_${name}`) || getEnvVariable(name);

/**
 * Public Clerk settings from the environment (`VITE_CLERK_*` or `CLERK_*`).
 *
 * @internal
 */
export const getPublicEnvVariables = () => {
  return {
    publishableKey: getValue('CLERK_PUBLISHABLE_KEY'),
    domain: getValue('CLERK_DOMAIN'),
    isSatellite: isTruthy(getValue('CLERK_IS_SATELLITE')),
    proxyUrl: getValue('CLERK_PROXY_URL'),
    signInUrl: getValue('CLERK_SIGN_IN_URL'),
    signUpUrl: getValue('CLERK_SIGN_UP_URL'),
    clerkJsUrl: getValue('CLERK_JS_URL') || getValue('CLERK_JS'),
    clerkJsVersion: getValue('CLERK_JS_VERSION'),
    clerkUIUrl: getValue('CLERK_UI_URL'),
    clerkUIVersion: getValue('CLERK_UI_VERSION'),
    telemetryDisabled: isTruthy(getValue('CLERK_TELEMETRY_DISABLED')),
    telemetryDebug: isTruthy(getValue('CLERK_TELEMETRY_DEBUG')),
    afterSignInUrl: getValue('CLERK_AFTER_SIGN_IN_URL'),
    afterSignUpUrl: getValue('CLERK_AFTER_SIGN_UP_URL')
  } as const;
};
