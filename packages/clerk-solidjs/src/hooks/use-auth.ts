import {
  createCheckAuthorization,
  resolveAuthState
} from '@clerk/shared/authorization';
import { eventMethodCalled } from '@clerk/shared/telemetry';
import type {
  ActClaim,
  CheckAuthorizationWithCustomPermissions,
  UseAuthReturn as ClerkUseAuthReturn,
  GetToken,
  JwtPayload,
  OrganizationCustomPermissionKey,
  OrganizationCustomRoleKey,
  PendingSessionOptions,
  SessionStatusClaim,
  SignOut
} from '@clerk/shared/types';
import { type Accessor, createMemo, untrack } from 'solid-js';
import { useClerkContext } from '../contexts/clerk-instance';
import { errorThrower } from '../errors/error-thrower';
import { invalidStateError } from '../errors/messages';
import { useAuthBase } from './base';
import { useAssertWrappedByClerkProvider } from './use-assert-wrapped-by-clerk-provider';
import { createGetToken, createSignOut } from './utils';

/**
 * @inline
 */
export type UseAuthOptions = PendingSessionOptions | undefined | null;

/**
 * The value of `useAuth()`. Every piece of state is an accessor; `has`, `signOut`, and
 * `getToken` are plain functions (reading `has(...)` in JSX or a memo tracks auth state).
 */
export type UseAuthReturn = {
  isLoaded: Accessor<boolean>;
  isSignedIn: Accessor<boolean | undefined>;
  userId: Accessor<string | null | undefined>;
  sessionId: Accessor<string | null | undefined>;
  sessionStatus: Accessor<SessionStatusClaim | null | undefined>;
  sessionClaims: Accessor<JwtPayload | null | undefined>;
  actor: Accessor<ActClaim | null | undefined>;
  orgId: Accessor<string | null | undefined>;
  orgRole: Accessor<OrganizationCustomRoleKey | null | undefined>;
  orgSlug: Accessor<string | null | undefined>;
  orgPermissions: Accessor<
    OrganizationCustomPermissionKey[] | null | undefined
  >;
  has: CheckAuthorizationWithCustomPermissions;
  signOut: SignOut;
  getToken: GetToken;
};

/**
 * Access the current user's authentication state and methods to manage the active session.
 *
 * @param options - `treatPendingAsSignedOut` treats pending sessions as signed out. Defaults to `true`.
 *
 * @example
 * ```tsx
 * const { isLoaded, isSignedIn, userId, getToken } = useAuth();
 *
 * return (
 *   <Show when={isLoaded()} fallback={<p>Loading...</p>}>
 *     <Show when={isSignedIn()} fallback={<p>Sign in to view this page</p>}>
 *       <p>Hello, {userId()}!</p>
 *     </Show>
 *   </Show>
 * );
 * ```
 */
export const useAuth = (options: UseAuthOptions = {}): UseAuthReturn => {
  useAssertWrappedByClerkProvider('useAuth');

  const { treatPendingAsSignedOut } = options ?? {};
  const { clerk } = useClerkContext('useAuth');
  const authState = useAuthBase();

  const getToken: GetToken = createGetToken(clerk);
  const signOut: SignOut = createSignOut(clerk);

  clerk.telemetry?.record(
    eventMethodCalled('useAuth', { treatPendingAsSignedOut })
  );

  return useDerivedAuth(() => ({ ...authState(), getToken, signOut }), {
    treatPendingAsSignedOut
  });
};

/**
 * Derives `useAuth()`'s value from an auth object, such as the auth state a
 * framework SDK reads on the server. Uses the object's `has` when it has one,
 * and otherwise builds one from its claims.
 *
 * @param authObject - An accessor for the auth object; it may include `getToken` and `signOut`.
 * @param options - `treatPendingAsSignedOut` treats pending sessions as signed out. Defaults to `true`.
 *
 * @internal
 */
export function useDerivedAuth(
  authObject: Accessor<any>,
  { treatPendingAsSignedOut = true }: PendingSessionOptions = {}
): UseAuthReturn {
  const resolved = createMemo((): ClerkUseAuthReturn => {
    const state = authObject() ?? {};
    const sessionClaims = state.sessionClaims as JwtPayload | undefined;
    const has: CheckAuthorizationWithCustomPermissions =
      state.has ??
      createCheckAuthorization({
        userId: state.userId,
        orgId: state.orgId,
        orgRole: state.orgRole,
        orgPermissions: state.orgPermissions,
        factorVerificationAge: state.factorVerificationAge,
        features: (sessionClaims?.fea ?? '') as string,
        plans: (sessionClaims?.pla ?? '') as string
      });

    const payload = resolveAuthState({
      authObject: { ...state, has },
      options: { treatPendingAsSignedOut }
    });

    if (!payload) {
      return errorThrower.throw(invalidStateError);
    }
    return payload;
  });

  // Each field is its own memo: Clerk emits on every token refresh and client update,
  // and a field should notify only when its value actually changes.
  return {
    isLoaded: createMemo(() => resolved().isLoaded),
    isSignedIn: createMemo(() => resolved().isSignedIn),
    userId: createMemo(() => resolved().userId),
    sessionId: createMemo(() => resolved().sessionId),
    sessionStatus: createMemo(() => authObject()?.sessionStatus),
    sessionClaims: createMemo(() => resolved().sessionClaims),
    actor: createMemo(() => resolved().actor),
    orgId: createMemo(() => resolved().orgId),
    orgRole: createMemo(() => resolved().orgRole),
    orgSlug: createMemo(() => resolved().orgSlug),
    orgPermissions: createMemo(() =>
      resolved().isSignedIn ? authObject()?.orgPermissions : undefined
    ),
    has: (params) => resolved().has(params),
    signOut: ((...args: Parameters<SignOut>) =>
      untrack(authObject)?.signOut?.(...args)) as SignOut,
    getToken: ((...args: Parameters<GetToken>) =>
      untrack(authObject)?.getToken?.(...args)) as GetToken
  };
}
