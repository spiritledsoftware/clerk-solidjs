import type { SignInProps } from '@clerk/shared/types';
import { omit } from 'solid-js';
import type { SignInButtonProps, WithClerkProp } from '../types';
import { ClerkButton } from '../utils/children-utils';
import { withClerk } from './with-clerk';

export const SignInButton = withClerk(
  (props: WithClerkProp<SignInButtonProps>) => {
    const buttonProps = omit(
      props as WithClerkProp<SignInButtonProps> & { appearance?: unknown },
      'clerk',
      'component',
      'children',
      'appearance',
      'signUpFallbackRedirectUrl',
      'forceRedirectUrl',
      'fallbackRedirectUrl',
      'signUpForceRedirectUrl',
      'mode',
      'initialValues',
      'withSignUp',
      'oauthFlow'
    );

    const clickHandler = () => {
      const opts: SignInProps = {
        forceRedirectUrl: props.forceRedirectUrl,
        fallbackRedirectUrl: props.fallbackRedirectUrl,
        signUpFallbackRedirectUrl: props.signUpFallbackRedirectUrl,
        signUpForceRedirectUrl: props.signUpForceRedirectUrl,
        initialValues: props.initialValues,
        withSignUp: props.withSignUp,
        oauthFlow: props.oauthFlow
      };

      if (props.mode === 'modal') {
        return props.clerk().openSignIn({
          ...opts,
          appearance: props.appearance
        });
      }
      return props.clerk().redirectToSignIn({
        ...opts,
        signInFallbackRedirectUrl: props.fallbackRedirectUrl,
        signInForceRedirectUrl: props.forceRedirectUrl
      });
    };

    return (
      <ClerkButton
        name="SignInButton"
        defaultText="Sign in"
        buttonProps={buttonProps}
        onActivate={clickHandler}
      >
        {props.children}
      </ClerkButton>
    );
  },
  { component: 'SignInButton', renderWhileLoading: true }
);
