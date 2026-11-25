import { apiUrlFromPublishableKey } from '@clerk/shared/apiUrlFromPublishableKey';
import { getEnvVariable } from '@clerk/shared/getEnvVariable';

import { getPublicEnvVariables } from '../shared/env';

/**
 * Clerk settings from the environment. Read per call, not at module load, so
 * values a host injects after import (or a test sets) are seen.
 *
 * @internal
 */
export const commonEnvs = () => {
  const publicEnvs = getPublicEnvVariables();

  return {
    PUBLISHABLE_KEY: publicEnvs.publishableKey,
    DOMAIN: publicEnvs.domain,
    PROXY_URL: publicEnvs.proxyUrl,
    IS_SATELLITE: publicEnvs.isSatellite,
    SIGN_IN_URL: publicEnvs.signInUrl,
    SIGN_UP_URL: publicEnvs.signUpUrl,
    TELEMETRY_DISABLED: publicEnvs.telemetryDisabled,
    TELEMETRY_DEBUG: publicEnvs.telemetryDebug,

    API_VERSION: getEnvVariable('CLERK_API_VERSION') || 'v1',
    SECRET_KEY: getEnvVariable('CLERK_SECRET_KEY'),
    MACHINE_SECRET_KEY: getEnvVariable('CLERK_MACHINE_SECRET_KEY'),
    CLERK_JWT_KEY: getEnvVariable('CLERK_JWT_KEY'),
    API_URL:
      getEnvVariable('CLERK_API_URL') ||
      apiUrlFromPublishableKey(publicEnvs.publishableKey),

    SDK_METADATA: {
      name: PACKAGE_NAME,
      version: PACKAGE_VERSION,
      environment: getEnvVariable('NODE_ENV')
    }
  } as const;
};
