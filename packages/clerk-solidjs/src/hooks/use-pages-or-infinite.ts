import type { ClerkAPIResponseError } from '@clerk/shared/error';
import type { ClerkPaginatedResponse } from '@clerk/shared/types';
import {
  type Accessor,
  createEffect,
  createMemo,
  createSignal
} from 'solid-js';
import type {
  CacheSetter,
  PagesOrInfiniteConfig,
  PagesOrInfiniteOptions,
  PaginatedResources,
  PaginatedResourcesWithDefault,
  ValueOrSetter
} from '../types';
import {
  hashQueryKey,
  matchKeys,
  type QueryKey,
  withInfiniteKey
} from './query/query-cache';
import { useClerkQuery } from './query/use-clerk-query';

/**
 * Merges user pagination options with defaults. `true` means "use the defaults".
 *
 * @internal
 */
export const convertToSafeValues = <T extends PagesOrInfiniteOptions>(
  params: T | true | undefined,
  defaultValues: T
): T => {
  const shouldUseDefaults = typeof params === 'boolean' && params;
  const merged: Record<string, unknown> = {};
  for (const key of Object.keys(defaultValues)) {
    merged[key] = shouldUseDefaults
      ? defaultValues[key as keyof T]
      : ((params as T | undefined)?.[key as keyof T] ??
        defaultValues[key as keyof T]);
  }
  return merged as T;
};

/**
 * Pagination math, as in `@clerk/shared/react`.
 *
 * @internal
 */
export const calculateOffsetCount = (initialPage: number, pageSize: number) =>
  (initialPage - 1) * pageSize;

export const calculatePageCount = (
  totalCount: number,
  offsetCount: number,
  pageSize: number
) => Math.ceil((totalCount - offsetCount) / pageSize);

export const calculateHasNextPage = (
  totalCount: number,
  offsetCount: number,
  currentPage: number,
  pageSize: number
) => totalCount - offsetCount > currentPage * pageSize;

export const calculateHasPreviousPage = (
  currentPage: number,
  pageSize: number,
  offsetCount: number
) => (currentPage - 1) * pageSize > offsetCount;

type ArrayType<DataArray> =
  DataArray extends Array<infer ElementType> ? ElementType : never;
export type ExtractData<Type> = Type extends { data: infer Data }
  ? ArrayType<Data>
  : Type;

/**
 * Cache identity of a paginated list. `tracked` identifies whose data it is (used by
 * `revalidate()` and sign-out clearing); `args` are the request arguments.
 *
 * @internal
 */
export type PaginatedCacheKeys<Params> = {
  stableKey: string;
  authenticated: boolean;
  tracked: Record<string, unknown>;
  args: Params | undefined;
};

/**
 * @internal
 */
export type UsePagesOrInfiniteParams<
  Params,
  FetcherReturnData,
  TConfig extends PagesOrInfiniteConfig & PagesOrInfiniteOptions
> = {
  fetcher:
    | ((p: Params) => FetcherReturnData | Promise<FetcherReturnData>)
    | undefined;
  config: TConfig;
  keys: PaginatedCacheKeys<Params>;
};

const PAGES_STALE_TIME = 60_000;

type Page = ClerkPaginatedResponse<any> | undefined;

/**
 * The paginated-list engine behind `useOrganization()`, `useOrganizationList()`,
 * `useAPIKeys()`, and the billing hooks. A Solid port of `usePagesOrInfinite` from
 * `@clerk/shared/react` without TanStack Query.
 *
 * - Paged mode caches each page under its own key (`args` + page + pageSize) for 60s;
 *   `keepPreviousData` shows the previous page while the next one loads.
 * - Infinite mode keeps one entry holding every loaded page. `fetchNext()` appends
 *   the next page; `revalidate()` refetches all loaded pages.
 * - Changing `keys.tracked` or `keys.args` switches to (and if needed fetches) that key.
 * - `initialPage` and `pageSize` are read once, from the first options.
 * - The cache is shared per Clerk instance, so `revalidate()` refetches every hook
 *   showing the same list, and lists are dropped when `isSignedIn` turns `false`.
 *
 * See {@link useClerkQuery} for why state is written from promise callbacks rather
 * than exposed as an async memo.
 *
 * @internal
 */
export function usePagesOrInfinite<
  Params,
  FetcherReturnData extends Record<string, any>,
  TConfig extends PagesOrInfiniteConfig & PagesOrInfiniteOptions =
    PagesOrInfiniteConfig & PagesOrInfiniteOptions
>(
  options: Accessor<
    UsePagesOrInfiniteParams<Params, FetcherReturnData, TConfig>
  >
): PaginatedResources<
  ExtractData<FetcherReturnData>,
  TConfig['infinite'] extends true ? true : false
> {
  // `initialPage` and `pageSize` keep their first values for the hook's lifetime.
  let sizing: { initialPage: number; pageSize: number } | undefined;
  const fixed = createMemo(() => {
    const config = options().config;
    sizing ??= {
      initialPage: config.initialPage ?? 1,
      pageSize: config.pageSize ?? 10
    };
    return sizing;
  });
  const initialPage = () => fixed().initialPage;
  const pageSize = () => fixed().pageSize;
  // For request callbacks, which run outside tracking scopes; `fixed` has run by then.
  const sized = () => sizing ?? fixed();

  const [pageOverride, setPageOverride] = createSignal<number | undefined>();
  const paginatedPage = () => pageOverride() ?? initialPage();

  const infinite = createMemo(() => options().config.infinite ?? false);
  const queriesEnabled = createMemo(() => {
    const { fetcher, config } = options();
    return (
      (config.enabled ?? true) &&
      !!fetcher &&
      config.__experimental_mode !== 'cache' &&
      config.isSignedIn !== false
    );
  });

  const fetchWith = (
    fetcher: UsePagesOrInfiniteParams<
      Params,
      FetcherReturnData,
      TConfig
    >['fetcher'],
    args: Params | undefined,
    page: number
  ) =>
    fetcher!({
      ...(args as object),
      initialPage: page,
      pageSize: sized().pageSize
    } as Params) as unknown as Promise<Page>;

  // Paged mode: one cache entry per page.
  const pagesQuery = useClerkQuery<Page>(() => {
    const { fetcher, config, keys } = options();
    const page = paginatedPage();
    const args = keys.args;
    return {
      key: {
        stableKey: keys.stableKey,
        authenticated: keys.authenticated,
        tracked: keys.tracked,
        args: { ...(args as object), initialPage: page, pageSize: pageSize() }
      },
      fn: fetcher ? () => fetchWith(fetcher, args, page) : undefined,
      enabled: queriesEnabled() && !infinite(),
      keepPreviousData: config.keepPreviousData ?? false,
      staleTime: PAGES_STALE_TIME
    };
  });

  // Infinite mode: one cache entry holding every loaded page.
  const nextPageParam = (pages: Page[]) => {
    const { initialPage: first, pageSize: size } = sized();
    const total = pages[pages.length - 1]?.total_count ?? 0;
    const consumed = (pages.length + first - 1) * size;
    return consumed < total ? first + pages.length : undefined;
  };

  const infiniteKey = createMemo((): QueryKey => {
    const { keys } = options();
    return {
      stableKey: `${keys.stableKey}-inf`,
      authenticated: keys.authenticated,
      tracked: keys.tracked,
      args: keys.args
    };
  });

  const infiniteQuery = useClerkQuery<Page[]>(() => {
    const { fetcher, keys } = options();
    const args = keys.args;
    return {
      key: infiniteKey(),
      // (Re)fetch as many pages as are loaded, at least the first, in order.
      fn: fetcher
        ? async (previous) => {
            const target = Math.max(previous?.length ?? 0, 1);
            const pages: Page[] = [];
            let next: number | undefined = sized().initialPage;
            while (next !== undefined && pages.length < target) {
              pages.push(await fetchWith(fetcher, args, next));
              next = nextPageParam(pages);
            }
            return pages;
          }
        : undefined,
      enabled: queriesEnabled() && infinite(),
      staleTime: PAGES_STALE_TIME
    };
  });

  // Clear the cached lists when the user signs out.
  const signedOut = createMemo(() => options().config.isSignedIn === false);
  createEffect(
    () => signedOut(),
    (isSignedOut, wasSignedOut) => {
      if (isSignedOut && wasSignedOut === false) {
        const { keys } = options();
        if (keys.authenticated) {
          pagesQuery.cache.remove(
            matchKeys(withInfiniteKey(keys.stableKey), undefined, true)
          );
        }
        setPageOverride(undefined);
      }
    }
  );

  const infinitePages = createMemo(
    () => (infiniteQuery.data() ?? []).filter(Boolean) as NonNullable<Page>[]
  );

  const data = createMemo(() => {
    if (infinite()) {
      return infinitePages().flatMap((p) => p.data ?? []);
    }
    const pageData = pagesQuery.data();
    return Array.isArray(pageData?.data) ? pageData.data : [];
  });

  const count = createMemo(() => {
    if (infinite()) {
      return infinitePages().at(-1)?.total_count ?? 0;
    }
    const total = pagesQuery.data()?.total_count;
    return typeof total === 'number' ? total : 0;
  });

  const page = createMemo(() => {
    if (infinite()) {
      const loaded = infinitePages().length;
      return loaded > 0 ? loaded : initialPage();
    }
    return paginatedPage();
  });

  const active = () => (infinite() ? infiniteQuery : pagesQuery);

  const error = () =>
    (active().error() as ClerkAPIResponseError | null | undefined) ?? null;

  const offsetCount = () => calculateOffsetCount(initialPage(), pageSize());

  const fetchNextInfinite = () => {
    const { fetcher, keys } = options();
    const key = infiniteKey();
    // Read the cache directly: accessors lag writes until the next flush.
    const entry = infiniteQuery.cache.peek<Page[]>(hashQueryKey(key));
    const pages = entry?.data;
    if (!fetcher || !queriesEnabled() || !pages?.length || entry?.fetching) {
      return;
    }
    const next = nextPageParam(pages);
    if (next === undefined) return;
    void infiniteQuery.cache.fetch<Page[]>(
      key,
      async (previous) => [
        ...(previous ?? []),
        await fetchWith(fetcher, keys.args, next)
      ],
      { force: true }
    );
  };

  const fetchPage: ValueOrSetter<number> = (numberOrFn) => {
    if (infinite()) {
      const target = Math.max(
        0,
        typeof numberOrFn === 'function' ? numberOrFn(page()) : numberOrFn
      );
      if (target > infinitePages().length) {
        fetchNextInfinite();
      }
      return;
    }
    setPageOverride((current) => {
      const value = current ?? initialPage();
      return typeof numberOrFn === 'function' ? numberOrFn(value) : numberOrFn;
    });
  };

  const setData: CacheSetter = (value) => {
    if (infinite()) {
      return infiniteQuery.cache.setData<Page[]>(infiniteKey(), value as any);
    }
    return pagesQuery.cache.setData<Page>(
      pagesQuery.request().key,
      value as any
    );
  };

  const revalidate = async () => {
    const { keys } = options();
    await pagesQuery.cache.invalidate(
      matchKeys(
        withInfiniteKey(keys.stableKey),
        keys.tracked,
        keys.authenticated
      )
    );
  };

  return {
    data,
    count,
    error,
    isLoading: () => active().isLoading(),
    isFetching: () => active().isFetching(),
    isError: () => !!error(),
    page,
    pageCount: () => calculatePageCount(count(), offsetCount(), pageSize()),
    fetchPage,
    fetchNext: () => {
      if (infinite()) {
        fetchNextInfinite();
        return;
      }
      fetchPage((n) => Math.max(0, n + 1));
    },
    fetchPrevious: () => {
      // Forward-only in infinite mode, as upstream.
      if (infinite()) return;
      fetchPage((n) => Math.max(0, n - 1));
    },
    hasNextPage: () =>
      infinite()
        ? (() => {
            const pages = infiniteQuery.data();
            return !!pages?.length && nextPageParam(pages) !== undefined;
          })()
        : calculateHasNextPage(count(), offsetCount(), page(), pageSize()),
    hasPreviousPage: () =>
      infinite()
        ? false
        : calculateHasPreviousPage(page(), pageSize(), offsetCount()),
    revalidate,
    setData: setData as any
  };
}

/**
 * The value of a paginated list before Clerk has loaded.
 *
 * @internal
 */
export const undefinedPaginatedResource: PaginatedResourcesWithDefault = {
  data: () => undefined,
  count: () => undefined,
  error: () => undefined,
  isLoading: () => false,
  isFetching: () => false,
  isError: () => false,
  page: () => undefined,
  pageCount: () => undefined,
  fetchPage: undefined,
  fetchNext: undefined,
  fetchPrevious: undefined,
  hasNextPage: () => false,
  hasPreviousPage: () => false,
  revalidate: undefined,
  setData: undefined
};
