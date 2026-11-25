export {
  /**
   * The main Clerk context provider. You must wrap your application in a `ClerkProvider` to enable Clerk features.
   *
   * If you render on the server (`@solidjs/vite-plugin` start mode), import from `clerk-solidjs/start` instead.
   *
   * @example
   * ```tsx
   * // App.tsx
   * import { ClerkProvider } from 'clerk-solidjs';
   *
   * const App = () => (
   *   <ClerkProvider publishableKey={import.meta.env.VITE_CLERK_PUBLISHABLE_KEY}>
   *     <Router>{routes}</Router>
   *   </ClerkProvider>
   * );
   * ```
   */
  ClerkProvider
} from './clerk';
