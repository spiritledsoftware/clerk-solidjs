import type { ClerkAPIResponseError } from '@clerk/shared/error';
import { eventMethodCalled } from '@clerk/shared/telemetry';
import type {
  EnvironmentResource,
  OrganizationCreationDefaultsResource
} from '@clerk/shared/types';
import { type Accessor, createMemo } from 'solid-js';
import { useClerkContext } from '../contexts/clerk-instance';
import { useUserBase } from './base';
import { useClerkQuery } from './query/use-clerk-query';
import { useAssertWrappedByClerkProvider } from './use-assert-wrapped-by-clerk-provider';

const HOOK_NAME = 'useOrganizationCreationDefaults';

/**
 * @interface
 */
export type UseOrganizationCreationDefaultsParams = {
  /**
   * Keep the previous data until new data is fetched.
   *
   * @default true
   */
  keepPreviousData?: boolean;
  /**
   * If `true`, a request is triggered when the hook is mounted.
   *
   * @default true
   */
  enabled?: boolean;
};

export type UseOrganizationCreationDefaultsReturn = {
  /**
   * The defaults: `undefined` before the first fetch, `null` if not available.
   */
  data: Accessor<OrganizationCreationDefaultsResource | undefined | null>;
  error: Accessor<ClerkAPIResponseError | null>;
  /** `true` while the initial data is being fetched. */
  isLoading: Accessor<boolean>;
  /** `true` while any request is in flight, including background updates. */
  isFetching: Accessor<boolean>;
};

/**
 * Retrieve the Organization creation defaults (suggested name, slug, logo) for the
 * current user. Only fetches when the instance has the feature enabled.
 *
 * @example
 * ```tsx
 * const { data, isLoading } = useOrganizationCreationDefaults();
 *
 * return (
 *   <Show when={!isLoading()} fallback={<p>Loading...</p>}>
 *     <input value={data()?.form.name ?? ''} placeholder="Organization name" />
 *   </Show>
 * );
 * ```
 */
export function useOrganizationCreationDefaults(
  params?: Accessor<UseOrganizationCreationDefaultsParams | undefined>
): UseOrganizationCreationDefaultsReturn {
  useAssertWrappedByClerkProvider(HOOK_NAME);

  const ctx = useClerkContext(HOOK_NAME);
  const { clerk } = ctx;
  const user = useUserBase();

  clerk.telemetry?.record(eventMethodCalled(HOOK_NAME));

  const loaded = createMemo(() => {
    ctx.status();
    return clerk.loaded;
  });

  const query = useClerkQuery<OrganizationCreationDefaultsResource>(() => {
    const { keepPreviousData = true, enabled = true } = params?.() ?? {};
    const environment = loaded()
      ? ((clerk as any).__internal_environment as
          | EnvironmentResource
          | null
          | undefined)
      : undefined;
    const featureEnabled =
      environment?.organizationSettings?.organizationCreationDefaults
        ?.enabled ?? false;
    const u = user();
    return {
      key: {
        stableKey: 'organizationCreationDefaults',
        authenticated: !!u?.id,
        tracked: { userId: u?.id ?? null },
        args: {}
      },
      fn: u ? () => u.getOrganizationCreationDefaults() : undefined,
      enabled: !!u && enabled && featureEnabled && loaded(),
      keepPreviousData
    };
  });

  return {
    data: query.data,
    error: () => query.error() as ClerkAPIResponseError | null,
    isLoading: query.isLoading,
    isFetching: query.isFetching
  };
}
