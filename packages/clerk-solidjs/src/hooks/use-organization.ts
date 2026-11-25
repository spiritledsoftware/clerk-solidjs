import { getCurrentOrganizationMembership } from '@clerk/shared/organization';
import { eventMethodCalled } from '@clerk/shared/telemetry';
import type {
  ClerkPaginatedResponse,
  GetDomainsParams,
  GetInvitationsParams,
  GetMembershipRequestParams,
  GetMembersParams,
  OrganizationDomainResource,
  OrganizationInvitationResource,
  OrganizationMembershipRequestResource,
  OrganizationMembershipResource,
  OrganizationResource
} from '@clerk/shared/types';
import { type Accessor, createMemo } from 'solid-js';
import { useClerkContext } from '../contexts/clerk-instance';
import type {
  PaginatedHookConfig,
  PaginatedResources,
  PaginatedResourcesWithDefault
} from '../types';
import { useOrganizationBase, useSessionBase } from './base';
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
export type UseOrganizationParams = {
  /**
   * `true` for the defaults, or an object with `enrollmentMode` and the shared pagination options.
   */
  domains?: true | PaginatedHookConfig<GetDomainsParams>;
  /**
   * `true` for the defaults, or an object with `status` and the shared pagination options.
   */
  membershipRequests?: true | PaginatedHookConfig<GetMembershipRequestParams>;
  /**
   * `true` for the defaults, or an object with `role`, `query`, and the shared pagination options.
   */
  memberships?: true | PaginatedHookConfig<GetMembersParams>;
  /**
   * `true` for the defaults, or an object with `status` and the shared pagination options.
   */
  invitations?: true | PaginatedHookConfig<GetInvitationsParams>;
  /**
   * Skip the development prompt that offers to enable Organizations.
   *
   * @internal
   */
  __internal_skipAttemptToEnableOrganizations?: boolean;
};

type IsInfinite<P> = P extends { infinite: true } ? true : false;

type ListAccessor<T, P> = Accessor<
  PaginatedResources<T, IsInfinite<P>> | PaginatedResourcesWithDefault<T> | null
>;

/**
 * The value of `useOrganization()`.
 *
 * Each list accessor returns a placeholder (every accessor `undefined`/`false`) until
 * Clerk loads, `null` when there is no Active Organization, and the paginated list
 * otherwise.
 */
export type UseOrganizationReturn<T extends UseOrganizationParams> = {
  /**
   * `true` once Clerk has loaded the current authentication state.
   */
  isLoaded: Accessor<boolean>;
  /**
   * The Active Organization: `undefined` while loading, `null` when there is none.
   */
  organization: Accessor<OrganizationResource | null | undefined>;
  /**
   * The current user's membership in the Active Organization.
   */
  membership: Accessor<OrganizationMembershipResource | null | undefined>;
  domains: ListAccessor<OrganizationDomainResource, T['domains']>;
  membershipRequests: ListAccessor<
    OrganizationMembershipRequestResource,
    T['membershipRequests']
  >;
  memberships: ListAccessor<OrganizationMembershipResource, T['memberships']>;
  invitations: ListAccessor<OrganizationInvitationResource, T['invitations']>;
};

/**
 * Access the Active Organization and, on request, paginated lists of its domains,
 * membership requests, memberships, and invitations.
 *
 * Lists are opt-in: pass `true` or an options object for the ones you need. Options
 * are read through an accessor, so they can change over time; `initialPage` and
 * `pageSize` are read once.
 *
 * @example
 * ```tsx
 * const { memberships } = useOrganization(() => ({
 *   memberships: { infinite: true, keepPreviousData: true }
 * }));
 *
 * return (
 *   <>
 *     <For each={memberships()?.data()}>
 *       {(m) => <li>{m.publicUserData?.identifier}</li>}
 *     </For>
 *     <button
 *       disabled={!memberships()?.hasNextPage()}
 *       onClick={() => memberships()?.fetchNext?.()}
 *     >
 *       Load more
 *     </button>
 *   </>
 * );
 * ```
 */
export function useOrganization<
  T extends UseOrganizationParams = UseOrganizationParams
>(params?: Accessor<T | undefined>): UseOrganizationReturn<T> {
  useAssertWrappedByClerkProvider('useOrganization');

  const p = createMemo(() => params?.() ?? ({} as T));

  useAttemptToEnableOrganizations(
    'useOrganization',
    () => !p().__internal_skipAttemptToEnableOrganizations
  );

  const ctx = useClerkContext('useOrganization');
  const organization = useOrganizationBase();
  const session = useSessionBase();
  const loaded = createMemo(() => {
    ctx.status();
    return ctx.clerk.loaded;
  });

  ctx.clerk.telemetry?.record(eventMethodCalled('useOrganization'));

  const domainSafeValues = createMemo(() =>
    convertToSafeValues(p().domains, {
      initialPage: 1,
      pageSize: 10,
      keepPreviousData: false,
      infinite: false,
      enrollmentMode: undefined
    } as PaginatedHookConfig<GetDomainsParams>)
  );
  const membershipRequestSafeValues = createMemo(() =>
    convertToSafeValues(p().membershipRequests, {
      initialPage: 1,
      pageSize: 10,
      status: 'pending',
      keepPreviousData: false,
      infinite: false
    } as PaginatedHookConfig<GetMembershipRequestParams>)
  );
  const membersSafeValues = createMemo(() =>
    convertToSafeValues(p().memberships, {
      initialPage: 1,
      pageSize: 10,
      role: undefined,
      keepPreviousData: false,
      infinite: false,
      query: undefined
    } as PaginatedHookConfig<GetMembersParams>)
  );
  const invitationsSafeValues = createMemo(() =>
    convertToSafeValues(p().invitations, {
      initialPage: 1,
      pageSize: 10,
      status: ['pending'],
      keepPreviousData: false,
      infinite: false
    } as PaginatedHookConfig<GetInvitationsParams>)
  );

  const list = <Params, R extends { id: string }>(
    stableKey: string,
    opted: () => boolean,
    safe: Accessor<
      PaginatedHookConfig<Params & { initialPage?: number; pageSize?: number }>
    >,
    args: () => Params,
    fetcher: (
      org: OrganizationResource
    ) => (p: Params) => Promise<ClerkPaginatedResponse<R>>
  ) =>
    usePagesOrInfinite<Params, ClerkPaginatedResponse<R>>(() => {
      const org = organization();
      const values = safe();
      return {
        fetcher: org ? fetcher(org) : undefined,
        config: {
          keepPreviousData: values.keepPreviousData,
          infinite: values.infinite,
          enabled: opted(),
          isSignedIn: org !== null,
          initialPage: values.initialPage,
          pageSize: values.pageSize
        },
        keys: {
          stableKey,
          authenticated: true,
          tracked: { organizationId: org?.id },
          args: opted() ? args() : undefined
        }
      };
    });

  const domains = list<GetDomainsParams, OrganizationDomainResource>(
    'domains',
    () => p().domains !== undefined,
    domainSafeValues,
    () => ({ enrollmentMode: domainSafeValues().enrollmentMode }),
    (org) => (params) => org.getDomains(params)
  );

  const membershipRequests = list<
    GetMembershipRequestParams,
    OrganizationMembershipRequestResource
  >(
    'membershipRequests',
    () => p().membershipRequests !== undefined,
    membershipRequestSafeValues,
    () => ({ status: membershipRequestSafeValues().status }),
    (org) => (params) => org.getMembershipRequests(params)
  );

  const memberships = list<GetMembersParams, OrganizationMembershipResource>(
    'memberships',
    () => p().memberships !== undefined,
    membersSafeValues,
    () => ({
      role: membersSafeValues().role,
      query: membersSafeValues().query
    }),
    (org) => (params) => org.getMemberships(params)
  );

  const invitations = list<
    GetInvitationsParams,
    OrganizationInvitationResource
  >(
    'invitations',
    () => p().invitations !== undefined,
    invitationsSafeValues,
    () => ({ status: invitationsSafeValues().status }),
    (org) => (params) => org.getInvitations(params)
  );

  // `undefined` while loading, `null` without an organization, `'ssr'` when only the
  // server-rendered organization is known, `'loaded'` otherwise.
  const phase = createMemo(() => {
    const org = organization();
    if (org === undefined) return undefined;
    if (org === null) return null;
    return loaded() ? 'loaded' : 'ssr';
  });

  const pick =
    <R>(resource: R) =>
    () => {
      const current = phase();
      if (current === null) return null;
      if (current === 'loaded') return resource;
      return undefinedPaginatedResource;
    };

  return {
    isLoaded: () => phase() !== undefined,
    organization,
    membership: createMemo(() => {
      const current = phase();
      if (current === null) return null;
      if (current !== 'loaded') return undefined;
      return getCurrentOrganizationMembership(
        session()?.user?.organizationMemberships ?? [],
        organization()!.id
      );
    }),
    domains: pick(domains) as UseOrganizationReturn<T>['domains'],
    membershipRequests: pick(
      membershipRequests
    ) as UseOrganizationReturn<T>['membershipRequests'],
    memberships: pick(memberships) as UseOrganizationReturn<T>['memberships'],
    invitations: pick(invitations) as UseOrganizationReturn<T>['invitations']
  };
}
