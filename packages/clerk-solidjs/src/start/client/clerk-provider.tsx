import type { JSX } from '@solidjs/web';
import {
  getHydrationWriter,
  getRequestEvent,
  isServer,
  takeHydrationValue
} from '@solidjs/web';
import { isHydratable } from 'solid-js';

import { ClerkProvider as BaseClerkProvider } from '../../contexts/clerk';
import type { ClerkProviderProps, Ui } from '../../types';
import { CLERK_HYDRATION_KEY, type ClerkInitialState } from '../shared/state';
import type { StartClerkProviderProps } from './types';
import { useRouterNavigation } from './use-router-navigation';
import { mergeWithPublicEnvs, pickFromClerkInitState } from './utils';

/** Browser-side copy of the hydrated state; the hydration registry hands it out once. */
let hydratedState: ClerkInitialState | undefined;

/**
 * The Clerk state `clerkMiddleware` computed for this request.
 *
 * Transport: Solid's keyed hydration channel. On the server the state is read
 * from `getRequestEvent().locals` and written with
 * `getHydrationWriter().write(key, value)`; the browser takes it back with
 * `takeHydrationValue(key)` before and during hydration. The value travels in
 * Solid's own hydration script (serialized, CSP nonce applied, scoped to this
 * render), so it is available synchronously on the first client render, which
 * is what the initial auth state must be for the hydrated markup to match. A
 * hand-written `window.__clerk_init_state` script would need its own escaping
 * and nonce handling, and was previously only assigned after mount, too late
 * for hydration. An async memo (`ssrSource: "server"`) would also serialize,
 * but would make the provider suspend for a value that is already known.
 */
function readInitialState(): ClerkInitialState | undefined {
  if (isServer) {
    const state = getRequestEvent()?.locals.clerkInitialState;
    if (state && isHydratable()) {
      getHydrationWriter()?.write(CLERK_HYDRATION_KEY, state);
    }
    return state;
  }
  const taken = takeHydrationValue<ClerkInitialState>(CLERK_HYDRATION_KEY);
  if (taken?.status === 'resolved') {
    hydratedState = taken.value;
  }
  return hydratedState;
}

/**
 * The Clerk provider for server-rendered Solid apps (`@solidjs/vite-plugin`
 * start mode with `clerkMiddleware`). Render it once, inside the router.
 *
 * It renders the request's auth state on the server and hands it to the
 * browser for hydration, takes defaults from `clerkMiddleware` and
 * `VITE_CLERK_*` env vars, and navigates with Solid Router when it is inside one.
 *
 * @example
 * ```tsx
 * // src/App.tsx
 * import { createRouter } from '@solidjs/router';
 * import { ClerkProvider } from 'clerk-solidjs/start';
 *
 * const Router = createRouter({ routes });
 *
 * export default function App() {
 *   return (
 *     <Router>
 *       {(props) => <ClerkProvider>{props.children}</ClerkProvider>}
 *     </Router>
 *   );
 * }
 * ```
 */
export function ClerkProvider<TUi extends Ui = Ui>(
  props: StartClerkProviderProps<TUi>
): JSX.Element {
  const { clerkSsrState, options } = pickFromClerkInitState(
    readInitialState()?.__internal_clerk_state
  );
  const defaults = mergeWithPublicEnvs(options) as Partial<
    ClerkProviderProps<TUi>
  >;
  const navigation = useRouterNavigation();

  return (
    <BaseClerkProvider<TUi>
      {...defaults}
      routerPush={navigation?.push}
      routerReplace={navigation?.replace}
      {...props}
      initialState={clerkSsrState}
    />
  );
}
