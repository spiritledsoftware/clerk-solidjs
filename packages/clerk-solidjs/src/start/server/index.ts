import { setErrorThrowerOptions } from '../../errors/error-thrower';

export { auth } from './auth';
export { clerkClient } from './clerk-client';
export { clerkMiddleware } from './middleware';
export type { ClerkMiddleware, ClerkMiddlewareEvent } from './middleware';
export type {
  ClerkMiddlewareOptions,
  ClerkMiddlewareOptionsCallback
} from './types';
// Also brings the `locals.auth` / `locals.clerkInitialState` augmentation of
// `RequestEventLocals` from `@solidjs/web` into the importer's program.
export type { ClerkInitialState, RequestAuthFn } from '../shared/state';

/**
 * Re-export resource types from @clerk/backend
 */
export type {
  AllowlistIdentifier,
  AuthObject,
  Client,
  EmailAddress,
  ExternalAccount,
  Invitation,
  OauthAccessToken,
  Organization,
  OrganizationInvitation,
  OrganizationMembership,
  OrganizationMembershipPublicUserData,
  OrganizationMembershipRole,
  PhoneNumber,
  Session,
  SessionAuthObject,
  SignInToken,
  SMSMessage,
  Token,
  User,
  // Webhook event types
  WebhookEvent,
  WebhookEventType
} from '@clerk/backend';

setErrorThrowerOptions({ packageName: PACKAGE_NAME });
