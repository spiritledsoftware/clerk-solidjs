import type {
  BillingSubscriptionPlanPeriod,
  CheckoutErrors,
  CheckoutFlowResource,
  CheckoutSignalValue,
  ForPayerType
} from '@clerk/shared/types';
import type { JSX } from '@solidjs/web';
import {
  type Accessor,
  createContext,
  createEffect,
  createMemo,
  createSignal,
  omit,
  useContext
} from 'solid-js';
import { useClerkContext } from '../../contexts/clerk-instance';
import { useOrganizationBase, useUserBase } from '../base';
import { useAssertWrappedByClerkProvider } from '../use-assert-wrapped-by-clerk-provider';

/**
 * @interface
 */
export type UseCheckoutOptions = {
  /**
   * Check out for the current user or the Active Organization.
   *
   * @default 'user'
   */
  for?: ForPayerType;
  /** The billing period for the Plan. */
  planPeriod: BillingSubscriptionPlanPeriod;
  /** The ID of the Plan to check out (e.g. `cplan_xxx`). */
  planId: string;
  /** The total number of seats to check out for. */
  seatsQuantity?: number;
  /** A specific price ID, when not checking out the Plan's default price. */
  priceId?: string;
};

export type UseCheckoutReturn = {
  /** The checkout flow for the given Plan. */
  checkout: Accessor<CheckoutFlowResource>;
  /** Errors from the last request. */
  errors: Accessor<CheckoutErrors>;
  /** `'fetching'` while a request is in flight. */
  fetchStatus: Accessor<'idle' | 'fetching'>;
};

const CheckoutContext = createContext<Accessor<UseCheckoutOptions> | null>(
  null
);

/**
 * Provides checkout options to `useCheckout()` calls below it.
 *
 * @experimental
 */
export function CheckoutProvider(
  props: UseCheckoutOptions & { children?: JSX.Element }
): JSX.Element {
  const options = createMemo(
    () => ({ ...omit(props, 'children') }) as UseCheckoutOptions
  );
  return <CheckoutContext value={options}>{props.children}</CheckoutContext>;
}

/**
 * The checkout flow for a Plan, as Clerk signals exposed through accessors. Options come
 * from the argument or, without one, from the nearest `<CheckoutProvider>`.
 *
 * Throws (to the nearest `<Errored>`) when Clerk has loaded and no user is signed in, or
 * when checking out for an Organization without an Active Organization.
 *
 * @experimental
 *
 * @example
 * ```tsx
 * const { checkout, fetchStatus } = useCheckout(() => ({
 *   planId: 'cplan_123',
 *   planPeriod: 'month'
 * }));
 *
 * return (
 *   <button disabled={fetchStatus() === 'fetching'} onClick={() => checkout().start()}>
 *     Start checkout
 *   </button>
 * );
 * ```
 */
export function useCheckout(
  options?: Accessor<UseCheckoutOptions>
): UseCheckoutReturn {
  useAssertWrappedByClerkProvider('useCheckout');

  const contextOptions = useContext(CheckoutContext);
  const resolvedOptions = options ?? contextOptions;
  if (!resolvedOptions) {
    throw new Error(
      'Clerk: `useCheckout` requires options or a `<CheckoutProvider>` ancestor.'
    );
  }

  const ctx = useClerkContext('useCheckout');
  const { clerk } = ctx;
  const user = useUserBase();
  const organization = useOrganizationBase();

  const loaded = createMemo(() => {
    ctx.status();
    return clerk.loaded;
  });

  // Mirrors upstream's dependency list: a new flow for a new user, org, or option.
  const request = createMemo(
    () => {
      const o = resolvedOptions();
      const u = user();
      const org = organization();
      const isLoaded = u !== undefined;
      if (u === null && isLoaded) {
        throw new Error(
          'Clerk: Ensure that `useCheckout` is inside a component wrapped with `<Show when="signed-in" />`.'
        );
      }
      if (isLoaded && o.for === 'organization' && org === null) {
        throw new Error(
          'Clerk: Ensure your flow checks for an active organization. Retrieve `orgId` from `useAuth()` and confirm it is defined. For SSR, see: https://clerk.com/docs/reference/backend/types/auth-object#how-to-access-the-auth-object'
        );
      }
      return {
        params: {
          planId: o.planId,
          planPeriod: o.planPeriod,
          for: o.for,
          seatsQuantity: o.seatsQuantity,
          priceId: o.priceId
        },
        hash: JSON.stringify([
          u?.id,
          org?.id,
          o.planId,
          o.planPeriod,
          o.for,
          o.seatsQuantity,
          o.priceId
        ]),
        loaded: loaded()
      };
    },
    { equals: (a, b) => a.hash === b.hash && a.loaded === b.loaded }
  );

  const read = (params: ReturnType<typeof request>['params']) =>
    clerk.__experimental_checkout(params);

  const [version, bump] = createSignal(undefined, { equals: false });

  createEffect(
    () => request(),
    (req) => {
      if (!req.loaded) return;
      return clerk.__internal_state.__internal_effect(() => {
        read(req.params);
        bump();
      });
    }
  );

  const value = createMemo<CheckoutSignalValue>(
    () => {
      version();
      return read(request().params);
    },
    { equals: false }
  );

  return {
    checkout: () => value().checkout,
    errors: () => value().errors,
    fetchStatus: () => value().fetchStatus
  };
}
