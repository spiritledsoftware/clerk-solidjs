import { type Accessor, createSignal, runWithOwner } from 'solid-js';

/**
 * Identifies a cached request. `tracked` holds the identity values (user, organization)
 * that `revalidate()` and sign-out clearing match on; `args` holds the request arguments.
 *
 * @internal
 */
export type QueryKey = {
  stableKey: string;
  authenticated: boolean;
  tracked: Record<string, unknown>;
  args?: unknown;
};

/**
 * Computes the next value of an entry. Receives the entry's current data, which lets
 * infinite lists refetch or extend the pages they already hold.
 *
 * @internal
 */
export type QueryFn<T> = (previous: T | undefined) => T | Promise<T>;

/**
 * @internal
 */
export type QueryEntry<T = unknown> = {
  readonly key: QueryKey;
  readonly hash: string;
  data: T | undefined;
  hasData: boolean;
  error: unknown;
  /** When `data` was last written; `0` marks the entry stale. */
  updatedAt: number;
  fetching: boolean;
  promise: Promise<T | undefined> | undefined;
  /** Bumped by each request; only the latest request may settle the entry. */
  requestId: number;
};

export const hashQueryKey = (key: QueryKey): string =>
  JSON.stringify([
    key.stableKey,
    key.authenticated,
    key.tracked,
    key.args ?? null
  ]);

/**
 * A small request cache shared by every hook under one Clerk instance, standing in for
 * the TanStack Query client `@clerk/shared/react` uses.
 *
 * Plain data lives in a `Map`; one signal is bumped on every change so accessors that
 * read through {@link QueryCache.read} re-evaluate. Writes only happen from effect
 * callbacks, event handlers, and promise callbacks, never inside a computation.
 *
 * Ordering: every request takes a fresh `requestId` on its entry and only settles the
 * entry if it is still the latest request for a still-cached entry, so a slow response
 * never overwrites a newer one. Responses for other keys only touch their own entries,
 * which hooks no longer display once their key moved on.
 *
 * @internal
 */
export class QueryCache {
  readonly #entries = new Map<string, QueryEntry<any>>();
  readonly #observers = new Map<string, Set<QueryFn<any>>>();
  readonly #version: Accessor<number>;
  readonly #setVersion: (fn: (v: number) => number) => void;

  constructor() {
    const [version, setVersion] = createSignal(0);
    this.#version = version;
    this.#setVersion = setVersion;
  }

  #notify() {
    this.#setVersion((v) => v + 1);
  }

  #ensure<T>(key: QueryKey): QueryEntry<T> {
    const hash = hashQueryKey(key);
    let entry = this.#entries.get(hash);
    if (!entry) {
      entry = {
        key,
        hash,
        data: undefined,
        hasData: false,
        error: null,
        updatedAt: 0,
        fetching: false,
        promise: undefined,
        requestId: 0
      };
      this.#entries.set(hash, entry);
    }
    return entry;
  }

  #isCurrent(entry: QueryEntry<any>, requestId: number) {
    return (
      this.#entries.get(entry.hash) === entry && entry.requestId === requestId
    );
  }

  /** Reactive read; tracks every cache change. */
  read<T>(hash: string): QueryEntry<T> | undefined {
    this.#version();
    return this.#entries.get(hash);
  }

  /** Untracked read. */
  peek<T>(hash: string): QueryEntry<T> | undefined {
    return this.#entries.get(hash);
  }

  /**
   * Starts a request for `key` unless one is already in flight or the data is younger
   * than `staleTime`. `force` always starts a new request and supersedes any in flight.
   */
  fetch<T>(
    key: QueryKey,
    fn: QueryFn<T>,
    options: { force?: boolean; staleTime?: number } = {}
  ): Promise<T | undefined> {
    const entry = this.#ensure<T>(key);
    if (!options.force) {
      if (entry.fetching && entry.promise) {
        return entry.promise;
      }
      if (
        entry.hasData &&
        entry.updatedAt > 0 &&
        Date.now() - entry.updatedAt < (options.staleTime ?? 0)
      ) {
        return Promise.resolve(entry.data);
      }
    }

    const requestId = ++entry.requestId;
    const previous = entry.data;
    entry.fetching = true;

    const promise = new Promise<T>((resolve) => resolve(fn(previous))).then(
      (data) => {
        if (this.#isCurrent(entry, requestId)) {
          entry.data = data;
          entry.hasData = true;
          entry.error = null;
          entry.updatedAt = Date.now();
          entry.fetching = false;
          entry.promise = undefined;
          this.#notify();
        }
        return data;
      },
      (error: unknown) => {
        if (this.#isCurrent(entry, requestId)) {
          entry.error = error;
          entry.fetching = false;
          entry.promise = undefined;
          this.#notify();
        }
        return undefined;
      }
    );
    entry.promise = promise;
    this.#notify();
    return promise;
  }

  /**
   * Writes data directly, as `setData` does. A request already in flight for the
   * entry is superseded so it cannot overwrite the written value.
   */
  async setData<T>(
    key: QueryKey,
    value:
      | T
      | undefined
      | ((current?: T) => Promise<T | undefined> | T | undefined)
  ): Promise<T | undefined> {
    const entry = this.#ensure<T>(key);
    const next =
      typeof value === 'function'
        ? await (
            value as (current?: T) => Promise<T | undefined> | T | undefined
          )(entry.data)
        : value;
    entry.requestId++;
    entry.fetching = false;
    entry.promise = undefined;
    entry.data = next;
    entry.hasData = true;
    entry.error = null;
    entry.updatedAt = Date.now();
    this.#notify();
    return next;
  }

  /**
   * Registers `fn` as the way to refetch `hash` while a hook displays it, so
   * {@link QueryCache.invalidate} can refetch it. Returns the unregister function.
   */
  observe(hash: string, fn: QueryFn<any>): () => void {
    let set = this.#observers.get(hash);
    if (!set) {
      set = new Set();
      this.#observers.set(hash, set);
    }
    set.add(fn);
    return () => {
      set.delete(fn);
      if (set.size === 0 && this.#observers.get(hash) === set) {
        this.#observers.delete(hash);
      }
    };
  }

  /**
   * Marks matching entries stale and refetches the ones a hook currently displays.
   */
  async invalidate(predicate: (key: QueryKey) => boolean): Promise<void> {
    const refetches: Promise<unknown>[] = [];
    for (const entry of this.#entries.values()) {
      if (!predicate(entry.key)) continue;
      entry.updatedAt = 0;
      const observers = this.#observers.get(entry.hash);
      const fn = observers && [...observers].at(-1);
      if (fn) {
        refetches.push(this.fetch(entry.key, fn, { force: true }));
      }
    }
    await Promise.all(refetches);
  }

  /** Drops matching entries; any request in flight for them is discarded. */
  remove(predicate: (key: QueryKey) => boolean): void {
    let removed = false;
    for (const [hash, entry] of this.#entries) {
      if (predicate(entry.key)) {
        this.#entries.delete(hash);
        removed = true;
      }
    }
    if (removed) this.#notify();
  }
}

const caches = new WeakMap<object, QueryCache>();

/**
 * The cache shared by every hook under the given Clerk instance.
 *
 * @internal
 */
export function getQueryCache(clerk: object): QueryCache {
  let cache = caches.get(clerk);
  if (!cache) {
    // Detach from the calling component so the cache outlives it.
    cache = runWithOwner(null, () => new QueryCache())!;
    caches.set(clerk, cache);
  }
  return cache;
}

/**
 * Builds a predicate that matches every entry of the given lists for one identity,
 * including their infinite variants.
 *
 * @internal
 */
export function matchKeys(
  stableKeys: readonly string[],
  tracked?: Record<string, unknown>,
  authenticated?: boolean
): (key: QueryKey) => boolean {
  const trackedHash = tracked && JSON.stringify(tracked);
  return (key) =>
    stableKeys.includes(key.stableKey) &&
    (authenticated === undefined || key.authenticated === authenticated) &&
    (trackedHash === undefined || JSON.stringify(key.tracked) === trackedHash);
}

export const withInfiniteKey = (key: string) => [key, `${key}-inf`] as const;
