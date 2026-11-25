import { type Accessor, createEffect, createMemo } from 'solid-js';
import { useClerkContext } from '../../contexts/clerk-instance';
import {
  getQueryCache,
  hashQueryKey,
  type QueryCache,
  type QueryEntry,
  type QueryFn,
  type QueryKey
} from './query-cache';

/**
 * @internal
 */
export type ClerkQueryOptions<T> = {
  key: QueryKey;
  fn: QueryFn<T> | undefined;
  enabled: boolean;
  /** Show the previous key's data while the new key loads. */
  keepPreviousData?: boolean;
  /** How long fetched data counts as fresh, in milliseconds. */
  staleTime?: number;
};

/**
 * @internal
 */
export type ClerkQueryResult<T> = {
  data: Accessor<T | undefined>;
  error: Accessor<unknown>;
  isLoading: Accessor<boolean>;
  isFetching: Accessor<boolean>;
  isPlaceholderData: Accessor<boolean>;
  /** Refetch now, superseding any request in flight. */
  refetch: () => Promise<T | undefined>;
  /** The current request's key and hash (untracked when read outside a computation). */
  request: Accessor<ActiveRequest<T>>;
  cache: QueryCache;
};

type ActiveRequest<T> = {
  key: QueryKey;
  hash: string;
  fn: QueryFn<T> | undefined;
  enabled: boolean;
  keepPreviousData: boolean;
  staleTime: number;
};

/**
 * Fetches and caches one request, exposing its state as accessors.
 *
 * Requests are started from an effect and their results written back from promise
 * callbacks into the shared {@link QueryCache}, instead of returning the promise from a
 * memo. An async memo would make every read of `data()` throw `NotReadyError` until
 * the first response, forcing consumers under a `<Loading>` boundary; this way the
 * accessors always return a value and `isLoading()` / `isFetching()` report progress,
 * matching the `@clerk/react` hook API.
 *
 * @internal
 */
export function useClerkQuery<T>(
  options: Accessor<ClerkQueryOptions<T>>
): ClerkQueryResult<T> {
  const { clerk } = useClerkContext();
  const cache = getQueryCache(clerk);

  // Only a change of key or switches restarts the request; a new `fn` for the same key
  // (e.g. a method of a re-emitted resource) does not.
  const request = createMemo(
    (): ActiveRequest<T> => {
      const o = options();
      return {
        key: o.key,
        hash: hashQueryKey(o.key),
        fn: o.fn,
        enabled: o.enabled && !!o.fn,
        keepPreviousData: !!o.keepPreviousData,
        staleTime: o.staleTime ?? 0
      };
    },
    {
      equals: (a, b) =>
        a.hash === b.hash &&
        a.enabled === b.enabled &&
        a.keepPreviousData === b.keepPreviousData
    }
  );

  createEffect(
    () => request(),
    (req) => {
      if (!req.enabled || !req.fn) return;
      void cache.fetch(req.key, req.fn, { staleTime: req.staleTime });
      return cache.observe(req.hash, req.fn);
    }
  );

  const entry = (): QueryEntry<T> | undefined => cache.read<T>(request().hash);

  const isFetching = createMemo(() => {
    const e = entry();
    // Before the effect starts the first request, an enabled query is already pending.
    return e ? e.fetching : request().enabled;
  });

  const view = createMemo<{ data: T | undefined; placeholder: boolean }>(
    (prev) => {
      const req = request();
      const e = entry();
      if (e?.hasData) {
        return { data: e.data, placeholder: false };
      }
      const pending = e ? e.fetching : req.enabled;
      if (req.keepPreviousData && req.enabled && pending && prev) {
        return { data: prev.data, placeholder: prev.data !== undefined };
      }
      return { data: undefined, placeholder: false };
    }
  );

  return {
    data: () => view().data,
    error: () => entry()?.error ?? null,
    isLoading: () => isFetching() && !entry()?.hasData && !view().placeholder,
    isFetching,
    isPlaceholderData: () => view().placeholder,
    refetch: () => {
      const req = request();
      return req.enabled && req.fn
        ? cache.fetch(req.key, req.fn, { force: true })
        : Promise.resolve(undefined);
    },
    request,
    cache
  };
}
