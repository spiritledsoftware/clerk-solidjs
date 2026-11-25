import type {
  BillingPaymentMethodResource,
  BillingPaymentResource,
  BillingPlanResource,
  BillingStatementResource,
  GetPaymentAttemptsParams,
  GetPaymentMethodsParams,
  GetPlansParams,
  GetStatementsParams
} from '@clerk/shared/types';
import { createBillingPaginatedHook } from './create-billing-paginated-hook';

export type { BillingHookParams } from './create-billing-paginated-hook';

/**
 * Paginated billing Plans for users or Organizations. Works signed out.
 *
 * @experimental
 */
export const usePlans = createBillingPaginatedHook<
  BillingPlanResource,
  GetPlansParams
>({
  hookName: 'usePlans',
  resourceType: 'billing-plans',
  getFetcher: (payer, { clerk }) =>
    clerk.loaded && clerk.billing
      ? (params) => clerk.billing.getPlans({ ...params, for: payer })
      : undefined,
  options: { unauthenticated: true }
});

/**
 * Paginated payment attempts of the current user or Active Organization.
 *
 * @experimental
 */
export const usePaymentAttempts = createBillingPaginatedHook<
  BillingPaymentResource,
  GetPaymentAttemptsParams
>({
  hookName: 'usePaymentAttempts',
  resourceType: 'billing-payment-attempts',
  getFetcher: (_, { clerk }) =>
    clerk.loaded && clerk.billing
      ? (params) => clerk.billing.getPaymentAttempts(params)
      : undefined
});

/**
 * Paginated payment methods of the current user or Active Organization.
 *
 * @experimental
 */
export const usePaymentMethods = createBillingPaginatedHook<
  BillingPaymentMethodResource,
  GetPaymentMethodsParams
>({
  hookName: 'usePaymentMethods',
  resourceType: 'billing-payment-methods',
  getFetcher: (payer, { user, organization }) => {
    const resource = payer === 'organization' ? organization : user;
    return resource
      ? (params) => resource.getPaymentMethods(params)
      : undefined;
  }
});

/**
 * Paginated billing statements of the current user or Active Organization.
 *
 * @experimental
 */
export const useStatements = createBillingPaginatedHook<
  BillingStatementResource,
  GetStatementsParams
>({
  hookName: 'useStatements',
  resourceType: 'billing-statements',
  getFetcher: (_, { clerk }) =>
    clerk.loaded && clerk.billing
      ? (params) => clerk.billing.getStatements(params)
      : undefined
});

export type UsePlansReturn = ReturnType<typeof usePlans>;
export type UsePaymentAttemptsReturn = ReturnType<typeof usePaymentAttempts>;
export type UsePaymentMethodsReturn = ReturnType<typeof usePaymentMethods>;
export type UseStatementsReturn = ReturnType<typeof useStatements>;

export { CheckoutProvider, useCheckout } from './use-checkout';
export type { UseCheckoutOptions, UseCheckoutReturn } from './use-checkout';
export { useSubscription } from './use-subscription';
export type {
  UseSubscriptionParams,
  UseSubscriptionReturn
} from './use-subscription';
