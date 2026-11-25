import { eventMethodCalled } from '@clerk/shared/telemetry';
import type {
  ClerkPaginatedResponse,
  ClerkResource,
  ForPayerType,
  LoadedClerk,
  OrganizationResource,
  UserResource
} from '@clerk/shared/types';
import { type Accessor, createMemo } from 'solid-js';
import { useClerkContext } from '../../contexts/clerk-instance';
import type {
  PagesOrInfiniteOptions,
  PaginatedHookConfig,
  PaginatedResources
} from '../../types';
import { useOrganizationBase, useUserBase } from '../base';
import { useAssertWrappedByClerkProvider } from '../use-assert-wrapped-by-clerk-provider';
import {
  convertToSafeValues,
  usePagesOrInfinite
} from '../use-pages-or-infinite';
import { useBillingIsEnabled } from './use-billing-is-enabled';

/**
 * Options of the paginated billing hooks.
 *
 * @interface
 */
export interface BillingHookParams extends PaginatedHookConfig<
  PagesOrInfiniteOptions & {
    /**
     * If `true`, a request is triggered when the hook is mounted.
     *
     * @default true
     */
    enabled?: boolean;
    /**
     * In `cache` mode no request is made; data is read from the cache only.
     *
     * @hidden
     * @experimental
     */
    __experimental_mode?: 'cache';
  }
> {
  /**
   * Fetch for the current user or the Active Organization.
   *
   * @default 'user'
   */
  for?: ForPayerType;
}

type FetcherSource = {
  clerk: LoadedClerk;
  user: UserResource | null | undefined;
  organization: OrganizationResource | null | undefined;
};

type BillingHookConfig<TResource extends ClerkResource, TParams> = {
  hookName: string;
  resourceType: string;
  /** Picks the fetcher; called inside a computation, so its reads are tracked. */
  getFetcher: (
    payer: ForPayerType,
    source: FetcherSource
  ) =>
    | ((
        params: TParams & { orgId?: string }
      ) => Promise<ClerkPaginatedResponse<TResource>>)
    | undefined;
  options?: {
    unauthenticated?: boolean;
  };
};

/**
 * Builds a paginated billing hook (`usePlans`, `useStatements`, ...), as
 * `createBillingPaginatedHook` in `@clerk/shared/react`.
 *
 * @internal
 */
export function createBillingPaginatedHook<
  TResource extends ClerkResource,
  TParams extends PagesOrInfiniteOptions
>({
  hookName,
  resourceType,
  getFetcher,
  options
}: BillingHookConfig<TResource, TParams>) {
  return function useBillingHook<
    T extends BillingHookParams = BillingHookParams
  >(
    params?: Accessor<T | undefined>
  ): PaginatedResources<
    TResource,
    T extends { infinite: true } ? true : false
  > {
    useAssertWrappedByClerkProvider(hookName);

    const ctx = useClerkContext(hookName);
    const user = useUserBase();
    const organization = useOrganizationBase();

    ctx.clerk.telemetry?.record(eventMethodCalled(hookName));

    const resolved = createMemo(() => {
      const { for: payer, enabled, ...pagination } = params?.() ?? ({} as T);
      return {
        payer: payer || 'user',
        enabled,
        safe: convertToSafeValues(
          pagination as BillingHookParams,
          {
            initialPage: 1,
            pageSize: 10,
            keepPreviousData: false,
            infinite: false,
            __experimental_mode: undefined
          } as BillingHookParams
        )
      };
    });

    const billingEnabled = useBillingIsEnabled(() => ({
      for: resolved().payer,
      enabled: resolved().enabled,
      authenticated: !options?.unauthenticated
    }));

    const loaded = createMemo(() => {
      ctx.status();
      return ctx.clerk.loaded;
    });

    return usePagesOrInfinite<TParams, ClerkPaginatedResponse<TResource>>(
      () => {
        const { payer, safe } = resolved();
        const isForOrganization = payer === 'organization';
        const org = organization();
        const u = user();
        const args = {
          ...(options?.unauthenticated
            ? {}
            : isForOrganization
              ? { orgId: org?.id }
              : {})
        } as unknown as TParams;

        return {
          fetcher: getFetcher(payer, {
            clerk: ctx.clerk as unknown as LoadedClerk,
            user: loaded() ? u : undefined,
            organization: loaded() ? org : undefined
          }) as
            | ((p: TParams) => Promise<ClerkPaginatedResponse<TResource>>)
            | undefined,
          config: {
            keepPreviousData: safe.keepPreviousData,
            infinite: safe.infinite,
            enabled: loaded() && billingEnabled(),
            ...(options?.unauthenticated ? {} : { isSignedIn: u !== null }),
            __experimental_mode: safe.__experimental_mode,
            initialPage: safe.initialPage,
            pageSize: safe.pageSize
          },
          keys: {
            stableKey: resourceType,
            authenticated: !options?.unauthenticated,
            tracked: options?.unauthenticated
              ? { for: payer }
              : {
                  userId: u?.id,
                  ...(isForOrganization ? { orgId: org?.id } : {})
                },
            args
          }
        };
      }
    ) as PaginatedResources<
      TResource,
      T extends { infinite: true } ? true : false
    >;
  };
}
