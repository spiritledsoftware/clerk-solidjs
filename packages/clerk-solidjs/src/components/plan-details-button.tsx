import type { __internal_PlanDetailsProps } from '@clerk/shared/types';
import { omit } from 'solid-js';
import type { IsomorphicClerk } from '../isomorphic-clerk';
import type { PlanDetailsButtonProps, WithClerkProp } from '../types';
import { ClerkButton } from '../utils/children-utils';
import { withClerk } from './with-clerk';

/**
 * A button that opens the Clerk Plan Details drawer when clicked.
 *
 * @example
 * ```tsx
 * import { PlanDetailsButton } from 'clerk-solidjs/experimental';
 *
 * <PlanDetailsButton planId="plan_123">
 *   <button>View plan details</button>
 * </PlanDetailsButton>
 * ```
 *
 * @experimental This is an experimental API for the Billing feature that is available under a public beta, and the API is subject to change.
 */
export const PlanDetailsButton = withClerk(
  (props: WithClerkProp<PlanDetailsButtonProps>) => {
    const buttonProps = omit(
      props,
      'clerk',
      'component',
      'children',
      'plan',
      'planId',
      'initialPlanPeriod',
      'planDetailsProps'
    );

    const clickHandler = () =>
      (props.clerk() as unknown as IsomorphicClerk).__internal_openPlanDetails({
        plan: props.plan,
        planId: props.planId,
        initialPlanPeriod: props.initialPlanPeriod,
        ...props.planDetailsProps
      } as __internal_PlanDetailsProps);

    return (
      <ClerkButton
        name="PlanDetailsButton"
        defaultText="Plan details"
        buttonProps={buttonProps}
        onActivate={clickHandler}
      >
        {props.children}
      </ClerkButton>
    );
  },
  { component: 'PlanDetailsButton', renderWhileLoading: true }
);
