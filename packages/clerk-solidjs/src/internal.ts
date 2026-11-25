import type { InternalClerkScriptProps } from '@clerk/shared/types';
import type { JSX } from '@solidjs/web';
import { OAuthConsent as OAuthConsentOriginal } from './components/ui-components';
import { ClerkProvider } from './contexts/clerk';
import { useOAuthConsent as useOAuthConsentOriginal } from './hooks/use-oauth-consent';
import type { ClerkProviderProps, Ui } from './types';

export { publishableKeyFromHost } from '@clerk/shared/keys';
export {
  buildClerkJSScriptAttributes,
  // Deprecated aliases - will be removed in a future major version
  buildClerkJsScriptAttributes,
  buildClerkUIScriptAttributes,
  clerkJSScriptUrl,
  clerkJsScriptUrl,
  clerkUIScriptUrl,
  setClerkJSLoadingErrorPackageName,
  setClerkJsLoadingErrorPackageName
} from '@clerk/shared/loadClerkJsScript';
export type { InternalClerkScriptProps } from '@clerk/shared/types';
export { MultisessionAppSupport } from './components/control-components';
export { setErrorThrowerOptions } from './errors/error-thrower';
export { useDerivedAuth } from './hooks/use-auth';
export { useRoutingProps } from './hooks/use-routing-props';
export type { Ui } from './types';

/**
 * @deprecated Import `useOAuthConsent` from `clerk-solidjs` instead.
 */
export const useOAuthConsent = useOAuthConsentOriginal;

/**
 * @deprecated Import `OAuthConsent` from `clerk-solidjs` instead.
 */
export const OAuthConsent = OAuthConsentOriginal;

/**
 * A wider-typed `ClerkProvider` that accepts internal script props.
 * Framework SDKs should use this instead of the public `ClerkProvider`.
 */
export const InternalClerkProvider = ClerkProvider as unknown as <
  TUi extends Ui = Ui
>(
  props: ClerkProviderProps<TUi> & InternalClerkScriptProps
) => JSX.Element;
