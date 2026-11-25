import type { ClerkRequest } from '@clerk/backend/internal';
import { apiUrlFromPublishableKey } from '@clerk/shared/apiUrlFromPublishableKey';
import { getEnvVariable } from '@clerk/shared/getEnvVariable';
import { isDevelopmentFromSecretKey } from '@clerk/shared/keys';
import { isHttpOrHttps, isProxyUrlRelative } from '@clerk/shared/proxy';

import { errorThrower } from '../../errors/error-thrower';
import { commonEnvs } from './constants';
import type { ClerkMiddlewareOptions } from './types';

/**
 * Merges middleware options over the environment and validates the result.
 *
 * @internal
 */
export const loadOptions = (
  request: ClerkRequest,
  overrides: ClerkMiddlewareOptions = {}
) => {
  const env = commonEnvs();
  const secretKey = overrides.secretKey || env.SECRET_KEY;
  const machineSecretKey = overrides.machineSecretKey || env.MACHINE_SECRET_KEY;
  const publishableKey = overrides.publishableKey || env.PUBLISHABLE_KEY;
  const jwtKey = overrides.jwtKey || env.CLERK_JWT_KEY;
  const apiUrl =
    getEnvVariable('CLERK_API_URL') || apiUrlFromPublishableKey(publishableKey);
  const domain = overrides.domain || env.DOMAIN;
  const isSatellite = overrides.isSatellite || env.IS_SATELLITE;
  const relativeOrAbsoluteProxyUrl = overrides.proxyUrl || env.PROXY_URL;
  const signInUrl = overrides.signInUrl || env.SIGN_IN_URL;
  const signUpUrl = overrides.signUpUrl || env.SIGN_UP_URL;

  let proxyUrl: string | undefined;
  if (
    !!relativeOrAbsoluteProxyUrl &&
    isProxyUrlRelative(relativeOrAbsoluteProxyUrl)
  ) {
    proxyUrl = new URL(relativeOrAbsoluteProxyUrl, request.clerkUrl).toString();
  } else {
    proxyUrl = relativeOrAbsoluteProxyUrl;
  }

  if (!secretKey) {
    errorThrower.throwMissingSecretKeyError();
  }

  if (isSatellite && !proxyUrl && !domain) {
    errorThrower.throw('satellite mode requires a proxy URL or domain');
  }

  if (
    isSatellite &&
    !isHttpOrHttps(signInUrl) &&
    isDevelopmentFromSecretKey(secretKey)
  ) {
    errorThrower.throw(
      'satellite mode requires an absolute sign-in URL in development'
    );
  }

  return {
    // keeps options that are not initialized from env (audience, organizationSyncOptions, ...)
    ...overrides,
    secretKey,
    machineSecretKey,
    publishableKey,
    jwtKey,
    apiUrl,
    domain,
    isSatellite,
    proxyUrl,
    signInUrl,
    signUpUrl
  };
};

export type LoadedOptions = ReturnType<typeof loadOptions>;
