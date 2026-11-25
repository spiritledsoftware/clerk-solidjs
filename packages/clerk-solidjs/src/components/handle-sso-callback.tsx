import type {
  SetActiveNavigate,
  SignInFutureResource,
  SignUpFutureResource
} from '@clerk/shared/types';
import type { JSX } from '@solidjs/web';
import { createEffect } from 'solid-js';
import { useClerkContext } from '../contexts/clerk-instance';
import { useAssertWrappedByClerkProvider } from '../hooks/use-assert-wrapped-by-clerk-provider';
import type { IsomorphicClerk } from '../isomorphic-clerk';

export interface HandleSSOCallbackProps {
  /**
   * Called when the SSO callback is complete and a session has been created.
   */
  navigateToApp: (...params: Parameters<SetActiveNavigate>) => void;
  /**
   * Called when a sign-in requires additional verification, or a sign-up is transfered to a sign-in that requires
   * additional verification. Also called when a Clerk Protect challenge fails during a sign-in, with the error
   * available on `errors` from `useSignIn()`.
   */
  navigateToSignIn: () => void;
  /**
   * Called when a sign-up needs more information, including when a sign-in is transferred to a sign-up that requires
   * additional verification. Also called when the sign-up failed at the SSO provider, with the error available on
   * `signUp.verifications.externalAccount.error` from `useSignUp()`, and when a Clerk Protect challenge fails during a
   * sign-up, with the error available on `errors` from `useSignUp()`.
   */
  navigateToSignUp: () => void;
}

/**
 * Use this component when building custom UI to handle the SSO callback and navigate to the appropriate page based on
 * the status of the sign-in or sign-up. It renders the captcha element Clerk may need while it works.
 *
 * @example
 * ```tsx
 * import { HandleSSOCallback } from 'clerk-solidjs';
 * import { useNavigate } from '@solidjs/router';
 *
 * export default function Page() {
 *   const navigate = useNavigate();
 *
 *   return (
 *     <HandleSSOCallback
 *       navigateToApp={({ session, decorateUrl }) => {
 *         const destination = decorateUrl(
 *           session?.currentTask ? `/onboarding/${session.currentTask.key}` : '/dashboard'
 *         );
 *         if (destination.startsWith('http')) {
 *           window.location.href = destination;
 *           return;
 *         }
 *         navigate(destination);
 *       }}
 *       navigateToSignIn={() => navigate('/sign-in')}
 *       navigateToSignUp={() => navigate('/sign-up')}
 *     />
 *   );
 * }
 * ```
 */
export function HandleSSOCallback(props: HandleSSOCallbackProps): JSX.Element {
  useAssertWrappedByClerkProvider('HandleSSOCallback');
  const ctx = useClerkContext('HandleSSOCallback');
  let hasRun = false;

  const run = async (instance: IsomorphicClerk) => {
    // The signal-based resources, read fresh at each step: the flow below mutates them.
    const signIn = (): SignInFutureResource =>
      instance.__internal_state.signInSignal().signIn as SignInFutureResource;
    const signUp = (): SignUpFutureResource =>
      instance.__internal_state.signUpSignal().signUp as SignUpFutureResource;
    const navigate = async (...params: Parameters<SetActiveNavigate>) => {
      props.navigateToApp(...params);
    };

    const intent = new URLSearchParams(window.location.search).get('intent');
    const flow =
      intent === 'signIn' || intent === 'signUp' ? intent : undefined;
    try {
      await instance.__internal_resolvePendingProtectCheck?.(flow);
    } catch {
      const failedSignUp = flow
        ? flow === 'signUp'
        : !signIn().protectCheck && !!signUp().protectCheck;
      return failedSignUp ? props.navigateToSignUp() : props.navigateToSignIn();
    }

    // If this was a sign-in, and it's complete, there's nothing else to do.
    if ((signIn().status as string) === 'complete') {
      await signIn().finalize({ navigate });
      return;
    }

    // If the sign-up used an existing account, transfer it to a sign-in.
    if (signUp().isTransferable) {
      await signIn().create({ transfer: true });
      if ((signIn().status as string) === 'complete') {
        await signIn().finalize({ navigate });
        return;
      }
      // The sign-in requires additional verification.
      return props.navigateToSignIn();
    }

    if (
      signIn().status === 'needs_first_factor' &&
      !signIn().supportedFirstFactors?.every(
        (f) => f.strategy === 'enterprise_sso'
      )
    ) {
      // The sign-in requires the use of a configured first factor.
      return props.navigateToSignIn();
    }

    // If the sign-in used an external account not associated with an existing user, create a sign-up.
    if (signIn().isTransferable) {
      await signUp().create({ transfer: true });
      if ((signUp().status as string) === 'complete') {
        await signUp().finalize({ navigate });
        return;
      }
      return props.navigateToSignUp();
    }

    if ((signUp().status as string) === 'complete') {
      await signUp().finalize({ navigate });
      return;
    }

    if (
      signIn().status === 'needs_second_factor' ||
      signIn().status === 'needs_new_password'
    ) {
      // The sign-in requires an MFA token or a new password.
      return props.navigateToSignIn();
    }

    // The external account was already associated with an existing user and active session on this
    // client, so activate the session and navigate to the application.
    const existingSessionId =
      signIn().existingSession?.sessionId ||
      signUp().existingSession?.sessionId;
    if (existingSessionId) {
      // Not the result of a sign-in or sign-up, so use `setActive` instead of `finalize`.
      await instance.setActive({
        session: existingSessionId,
        navigate: async (...params) => props.navigateToApp(...params)
      });
      return;
    }

    if (
      flow !== 'signIn' &&
      signUp().id &&
      signUp().status === 'missing_requirements' &&
      signUp().verifications.externalAccount.status
    ) {
      return props.navigateToSignUp();
    }
  };

  createEffect(
    () => ctx.status() !== 'loading' && ctx.clerk.loaded,
    (loaded) => {
      if (!loaded || hasRun) return;
      // Run once, even if the page re-renders during session activation.
      hasRun = true;
      void run(ctx.clerk);
    }
  );

  return (
    <div>
      {/* A sign-in transferred to a sign-up might require captcha verification. */}
      <div id="clerk-captcha" />
    </div>
  );
}
