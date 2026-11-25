import { omit } from 'solid-js';
import type { SignInWithMetamaskButtonProps, WithClerkProp } from '../types';
import { ClerkButton } from '../utils/children-utils';
import { withClerk } from './with-clerk';

export const SignInWithMetamaskButton = withClerk(
  (props: WithClerkProp<SignInWithMetamaskButtonProps>) => {
    const buttonProps = omit(
      props,
      'clerk',
      'component',
      'children',
      'redirectUrl',
      'mode'
    );

    const clickHandler = () => {
      void props.clerk().authenticateWithMetamask({
        redirectUrl: props.redirectUrl || undefined
      });
    };

    return (
      <ClerkButton
        name="SignInWithMetamaskButton"
        defaultText="Sign in with Metamask"
        buttonProps={buttonProps}
        onActivate={clickHandler}
      >
        {props.children}
      </ClerkButton>
    );
  },
  { component: 'SignInWithMetamask', renderWhileLoading: true }
);
