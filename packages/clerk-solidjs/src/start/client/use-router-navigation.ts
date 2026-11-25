import {
  useInRouter,
  useIsRouting,
  useLocation,
  useNavigate
} from '@solidjs/router';
import { createEffect, onCleanup } from 'solid-js';

type RouterNavigate = (to: string) => Promise<void>;

/**
 * `routerPush` / `routerReplace` for Clerk, backed by Solid Router 2. Each
 * returns a promise that resolves once the router has committed the new
 * location, which is what Clerk awaits before continuing a flow. Returns
 * `undefined` outside a router, so Clerk falls back to full-page navigation.
 *
 * @internal
 */
export function useRouterNavigation():
  | { push: RouterNavigate; replace: RouterNavigate }
  | undefined {
  if (!useInRouter()) {
    return undefined;
  }

  const navigate = useNavigate();
  const location = useLocation();
  const isRouting = useIsRouting();
  const pending: Array<() => void> = [];
  const flush = () => pending.splice(0).forEach((resolve) => resolve());

  createEffect(
    () => ({
      href: location.pathname + location.search + location.hash,
      routing: isRouting()
    }),
    ({ routing }) => {
      if (!routing) flush();
    },
    { defer: true }
  );
  onCleanup(flush);

  const go = (to: string, replace: boolean) =>
    new Promise<void>((resolve) => {
      const current = new URL(window.location.href);
      const target = new URL(to, current);
      if (target.origin !== current.origin) {
        // Not a router destination (e.g. the Account Portal).
        if (replace) window.location.replace(target.href);
        else window.location.assign(target.href);
        resolve();
        return;
      }
      if (target.href === current.href) {
        resolve();
        return;
      }
      pending.push(resolve);
      // The path is already absolute (base included), so skip route resolution.
      navigate(target.pathname + target.search + target.hash, {
        replace,
        resolve: false
      });
    });

  return {
    push: (to) => go(to, false),
    replace: (to) => go(to, true)
  };
}
