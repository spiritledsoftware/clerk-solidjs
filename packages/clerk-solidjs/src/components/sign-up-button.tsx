import type { SignUpProps } from '@clerk/shared/types';
import { omit } from 'solid-js';
import type { SignUpButtonProps, WithClerkProp } from '../types';
import { ClerkButton } from '../utils/children-utils';
import { withClerk } from './with-clerk';

export const SignUpButton = withClerk(
  (props: WithClerkProp<SignUpButtonProps>) => {
    const buttonProps = omit(
      props as WithClerkProp<SignUpButtonProps> & {
        appearance?: unknown;
        unsafeMetadata?: unknown;
      },
      'clerk',
      'component',
      'children',
      'appearance',
      'unsafeMetadata',
      'fallbackRedirectUrl',
      'forceRedirectUrl',
      'signInFallbackRedirectUrl',
      'signInForceRedirectUrl',
      'mode',
      'initialValues',
      'oauthFlow'
    );

    const clickHandler = () => {
      const opts: SignUpProps = {
        fallbackRedirectUrl: props.fallbackRedirectUrl,
        forceRedirectUrl: props.forceRedirectUrl,
        signInFallbackRedirectUrl: props.signInFallbackRedirectUrl,
        signInForceRedirectUrl: props.signInForceRedirectUrl,
        initialValues: props.initialValues,
        oauthFlow: props.oauthFlow
      };

      if (props.mode === 'modal') {
        return props.clerk().openSignUp({
          ...opts,
          appearance: props.appearance,
          unsafeMetadata: props.unsafeMetadata
        });
      }

      return props.clerk().redirectToSignUp({
        ...opts,
        signUpFallbackRedirectUrl: props.fallbackRedirectUrl,
        signUpForceRedirectUrl: props.forceRedirectUrl
      });
    };

    return (
      <ClerkButton
        name="SignUpButton"
        defaultText="Sign up"
        buttonProps={buttonProps}
        onActivate={clickHandler}
      >
        {props.children}
      </ClerkButton>
    );
  },
  { component: 'SignUpButton', renderWhileLoading: true }
);
