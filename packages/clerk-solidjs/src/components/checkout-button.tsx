import { createMemo, omit } from 'solid-js';
import { useAuth } from '../hooks/use-auth';
import type { IsomorphicClerk } from '../isomorphic-clerk';
import type { CheckoutButtonProps, WithClerkProp } from '../types';
import { ClerkButton } from '../utils/children-utils';
import { withClerk } from './with-clerk';

/**
 * A button that opens the Clerk Checkout drawer when clicked. Render it only when the
 * user is signed in (for example inside `<Show when="signed-in">`).
 *
 * @example
 * ```tsx
 * import { Show } from 'clerk-solidjs';
 * import { CheckoutButton } from 'clerk-solidjs/experimental';
 *
 * <Show when="signed-in">
 *   <CheckoutButton planId="plan_123" planPeriod="month" for="organization">
 *     <button>Subscribe now</button>
 *   </CheckoutButton>
 * </Show>
 * ```
 *
 * @throws When rendered while the user is signed out.
 * @throws When `for="organization"` is used without an active organization.
 *
 * @experimental This is an experimental API for the Billing feature that is available under a public beta, and the API is subject to change.
 */
export const CheckoutButton = withClerk(
  (props: WithClerkProp<CheckoutButtonProps>) => {
    const buttonProps = omit(
      props,
      'clerk',
      'component',
      'children',
      'planId',
      'planPeriod',
      'seatsQuantity',
      'priceId',
      'for',
      'onSubscriptionComplete',
      'newSubscriptionRedirectUrl',
      'checkoutProps'
    );
    const { userId, orgId } = useAuth();

    const guard = createMemo(() => {
      if (userId() === null) {
        throw new Error(
          'Clerk: Ensure that `<CheckoutButton />` is rendered only when the user is signed in (wrap with `<Show when="signed-in">` or guard with `useAuth()`).'
        );
      }
      if (orgId() === null && props.for === 'organization') {
        throw new Error(
          'Clerk: Wrap `<CheckoutButton for="organization" />` with a check for an active organization. Retrieve `orgId` from `useAuth()` and confirm it is defined. For SSR, see: https://clerk.com/docs/reference/backend/types/auth-object#how-to-access-the-auth-object'
        );
      }
      return null;
    });

    const clickHandler = () =>
      (props.clerk() as unknown as IsomorphicClerk).__internal_openCheckout({
        planId: props.planId,
        planPeriod: props.planPeriod,
        seatsQuantity: props.seatsQuantity,
        priceId: props.priceId,
        for: props.for,
        onSubscriptionComplete: props.onSubscriptionComplete,
        newSubscriptionRedirectUrl: props.newSubscriptionRedirectUrl,
        ...props.checkoutProps
      });

    return (
      <>
        {guard()}
        <ClerkButton
          name="CheckoutButton"
          defaultText="Checkout"
          buttonProps={buttonProps}
          onActivate={clickHandler}
        >
          {props.children}
        </ClerkButton>
      </>
    );
  },
  { component: 'CheckoutButton', renderWhileLoading: true }
);
