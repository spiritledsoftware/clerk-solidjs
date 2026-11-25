import type { VerifyTokenOptions } from '@clerk/backend';
import type { OrganizationSyncOptions } from '@clerk/backend/internal';
import type {
  MultiDomainAndOrProxyPrimitives,
  SignInFallbackRedirectUrl,
  SignInForceRedirectUrl,
  SignUpFallbackRedirectUrl,
  SignUpForceRedirectUrl
} from '@clerk/shared/types';

export type ClerkMiddlewareOptions = {
  publishableKey?: string;
  jwtKey?: string;
  secretKey?: string;
  machineSecretKey?: string;
  signInUrl?: string;
  signUpUrl?: string;
  /**
   * Activates an organization (or the personal account) from the request URL.
   */
  organizationSyncOptions?: OrganizationSyncOptions;
  /**
   * When `true`, a satellite app triggers a handshake with the primary domain
   * on first load even without session cookies, so users already signed in on
   * the primary domain are recognized. Defaults to `false`.
   */
  satelliteAutoSync?: boolean;
} & Pick<VerifyTokenOptions, 'audience' | 'authorizedParties'> &
  MultiDomainAndOrProxyPrimitives &
  SignInForceRedirectUrl &
  SignInFallbackRedirectUrl &
  SignUpForceRedirectUrl &
  SignUpFallbackRedirectUrl;

/**
 * Resolves middleware options per request.
 */
export type ClerkMiddlewareOptionsCallback = (args: {
  url: URL;
}) => ClerkMiddlewareOptions | Promise<ClerkMiddlewareOptions>;

export type AdditionalStateOptions = SignInFallbackRedirectUrl &
  SignUpFallbackRedirectUrl &
  SignInForceRedirectUrl &
  SignUpForceRedirectUrl;
