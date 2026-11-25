import { eventMethodCalled } from '@clerk/shared/telemetry';
import type {
  BillingSubscriptionResource,
  ForPayerType
} from '@clerk/shared/types';
import { type Accessor, createEffect, createMemo } from 'solid-js';
import { useClerkContext } from '../../contexts/clerk-instance';
import { useOrganizationBase, useUserBase } from '../base';
import { matchKeys } from '../query/query-cache';
import { useClerkQuery } from '../query/use-clerk-query';
import { useAssertWrappedByClerkProvider } from '../use-assert-wrapped-by-clerk-provider';
import { useBillingIsEnabled } from './use-billing-is-enabled';

const HOOK_NAME = 'useSubscription';
const STABLE_KEY = 'billing-subscription';

/**
 * @interface
 */
export type UseSubscriptionParams = {
  /**
   * Fetch the Subscription of the current user or the Active Organization.
   *
   * @default 'user'
   */
  for?: ForPayerType;
  /**
   * Keep the previous data until new data is fetched.
   *
   * @default false
   */
  keepPreviousData?: boolean;
  /**
   * If `true`, a request is triggered when the hook is mounted.
   *
   * @default true
   */
  enabled?: boolean;
};

export type UseSubscriptionReturn = {
  /** The Subscription: `undefined` before the first fetch, `null` if none exists. */
  data: Accessor<BillingSubscriptionResource | undefined | null>;
  error: Accessor<Error | undefined>;
  isLoading: Accessor<boolean>;
  isFetching: Accessor<boolean>;
  /** Refetch the Subscription. */
  revalidate: () => Promise<void>;
};

/**
 * The billing Subscription of the current user or Active Organization.
 *
 * @experimental
 */
export function useSubscription(
  params?: Accessor<UseSubscriptionParams | undefined>
): UseSubscriptionReturn {
  useAssertWrappedByClerkProvider(HOOK_NAME);

  const ctx = useClerkContext(HOOK_NAME);
  const { clerk } = ctx;
  const user = useUserBase();
  const organization = useOrganizationBase();
  const billingEnabled = useBillingIsEnabled(params);

  clerk.telemetry?.record(eventMethodCalled(HOOK_NAME));

  const tracked = createMemo(() => {
    const isOrganization = params?.()?.for === 'organization';
    return {
      userId: user()?.id,
      orgId: isOrganization ? organization()?.id : undefined
    };
  });

  const query = useClerkQuery<BillingSubscriptionResource | null>(() => {
    const { userId, orgId } = tracked();
    const enabled = !!(userId && billingEnabled());
    return {
      key: {
        stableKey: STABLE_KEY,
        authenticated: true,
        tracked: { userId, orgId },
        args: { orgId }
      },
      fn: () => clerk.billing!.getSubscription({ orgId }),
      enabled,
      keepPreviousData: (params?.()?.keepPreviousData ?? false) && enabled,
      staleTime: 60_000
    };
  });

  // Drop cached Subscriptions when the user signs out.
  const signedOut = createMemo(() => user() === null);
  createEffect(
    () => signedOut(),
    (isSignedOut, wasSignedOut) => {
      if (isSignedOut && wasSignedOut === false) {
        query.cache.remove(matchKeys([STABLE_KEY], undefined, true));
      }
    }
  );

  return {
    data: query.data,
    error: () => (query.error() as Error | null) ?? undefined,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    revalidate: async () => {
      const { userId, orgId } = tracked();
      await query.cache.invalidate(
        matchKeys([STABLE_KEY], { userId, orgId }, true)
      );
    }
  };
}
