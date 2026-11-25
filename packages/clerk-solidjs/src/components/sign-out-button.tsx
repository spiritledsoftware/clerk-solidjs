import { deprecated } from '@clerk/shared/deprecated';
import { omit } from 'solid-js';
import type { SignOutButtonProps, WithClerkProp } from '../types';
import { ClerkButton } from '../utils/children-utils';
import { withClerk } from './with-clerk';

export const SignOutButton = withClerk(
  (props: WithClerkProp<SignOutButtonProps>) => {
    const buttonProps = omit(
      props,
      'clerk',
      'component',
      'children',
      'redirectUrl',
      'sessionId',
      'signOutOptions'
    );

    const clickHandler = () => {
      const signOutOptions = props.signOutOptions;
      if (signOutOptions) {
        deprecated(
          'SignOutButton `signOutOptions`',
          'Use the `redirectUrl` and `sessionId` props directly instead.'
        );
      }
      const sessionId = props.sessionId;
      return props.clerk().signOut({
        redirectUrl: props.redirectUrl ?? '/',
        ...(sessionId !== undefined && { sessionId }),
        ...signOutOptions
      });
    };

    return (
      <ClerkButton
        name="SignOutButton"
        defaultText="Sign out"
        buttonProps={buttonProps}
        onActivate={clickHandler}
      >
        {props.children}
      </ClerkButton>
    );
  },
  { component: 'SignOutButton', renderWhileLoading: true }
);
