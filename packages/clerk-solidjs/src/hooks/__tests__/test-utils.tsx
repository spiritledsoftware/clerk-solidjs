import type { ClerkStatus, Resources } from '@clerk/shared/types';
import { renderHook } from '@solidjs/testing-library';
import type { JSX } from '@solidjs/web';
import { createSignal, flush } from 'solid-js';
import {
  ClerkContext,
  type ClerkContextValue
} from '../../contexts/clerk-instance';

/**
 * A controllable Clerk context for hook tests: a plain object stands in for the
 * Clerk instance and `status` / `resources` are signals the test writes to.
 */
export function createTestClerk<C extends Record<string, any>>(
  clerkProps: C = {} as C,
  options: { status?: ClerkStatus; resources?: Partial<Resources> } = {}
) {
  const [status, setStatus] = createSignal<ClerkStatus>(
    options.status ?? 'ready'
  );
  const [resources, setResources] = createSignal<Resources | undefined>(
    options.resources as Resources | undefined,
    { equals: false }
  );

  const clerk = {
    telemetry: undefined,
    get loaded() {
      const s = status();
      return s === 'ready' || s === 'degraded';
    },
    get status() {
      return status();
    },
    get user() {
      return resources()?.user;
    },
    get organization() {
      return resources()?.organization;
    },
    get session() {
      return resources()?.session;
    }
  };
  // Copy descriptors so getters in `clerkProps` stay live.
  Object.defineProperties(clerk, Object.getOwnPropertyDescriptors(clerkProps));

  const value: ClerkContextValue = {
    clerk: clerk as any,
    status,
    resources: () => (clerk.loaded ? resources() : undefined),
    initialState: () => undefined
  };

  const Wrapper = (props: { children: JSX.Element }) => (
    <ClerkContext value={value}>{props.children}</ClerkContext>
  );

  return {
    clerk,
    value,
    Wrapper,
    setStatus: (next: ClerkStatus) => {
      setStatus(next);
      flush();
    },
    setResources: (next: Partial<Resources> | undefined) => {
      setResources(next as Resources | undefined);
      flush();
    },
    renderHook: <R,>(hook: () => R) =>
      renderHook(hook, { wrapper: Wrapper }).result
  };
}

/** Lets pending promise callbacks run, then flushes Solid's queue. */
export async function settle() {
  for (let i = 0; i < 5; i++) {
    await Promise.resolve();
  }
  flush();
}

/** A promise whose resolution the test controls. */
export function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

/** A `ClerkPaginatedResponse` for page `page` of `total` numbered items. */
export function pageOf(page: number, pageSize: number, total: number) {
  const start = (page - 1) * pageSize;
  const data = Array.from(
    { length: Math.max(0, Math.min(pageSize, total - start)) },
    (_, i) => ({ id: `item_${start + i + 1}` })
  );
  return { data, total_count: total };
}
