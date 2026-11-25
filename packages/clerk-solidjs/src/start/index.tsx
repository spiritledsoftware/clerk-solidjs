// The full client API (components, hooks, ...), so an SSR app can import
// everything from `clerk-solidjs/start`. The explicit export below replaces
// the base `ClerkProvider` from the star export.
export * from '../index';

export { ClerkProvider } from './client';
export type { StartClerkProviderProps } from './client';
export type { ClerkInitialState, RequestAuthFn } from './shared/state';
