import { eventMethodCalled } from '@clerk/shared/telemetry';
import type {
  ClerkPaginatedResponse,
  CreateOrganizationParams,
  GetUserOrganizationInvitationsParams,
  GetUserOrganizationMembershipParams,
  GetUserOrganizationSuggestionsParams,
  OrganizationMembershipResource,
  OrganizationResource,
  OrganizationSuggestionResource,
  SetActive,
  UserOrganizationInvitationResource,
  UserResource
} from '@clerk/shared/types';
import { type Accessor, createMemo } from 'solid-js';
import { useClerkContext } from '../contexts/clerk-instance';
import type {
  PaginatedHookConfig,
  PaginatedResources,
  PaginatedResourcesWithDefault
} from '../types';
import { useUserBase } from './base';
import { useAssertWrappedByClerkProvider } from './use-assert-wrapped-by-clerk-provider';
import { useAttemptToEnableOrganizations } from './use-attempt-to-enable-organizations';
import {
  convertToSafeValues,
  undefinedPaginatedResource,
  usePagesOrInfinite
} from './use-pages-or-infinite';

/**
 * @interface
 */
export type UseOrganizationListParams = {
  /**
   * `true` for the defaults, or an object with the shared pagination options.
   */
  userMemberships?:
    | true
    | PaginatedHookConfig<GetUserOrganizationMembershipParams>;
  /**
   * `true` for the defaults, or an object with `status` and the shared pagination options.
   */
  userInvitations?:
    | true
    | PaginatedHookConfig<GetUserOrganizationInvitationsParams>;
  /**
   * `true` for the defaults, or an object with `status` and the shared pagination options.
   */
  userSuggestions?:
    | true
    | PaginatedHookConfig<GetUserOrganizationSuggestionsParams>;
};

type IsInfinite<P> = P extends { infinite: true } ? true : false;

type ListAccessor<T, P> = Accessor<
  PaginatedResources<T, IsInfinite<P>> | PaginatedResourcesWithDefault<T>
>;

/**
 * The value of `useOrganizationList()`. The list accessors return a placeholder (every
 * accessor `undefined`/`false`) until Clerk has loaded a signed-in user.
 */
export type UseOrganizationListReturn<T extends UseOrganizationListParams> = {
  /**
   * `true` once Clerk has loaded and a user is signed in.
   */
  isLoaded: Accessor<boolean>;
  /**
   * Create an Organization. Delegates to `clerk.createOrganization()`.
   */
  createOrganization: (
    params: CreateOrganizationParams
  ) => Promise<OrganizationResource>;
  /**
   * Set the active session and/or Organization. Delegates to `clerk.setActive()`.
   */
  setActive: SetActive;
  userMemberships: ListAccessor<
    OrganizationMembershipResource,
    T['userMemberships']
  >;
  userInvitations: ListAccessor<
    UserOrganizationInvitationResource,
    T['userInvitations']
  >;
  userSuggestions: ListAccessor<
    OrganizationSuggestionResource,
    T['userSuggestions']
  >;
};

/**
 * Access the current user's Organization memberships, invitations, and suggestions,
 * and create or switch Organizations.
 *
 * Lists are opt-in: pass `true` or an options object for the ones you need.
 *
 * @example
 * ```tsx
 * const { isLoaded, setActive, userMemberships } = useOrganizationList(() => ({
 *   userMemberships: { infinite: true }
 * }));
 *
 * return (
 *   <Show when={isLoaded()} fallback={<p>Loading</p>}>
 *     <For each={userMemberships().data()}>
 *       {(mem) => (
 *         <button onClick={() => setActive({ organization: mem.organization.id })}>
 *           {mem.organization.name}
 *         </button>
 *       )}
 *     </For>
 *   </Show>
 * );
 * ```
 */
export function useOrganizationList<
  T extends UseOrganizationListParams = UseOrganizationListParams
>(params?: Accessor<T | undefined>): UseOrganizationListReturn<T> {
  useAssertWrappedByClerkProvider('useOrganizationList');

  const p = createMemo(() => params?.() ?? ({} as T));

  // Without any list there is nothing Organization-specific to prompt for.
  useAttemptToEnableOrganizations('useOrganizationList', () => {
    const { userMemberships, userInvitations, userSuggestions } = p();
    return (
      userMemberships !== undefined ||
      userInvitations !== undefined ||
      userSuggestions !== undefined
    );
  });

  const ctx = useClerkContext('useOrganizationList');
  const { clerk } = ctx;
  const user = useUserBase();

  clerk.telemetry?.record(eventMethodCalled('useOrganizationList'));

  const userMembershipsSafeValues = createMemo(() =>
    convertToSafeValues(p().userMemberships, {
      initialPage: 1,
      pageSize: 10,
      keepPreviousData: false,
      infinite: false
    } as PaginatedHookConfig<GetUserOrganizationMembershipParams>)
  );
  const userInvitationsSafeValues = createMemo(() =>
    convertToSafeValues(p().userInvitations, {
      initialPage: 1,
      pageSize: 10,
      status: 'pending',
      keepPreviousData: false,
      infinite: false
    } as PaginatedHookConfig<GetUserOrganizationInvitationsParams>)
  );
  const userSuggestionsSafeValues = createMemo(() =>
    convertToSafeValues(p().userSuggestions, {
      initialPage: 1,
      pageSize: 10,
      status: 'pending',
      keepPreviousData: false,
      infinite: false
    } as PaginatedHookConfig<GetUserOrganizationSuggestionsParams>)
  );

  const list = <Params, R>(
    stableKey: string,
    opted: () => boolean,
    safe: Accessor<
      PaginatedHookConfig<Params & { initialPage?: number; pageSize?: number }>
    >,
    args: () => Params,
    fetcher: (
      user: UserResource
    ) => (p: Params) => Promise<ClerkPaginatedResponse<R>>
  ) =>
    usePagesOrInfinite<Params, ClerkPaginatedResponse<R>>(() => {
      const u = user();
      const values = safe();
      return {
        fetcher: u ? fetcher(u) : undefined,
        config: {
          keepPreviousData: values.keepPreviousData,
          infinite: values.infinite,
          // In useOrganizationList, you opt in by passing an object or `true`.
          enabled: opted(),
          isSignedIn: u !== null,
          initialPage: values.initialPage,
          pageSize: values.pageSize
        },
        keys: {
          stableKey,
          authenticated: true,
          tracked: { userId: u?.id },
          args: opted() ? args() : undefined
        }
      };
    });

  const memberships = list<
    GetUserOrganizationMembershipParams,
    OrganizationMembershipResource
  >(
    'userMemberships',
    () => p().userMemberships !== undefined,
    userMembershipsSafeValues,
    () => ({}),
    (u) => (params) => u.getOrganizationMemberships(params)
  );

  const invitations = list<
    GetUserOrganizationInvitationsParams,
    UserOrganizationInvitationResource
  >(
    'userInvitations',
    () => p().userInvitations !== undefined,
    userInvitationsSafeValues,
    () => ({ status: userInvitationsSafeValues().status }),
    (u) => (params) => u.getOrganizationInvitations(params)
  );

  const suggestions = list<
    GetUserOrganizationSuggestionsParams,
    OrganizationSuggestionResource
  >(
    'userSuggestions',
    () => p().userSuggestions !== undefined,
    userSuggestionsSafeValues,
    () => ({ status: userSuggestionsSafeValues().status }),
    (u) => (params) => u.getOrganizationSuggestions(params)
  );

  const isLoaded = createMemo(() => {
    ctx.status();
    return !!(clerk.loaded && user());
  });

  return {
    isLoaded,
    createOrganization: (params) =>
      clerk.createOrganization(params) as Promise<OrganizationResource>,
    setActive: (params) => clerk.setActive(params) as Promise<void>,
    userMemberships: (() =>
      isLoaded()
        ? memberships
        : undefinedPaginatedResource) as UseOrganizationListReturn<T>['userMemberships'],
    userInvitations: (() =>
      isLoaded()
        ? invitations
        : undefinedPaginatedResource) as UseOrganizationListReturn<T>['userInvitations'],
    userSuggestions: (() =>
      isLoaded()
        ? suggestions
        : undefinedPaginatedResource) as UseOrganizationListReturn<T>['userSuggestions']
  };
}
