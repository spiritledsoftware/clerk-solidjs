import { cleanup } from '@solidjs/testing-library';
import { createSignal, flush } from 'solid-js';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type {
  PagesOrInfiniteConfig,
  PagesOrInfiniteOptions
} from '../../types';
import { usePagesOrInfinite } from '../use-pages-or-infinite';
import { createTestClerk, deferred, pageOf, settle } from './test-utils';

type Args = { initialPage?: number; pageSize?: number };
type Config = PagesOrInfiniteConfig & PagesOrInfiniteOptions;

const keys = (tracked: Record<string, unknown> = { orgId: 'org_1' }) => ({
  stableKey: 'memberships',
  authenticated: true,
  tracked,
  args: {} as Args
});

describe('usePagesOrInfinite', () => {
  afterEach(() => cleanup());

  describe('paged', () => {
    it('fetches the initial page and reports loading state', async () => {
      const t = createTestClerk();
      const request = deferred<ReturnType<typeof pageOf>>();
      const fetcher = vi.fn<(p: Args) => typeof request.promise>(
        () => request.promise
      );

      const r = t.renderHook(() =>
        usePagesOrInfinite(() => ({
          fetcher,
          config: { pageSize: 5 } as Config,
          keys: keys()
        }))
      );

      expect(r.isLoading()).toBe(true);
      expect(r.isFetching()).toBe(true);
      expect(r.data()).toEqual([]);
      expect(fetcher).toHaveBeenCalledWith({ initialPage: 1, pageSize: 5 });

      request.resolve(pageOf(1, 5, 12));
      await settle();

      expect(r.isLoading()).toBe(false);
      expect(r.isFetching()).toBe(false);
      expect(r.data().map((d) => d.id)).toEqual([
        'item_1',
        'item_2',
        'item_3',
        'item_4',
        'item_5'
      ]);
      expect(r.count()).toBe(12);
      expect(r.page()).toBe(1);
      expect(r.pageCount()).toBe(3);
      expect(r.hasNextPage()).toBe(true);
      expect(r.hasPreviousPage()).toBe(false);
    });

    it('moves between pages and serves visited pages from the cache', async () => {
      const t = createTestClerk();
      const fetcher = vi.fn(async (p: Args) =>
        pageOf(p.initialPage!, p.pageSize!, 12)
      );

      const r = t.renderHook(() =>
        usePagesOrInfinite(() => ({
          fetcher,
          config: { pageSize: 5 } as Config,
          keys: keys()
        }))
      );
      await settle();

      r.fetchNext();
      flush();
      expect(r.page()).toBe(2);
      // Without keepPreviousData the list is empty while page 2 loads.
      expect(r.data()).toEqual([]);
      expect(r.isLoading()).toBe(true);
      await settle();
      expect(r.data()[0].id).toBe('item_6');
      expect(r.hasPreviousPage()).toBe(true);

      r.fetchPage(3);
      await settle();
      expect(r.data().map((d) => d.id)).toEqual(['item_11', 'item_12']);
      expect(r.hasNextPage()).toBe(false);

      r.fetchPrevious();
      flush();
      // Page 2 is cached and fresh: shown immediately, no new request.
      expect(r.data()[0].id).toBe('item_6');
      await settle();
      expect(fetcher).toHaveBeenCalledTimes(3);
    });

    it('keeps the previous page while the next one loads with keepPreviousData', async () => {
      const t = createTestClerk();
      const second = deferred<ReturnType<typeof pageOf>>();
      const fetcher = vi.fn((p: Args) =>
        p.initialPage === 1 ? Promise.resolve(pageOf(1, 5, 12)) : second.promise
      );

      const r = t.renderHook(() =>
        usePagesOrInfinite(() => ({
          fetcher,
          config: { pageSize: 5, keepPreviousData: true } as Config,
          keys: keys()
        }))
      );
      await settle();

      r.fetchNext();
      flush();
      expect(r.page()).toBe(2);
      expect(r.data()[0].id).toBe('item_1');
      expect(r.isLoading()).toBe(false);
      expect(r.isFetching()).toBe(true);

      second.resolve(pageOf(2, 5, 12));
      await settle();
      expect(r.data()[0].id).toBe('item_6');
    });

    it('honors initialPage', async () => {
      const t = createTestClerk();
      const fetcher = vi.fn(async (p: Args) =>
        pageOf(p.initialPage!, p.pageSize!, 30)
      );

      const r = t.renderHook(() =>
        usePagesOrInfinite(() => ({
          fetcher,
          config: { initialPage: 2, pageSize: 10 } as Config,
          keys: keys()
        }))
      );
      await settle();

      expect(fetcher).toHaveBeenCalledWith({ initialPage: 2, pageSize: 10 });
      expect(r.page()).toBe(2);
      // Upstream's math counts pages from `initialPage`: 30 items, skipping 10, is 2 pages.
      expect(r.pageCount()).toBe(2);
      expect(r.hasPreviousPage()).toBe(false);
      expect(r.hasNextPage()).toBe(false);
    });

    it('does not fetch when disabled or without a fetcher', async () => {
      const t = createTestClerk();
      const fetcher = vi.fn(async () => pageOf(1, 10, 1));

      const r = t.renderHook(() => ({
        disabled: usePagesOrInfinite(() => ({
          fetcher,
          config: { enabled: false } as Config,
          keys: keys()
        })),
        missing: usePagesOrInfinite(() => ({
          fetcher: undefined,
          config: {} as Config,
          keys: keys()
        }))
      }));
      await settle();

      expect(fetcher).not.toHaveBeenCalled();
      expect(r.disabled.isLoading()).toBe(false);
      expect(r.missing.isFetching()).toBe(false);
      expect(r.disabled.data()).toEqual([]);
    });

    it('refetches when the cache keys change', async () => {
      const t = createTestClerk();
      const [orgId, setOrgId] = createSignal('org_1');
      const fetcher = vi.fn(async (p: Args) => pageOf(p.initialPage!, 5, 3));

      const r = t.renderHook(() =>
        usePagesOrInfinite(() => ({
          fetcher,
          config: { pageSize: 5 } as Config,
          keys: keys({ orgId: orgId() })
        }))
      );
      await settle();
      expect(fetcher).toHaveBeenCalledTimes(1);

      setOrgId('org_2');
      flush();
      expect(r.data()).toEqual([]);
      expect(r.isLoading()).toBe(true);
      await settle();
      expect(fetcher).toHaveBeenCalledTimes(2);
      expect(r.data()).toHaveLength(3);
    });

    it('never lets a stale response overwrite a newer one', async () => {
      const t = createTestClerk();
      const [orgId, setOrgId] = createSignal('org_1');
      const requests = new Map<string, ReturnType<typeof deferred<any>>>();
      const fetcher = vi.fn(() => {
        const d = deferred<any>();
        requests.set(orgId(), d);
        return d.promise;
      });

      const r = t.renderHook(() =>
        usePagesOrInfinite(() => ({
          fetcher,
          config: {} as Config,
          keys: keys({ orgId: orgId() })
        }))
      );
      flush();
      setOrgId('org_2');
      flush();

      requests.get('org_2')!.resolve({ data: [{ id: 'new' }], total_count: 1 });
      await settle();
      expect(r.data()).toEqual([{ id: 'new' }]);

      // The response for the previous key lands late; it must not replace the current data.
      requests.get('org_1')!.resolve({ data: [{ id: 'old' }], total_count: 1 });
      await settle();
      expect(r.data()).toEqual([{ id: 'new' }]);
    });

    it('ignores an older request for the same key once revalidate supersedes it', async () => {
      const t = createTestClerk();
      const calls: ReturnType<typeof deferred<any>>[] = [];
      const fetcher = vi.fn(() => {
        const d = deferred<any>();
        calls.push(d);
        return d.promise;
      });

      const r = t.renderHook(() =>
        usePagesOrInfinite(() => ({
          fetcher,
          config: {} as Config,
          keys: keys()
        }))
      );
      flush();
      const revalidated = r.revalidate();
      expect(calls).toHaveLength(2);

      calls[1].resolve({ data: [{ id: 'fresh' }], total_count: 1 });
      await revalidated;
      calls[0].resolve({ data: [{ id: 'stale' }], total_count: 1 });
      await settle();

      expect(r.data()).toEqual([{ id: 'fresh' }]);
    });

    it('exposes errors', async () => {
      const t = createTestClerk();
      const failure = new Error('nope');
      const r = t.renderHook(() =>
        usePagesOrInfinite(() => ({
          fetcher: () => Promise.reject(failure),
          config: {} as Config,
          keys: keys()
        }))
      );
      await settle();
      expect(r.error()).toBe(failure);
      expect(r.isError()).toBe(true);
      expect(r.isLoading()).toBe(false);
    });

    it('setData replaces the current page', async () => {
      const t = createTestClerk();
      const r = t.renderHook(() =>
        usePagesOrInfinite(() => ({
          fetcher: async () => pageOf(1, 10, 2),
          config: {} as Config,
          keys: keys()
        }))
      );
      await settle();

      await r.setData((current) => ({
        data: current!.data.slice(1),
        total_count: 1
      }));
      flush();
      expect(r.data()).toEqual([{ id: 'item_2' }]);
      expect(r.count()).toBe(1);
    });

    it('revalidate refetches every hook showing the same list', async () => {
      const t = createTestClerk();
      let total = 1;
      const fetcher = vi.fn(async () => pageOf(1, 10, total));

      const r = t.renderHook(() => ({
        a: usePagesOrInfinite(() => ({
          fetcher,
          config: {} as Config,
          keys: keys()
        })),
        b: usePagesOrInfinite(() => ({
          fetcher,
          config: {} as Config,
          keys: keys()
        }))
      }));
      await settle();
      // Both hooks share one cache entry and one request.
      expect(fetcher).toHaveBeenCalledTimes(1);

      total = 2;
      await r.a.revalidate();
      flush();
      expect(r.b.count()).toBe(2);
    });

    it('clears cached lists and resets the page on sign-out', async () => {
      const t = createTestClerk();
      const [signedIn, setSignedIn] = createSignal(true);
      const fetcher = vi.fn(async (p: Args) => pageOf(p.initialPage!, 1, 3));

      const r = t.renderHook(() =>
        usePagesOrInfinite(() => ({
          fetcher,
          config: { pageSize: 1, isSignedIn: signedIn() } as Config,
          keys: keys()
        }))
      );
      await settle();
      r.fetchNext();
      await settle();
      expect(r.page()).toBe(2);

      setSignedIn(false);
      flush();
      expect(r.page()).toBe(1);
      expect(r.data()).toEqual([]);

      setSignedIn(true);
      await settle();
      // The cache was dropped, so page 1 is fetched again.
      expect(fetcher).toHaveBeenCalledTimes(3);
    });
  });

  describe('infinite', () => {
    it('appends pages with fetchNext', async () => {
      const t = createTestClerk();
      const fetcher = vi.fn(async (p: Args) =>
        pageOf(p.initialPage!, p.pageSize!, 7)
      );

      const r = t.renderHook(() =>
        usePagesOrInfinite(() => ({
          fetcher,
          config: { infinite: true, pageSize: 3 } as Config,
          keys: keys()
        }))
      );
      expect(r.isLoading()).toBe(true);
      await settle();

      expect(r.data()).toHaveLength(3);
      expect(r.page()).toBe(1);
      expect(r.hasNextPage()).toBe(true);

      r.fetchNext();
      flush();
      expect(r.isFetching()).toBe(true);
      expect(r.isLoading()).toBe(false);
      await settle();
      expect(r.data()).toHaveLength(6);
      expect(r.page()).toBe(2);

      r.fetchNext();
      await settle();
      expect(
        r
          .data()
          .map((d) => d.id)
          .at(-1)
      ).toBe('item_7');
      expect(r.count()).toBe(7);
      expect(r.hasNextPage()).toBe(false);
      expect(r.hasPreviousPage()).toBe(false);

      // Nothing left to load.
      r.fetchNext();
      await settle();
      expect(fetcher).toHaveBeenCalledTimes(3);
      expect(fetcher.mock.calls.map(([p]) => p.initialPage)).toEqual([1, 2, 3]);
    });

    it('ignores fetchNext while a page is loading', async () => {
      const t = createTestClerk();
      const fetcher = vi.fn(async (p: Args) => pageOf(p.initialPage!, 2, 10));

      const r = t.renderHook(() =>
        usePagesOrInfinite(() => ({
          fetcher,
          config: { infinite: true, pageSize: 2 } as Config,
          keys: keys()
        }))
      );
      await settle();
      r.fetchNext();
      r.fetchNext();
      await settle();
      expect(fetcher).toHaveBeenCalledTimes(2);
      expect(r.page()).toBe(2);
    });

    it('revalidate refetches every loaded page', async () => {
      const t = createTestClerk();
      const fetcher = vi.fn(async (p: Args) => pageOf(p.initialPage!, 2, 10));

      const r = t.renderHook(() =>
        usePagesOrInfinite(() => ({
          fetcher,
          config: { infinite: true, pageSize: 2 } as Config,
          keys: keys()
        }))
      );
      await settle();
      r.fetchNext();
      await settle();
      fetcher.mockClear();

      await r.revalidate();
      flush();
      expect(fetcher.mock.calls.map(([p]) => p.initialPage)).toEqual([1, 2]);
      expect(r.data()).toHaveLength(4);
    });

    it('starts over when the cache keys change and drops stale pages', async () => {
      const t = createTestClerk();
      const [orgId, setOrgId] = createSignal('org_1');
      const slow = deferred<any>();
      const fetcher = vi.fn((p: Args) =>
        orgId() === 'org_1' && p.initialPage === 2
          ? slow.promise
          : Promise.resolve({
              data: [{ id: `${orgId()}_${p.initialPage}` }],
              total_count: 5
            })
      );

      const r = t.renderHook(() =>
        usePagesOrInfinite(() => ({
          fetcher,
          config: { infinite: true, pageSize: 1 } as Config,
          keys: keys({ orgId: orgId() })
        }))
      );
      await settle();
      r.fetchNext();
      flush();

      setOrgId('org_2');
      await settle();
      expect(r.data()).toEqual([{ id: 'org_2_1' }]);

      slow.resolve({ data: [{ id: 'org_1_2' }], total_count: 5 });
      await settle();
      expect(r.data()).toEqual([{ id: 'org_2_1' }]);
    });

    it('setData replaces the pages', async () => {
      const t = createTestClerk();
      const r = t.renderHook(() =>
        usePagesOrInfinite(() => ({
          fetcher: async (p: Args) => pageOf(p.initialPage!, 2, 4),
          config: { infinite: true, pageSize: 2 } as Config,
          keys: keys()
        }))
      );
      await settle();
      await (r.setData as any)(() => [{ data: [{ id: 'x' }], total_count: 1 }]);
      flush();
      expect(r.data()).toEqual([{ id: 'x' }]);
      expect(r.count()).toBe(1);
    });
  });
});
