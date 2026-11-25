import type {
  CreateEmailLinkFlowReturn,
  EmailAddressResource,
  SignInResource,
  SignInStartEmailLinkFlowParams,
  SignUpResource,
  StartEmailLinkFlowParams
} from '@clerk/shared/types';
import { type Accessor, createEffect, createMemo } from 'solid-js';

type EmailLinkable = SignUpResource | EmailAddressResource | SignInResource;
type UseEmailLinkSignInReturn = CreateEmailLinkFlowReturn<
  SignInStartEmailLinkFlowParams,
  SignInResource
>;
type UseEmailLinkSignUpReturn = CreateEmailLinkFlowReturn<
  StartEmailLinkFlowParams,
  SignUpResource
>;
type UseEmailLinkEmailAddressReturn = CreateEmailLinkFlowReturn<
  StartEmailLinkFlowParams,
  EmailAddressResource
>;

/**
 * Start and cancel an email link flow for a sign-in, sign-up, or email address.
 * The flow follows the resource accessor and is cancelled when it changes or the owner disposes.
 */
function useEmailLink(
  resource: Accessor<SignInResource>
): UseEmailLinkSignInReturn;
function useEmailLink(
  resource: Accessor<SignUpResource>
): UseEmailLinkSignUpReturn;
function useEmailLink(
  resource: Accessor<EmailAddressResource>
): UseEmailLinkEmailAddressReturn;
function useEmailLink(
  resource: Accessor<EmailLinkable>
):
  | UseEmailLinkSignInReturn
  | UseEmailLinkSignUpReturn
  | UseEmailLinkEmailAddressReturn {
  const flow = createMemo(() => resource().createEmailLinkFlow());

  createEffect(
    () => flow(),
    (current) => () => current.cancelEmailLinkFlow()
  );

  return {
    startEmailLinkFlow: (params: any) =>
      (flow().startEmailLinkFlow as (p: any) => Promise<any>)(params),
    cancelEmailLinkFlow: () => flow().cancelEmailLinkFlow()
  } as UseEmailLinkSignInReturn;
}

export { useEmailLink };
