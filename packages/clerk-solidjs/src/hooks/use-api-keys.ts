import { eventMethodCalled } from '@clerk/shared/telemetry';
import type {
  APIKeyResource,
  ClerkPaginatedResponse,
  GetAPIKeysParams
} from '@clerk/shared/types';
import { type Accessor, createMemo } from 'solid-js';
import { useClerkContext } from '../contexts/clerk-instance';
import type { PaginatedHookConfig, PaginatedResources } from '../types';
import { useUserBase } from './base';
import { useAssertWrappedByClerkProvider } from './use-assert-wrapped-by-clerk-provider';
import {
  convertToSafeValues,
  usePagesOrInfinite
} from './use-pages-or-infinite';

/**
 * @interface
 */
export type UseAPIKeysParams = PaginatedHookConfig<
  GetAPIKeysParams & {
    /**
     * If `true`, a request is triggered when the hook is mounted.
     *
     * @default true
     */
    enabled?: boolean;
  }
>;

export type UseAPIKeysReturn<T extends UseAPIKeysParams> = PaginatedResources<
  APIKeyResource,
  T extends { infinite: true } ? true : false
>;

/**
 * Paginated API keys for a user or Organization (`subject`), with optional `query` search.
 *
 * @example
 * ```tsx
 * const [search, setSearch] = createSignal('');
 * const { data, isLoading, fetchNext, hasNextPage } = useAPIKeys(() => ({
 *   subject: 'user_123',
 *   query: search().trim(),
 *   pageSize: 10
 * }));
 * ```
 */
export function useAPIKeys<T extends UseAPIKeysParams = UseAPIKeysParams>(
  params?: Accessor<T | undefined>
): UseAPIKeysReturn<T> {
  useAssertWrappedByClerkProvider('useAPIKeys');

  const ctx = useClerkContext('useAPIKeys');
  const { clerk } = ctx;
  const user = useUserBase();

  clerk.telemetry?.record(eventMethodCalled('useAPIKeys'));

  const safeValues = createMemo(() =>
    convertToSafeValues(params?.(), {
      initialPage: 1,
      pageSize: 10,
      keepPreviousData: false,
      infinite: false,
      subject: '',
      query: '',
      enabled: true
    } as UseAPIKeysParams)
  );

  const loaded = createMemo(() => {
    ctx.status();
    return clerk.loaded;
  });

  return usePagesOrInfinite<
    GetAPIKeysParams,
    ClerkPaginatedResponse<APIKeyResource>
  >(() => {
    const values = safeValues();
    const apiKeys = loaded() ? clerk.apiKeys : undefined;
    return {
      fetcher: apiKeys?.getAll
        ? (p: GetAPIKeysParams) =>
            apiKeys.getAll({ ...p, subject: values.subject })
        : undefined,
      config: {
        keepPreviousData: values.keepPreviousData,
        infinite: values.infinite,
        enabled: (values.enabled ?? true) && loaded(),
        isSignedIn: user() !== null,
        initialPage: values.initialPage,
        pageSize: values.pageSize
      },
      keys: {
        stableKey: 'apiKeys',
        authenticated: true,
        tracked: { subject: values.subject },
        args: {
          ...(values.subject ? { subject: values.subject } : {}),
          ...(values.query ? { query: values.query } : {})
        }
      }
    };
  }) as UseAPIKeysReturn<T>;
}
