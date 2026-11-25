import { deriveState } from '@clerk/shared/deriveState';
import type {
  ClientResource,
  OrganizationResource,
  Resources,
  SignedInSessionResource,
  UserResource
} from '@clerk/shared/types';
import { type Accessor, createMemo } from 'solid-js';
import { useClerkContext } from '../contexts/clerk-instance';

/**
 * Reactive views of Clerk's resources. Before Clerk is operational they fall back to
 * the server-rendered initial state, matching `@clerk/react`.
 *
 * @internal
 */

export function useClientBase(): Accessor<ClientResource | null | undefined> {
  const ctx = useClerkContext();
  // clerk-js updates one Client instance in place, so every emission must notify;
  // derive equality-gated values (sessions, signIn, signUp) from this.
  return createMemo(() => ctx.resources()?.client, { equals: false });
}

export function useUserBase(): Accessor<UserResource | null | undefined> {
  const ctx = useClerkContext();
  return createMemo(() => {
    const resources = ctx.resources();
    return resources
      ? resources.user
      : (ctx.initialState()?.user as UserResource | null | undefined);
  });
}

export function useSessionBase(): Accessor<
  SignedInSessionResource | null | undefined
> {
  const ctx = useClerkContext();
  return createMemo(() => {
    const resources = ctx.resources();
    return resources
      ? resources.session
      : (ctx.initialState()?.session as
          | SignedInSessionResource
          | null
          | undefined);
  });
}

export function useOrganizationBase(): Accessor<
  OrganizationResource | null | undefined
> {
  const ctx = useClerkContext();
  return createMemo(() => {
    const resources = ctx.resources();
    return resources
      ? resources.organization
      : (ctx.initialState()?.organization as
          | OrganizationResource
          | null
          | undefined);
  });
}

export const defaultDerivedInitialState = {
  actor: undefined,
  factorVerificationAge: null,
  orgId: undefined,
  orgPermissions: undefined,
  orgRole: undefined,
  orgSlug: undefined,
  sessionClaims: undefined,
  sessionId: undefined,
  sessionStatus: undefined,
  userId: undefined
};

export function useAuthBase() {
  const ctx = useClerkContext();
  return createMemo(() => {
    const resources = ctx.resources();
    if (resources) {
      return deriveState(true, resources, undefined);
    }
    const initialState = ctx.initialState();
    if (!initialState) {
      return defaultDerivedInitialState as ReturnType<typeof deriveState>;
    }
    return deriveState(false, {} as Resources, initialState);
  });
}
