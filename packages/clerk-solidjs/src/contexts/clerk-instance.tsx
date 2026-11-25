import type {
  ClerkStatus,
  InitialState,
  LoadedClerk,
  Resources
} from '@clerk/shared/types';
import { type Accessor, createContext, useContext } from 'solid-js';
import { errorThrower } from '../errors/error-thrower';
import type { IsomorphicClerk } from '../isomorphic-clerk';

/**
 * Everything a `<ClerkProvider>` shares with its subtree.
 *
 * The Clerk instance is a stable, mutable object. The accessors are the reactive
 * view of it: `status` follows the load lifecycle, `resources` is the last set of
 * resources Clerk emitted (or `undefined` before Clerk is operational), and
 * `initialState` is the server-rendered auth state used until then.
 *
 * @internal
 */
export type ClerkContextValue = {
  clerk: IsomorphicClerk;
  status: Accessor<ClerkStatus>;
  resources: Accessor<Resources | undefined>;
  initialState: Accessor<InitialState | undefined>;
};

/**
 * `null` outside a provider, so callers can check for a provider without throwing.
 *
 * @internal
 */
export const ClerkContext = createContext<ClerkContextValue | null>(null);

/**
 * @internal
 */
export function useClerkContext(source = 'useClerk'): ClerkContextValue {
  const ctx = useContext(ClerkContext);
  if (!ctx) {
    return errorThrower.throwMissingClerkProviderError({ source });
  }
  return ctx;
}

/**
 * An accessor for the Clerk instance. Reading it tracks Clerk's status and
 * resources, so `clerk().user` or `clerk().loaded` stay current inside JSX,
 * memos, and effect compute functions.
 *
 * @internal
 */
export function useClerkInstanceContext(
  source = 'useClerk'
): Accessor<LoadedClerk> {
  const ctx = useClerkContext(source);
  return () => {
    ctx.status();
    ctx.resources();
    return ctx.clerk as unknown as LoadedClerk;
  };
}

/**
 * Same as {@link useClerkInstanceContext}, typed as the isomorphic wrapper.
 *
 * @internal
 */
export function useIsomorphicClerkContext(
  source = 'useClerk'
): Accessor<IsomorphicClerk> {
  return useClerkInstanceContext(
    source
  ) as unknown as Accessor<IsomorphicClerk>;
}
