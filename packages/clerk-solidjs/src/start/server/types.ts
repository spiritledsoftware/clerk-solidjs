import { VerifyTokenOptions } from '@clerk/backend';
import {
  MultiDomainAndOrProxy,
  SignInFallbackRedirectUrl,
  SignInForceRedirectUrl,
  SignUpFallbackRedirectUrl,
  SignUpForceRedirectUrl
} from '@clerk/shared/types';

type LegacyRedirectProps = {
  afterSignInUrl?: string;
  afterSignUpUrl?: string;
};

export type LoaderOptions = {
  publishableKey?: string;
  jwtKey?: string;
  secretKey?: string;
  authorizedParties?: [];
  signInUrl?: string;
  signUpUrl?: string;
} & Pick<VerifyTokenOptions, 'audience'> &
  MultiDomainAndOrProxy &
  SignInForceRedirectUrl &
  SignInFallbackRedirectUrl &
  SignUpForceRedirectUrl &
  SignUpFallbackRedirectUrl &
  LegacyRedirectProps;

export type AdditionalStateOptions = SignInFallbackRedirectUrl &
  SignUpFallbackRedirectUrl &
  SignInForceRedirectUrl &
  SignUpForceRedirectUrl;
