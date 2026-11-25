import { createMemo, omit } from 'solid-js';
import { useAuth } from '../hooks/use-auth';
import type { IsomorphicClerk } from '../isomorphic-clerk';
import type { SubscriptionDetailsButtonProps, WithClerkProp } from '../types';
import { ClerkButton } from '../utils/children-utils';
import { withClerk } from './with-clerk';

/**
 * A button that opens the Clerk Subscription Details drawer when clicked. Render it only
 * when the user is signed in (for example inside `<Show when="signed-in">`).
 *
 * @example
 * ```tsx
 * import { Show } from 'clerk-solidjs';
 * import { SubscriptionDetailsButton } from 'clerk-solidjs/experimental';
 *
 * <Show when="signed-in">
 *   <SubscriptionDetailsButton for="organization">
 *     <button>View organization subscription</button>
 *   </SubscriptionDetailsButton>
 * </Show>
 * ```
 *
 * @throws When rendered while the user is signed out.
 * @throws When `for="organization"` is used without an active organization.
 *
 * @experimental This is an experimental API for the Billing feature that is available under a public beta, and the API is subject to change.
 */
export const SubscriptionDetailsButton = withClerk(
  (props: WithClerkProp<SubscriptionDetailsButtonProps>) => {
    const buttonProps = omit(
      props,
      'clerk',
      'component',
      'children',
      'for',
      'subscriptionDetailsProps',
      'onSubscriptionCancel'
    );
    const { userId, orgId } = useAuth();

    const guard = createMemo(() => {
      if (userId() === null) {
        throw new Error(
          'Clerk: Ensure that `<SubscriptionDetailsButton />` is rendered only when the user is signed in (wrap with `<Show when="signed-in">` or guard with `useAuth()`).'
        );
      }
      if (orgId() === null && props.for === 'organization') {
        throw new Error(
          'Clerk: Wrap `<SubscriptionDetailsButton for="organization" />` with a check for an active organization. Retrieve `orgId` from `useAuth()` and confirm it is defined. For SSR, see: https://clerk.com/docs/reference/backend/types/auth-object#how-to-access-the-auth-object'
        );
      }
      return null;
    });

    const clickHandler = () =>
      (
        props.clerk() as unknown as IsomorphicClerk
      ).__internal_openSubscriptionDetails({
        for: props.for,
        onSubscriptionCancel: props.onSubscriptionCancel,
        ...props.subscriptionDetailsProps
      });

    return (
      <>
        {guard()}
        <ClerkButton
          name="SubscriptionDetailsButton"
          defaultText="Subscription details"
          buttonProps={buttonProps}
          onActivate={clickHandler}
        >
          {props.children}
        </ClerkButton>
      </>
    );
  },
  { component: 'SubscriptionDetailsButton', renderWhileLoading: true }
);
