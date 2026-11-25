import type { ClerkAPIResponseError } from '@clerk/shared/error';
import { eventMethodCalled } from '@clerk/shared/telemetry';
import type {
  GetOAuthConsentInfoParams,
  OAuthConsentInfo
} from '@clerk/shared/types';
import { type Accessor, createMemo } from 'solid-js';
import { useClerkContext } from '../contexts/clerk-instance';
import { useUserBase } from './base';
import { useClerkQuery } from './query/use-clerk-query';
import { useAssertWrappedByClerkProvider } from './use-assert-wrapped-by-clerk-provider';

const HOOK_NAME = 'useOAuthConsent';

/**
 * @interface
 */
export type UseOAuthConsentParams = Pick<
  GetOAuthConsentInfoParams,
  'oauthClientId' | 'scope' | 'redirectUri'
> & {
  /**
   * Keep the previous data until new data is fetched.
   *
   * @default true
   */
  keepPreviousData?: boolean;
  /**
   * If `true`, a request is triggered when the hook is mounted and the user is signed in.
   *
   * @default true
   */
  enabled?: boolean;
};

export type UseOAuthConsentReturn = {
  /** The consent screen metadata, or `undefined` before the first successful fetch. */
  data: Accessor<OAuthConsentInfo | undefined>;
  error: Accessor<ClerkAPIResponseError | null>;
  /** `true` while the initial fetch is in progress. */
  isLoading: Accessor<boolean>;
  /** `true` while any request is in flight, including background updates. */
  isFetching: Accessor<boolean>;
};

/**
 * Load OAuth application consent metadata for the signed-in user
 * (`GET /me/oauth/consent/{oauthClientId}`).
 *
 * @example
 * ```tsx
 * const consent = useOAuthConsent(() => ({
 *   oauthClientId: props.clientId,
 *   scope: props.scope
 * }));
 *
 * return <p>{consent.data()?.oauthApplicationName}</p>;
 * ```
 */
export function useOAuthConsent(
  params: Accessor<UseOAuthConsentParams>
): UseOAuthConsentReturn {
  useAssertWrappedByClerkProvider(HOOK_NAME);

  const ctx = useClerkContext(HOOK_NAME);
  const { clerk } = ctx;
  const user = useUserBase();

  clerk.telemetry?.record(eventMethodCalled(HOOK_NAME));

  const loaded = createMemo(() => {
    ctx.status();
    return clerk.loaded;
  });

  const query = useClerkQuery<OAuthConsentInfo>(() => {
    const {
      oauthClientId: rawClientId,
      scope,
      redirectUri,
      keepPreviousData = true,
      enabled = true
    } = params();
    const oauthClientId = (rawClientId ?? '').trim();
    const u = user();
    const queryEnabled = !!u && oauthClientId.length > 0 && enabled && loaded();
    return {
      key: {
        stableKey: 'oauthConsentInfo',
        authenticated: true,
        tracked: { userId: u?.id ?? null },
        args: {
          oauthClientId,
          ...(scope !== undefined && { scope }),
          ...(redirectUri !== undefined && { redirectUri })
        }
      },
      fn: () =>
        clerk.oauthApplication!.getConsentInfo({
          oauthClientId,
          scope,
          redirectUri
        }),
      enabled: queryEnabled,
      keepPreviousData: keepPreviousData && queryEnabled
    };
  });

  return {
    data: query.data,
    error: () => query.error() as ClerkAPIResponseError | null,
    isLoading: query.isLoading,
    isFetching: query.isFetching
  };
}
