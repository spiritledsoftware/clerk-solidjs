import type { ClerkProviderProps, Ui } from '../../types';

/**
 * Props of the start `ClerkProvider`. Everything is optional except
 * `children`: values come from `clerkMiddleware` (through the request) and from
 * `VITE_CLERK_*` env vars, and props override both.
 */
export type StartClerkProviderProps<TUi extends Ui = Ui> = Omit<
  ClerkProviderProps<TUi>,
  'initialState'
>;
