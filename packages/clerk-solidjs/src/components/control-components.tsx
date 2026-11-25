import { deprecated } from '@clerk/shared/deprecated';
import type {
  HandleOAuthCallbackParams,
  PendingSessionOptions,
  ShowWhenCondition
} from '@clerk/shared/types';
import type { JSX } from '@solidjs/web';
import {
  createMemo,
  Match,
  omit,
  onSettled,
  type ParentProps,
  Show as SolidShow,
  Switch
} from 'solid-js';
import {
  useClerkContext,
  useClerkInstanceContext
} from '../contexts/clerk-instance';
import { useSessionBase } from '../hooks/base';
import { useAssertWrappedByClerkProvider } from '../hooks/use-assert-wrapped-by-clerk-provider';
import { useAuth } from '../hooks/use-auth';
import type {
  RedirectToSignInProps,
  RedirectToSignUpProps,
  RedirectToTasksProps,
  WithClerkProp
} from '../types';
import { withClerk } from './with-clerk';

/**
 * Renders its children once Clerk has loaded (status `ready` or `degraded`).
 */
export const ClerkLoaded = (props: ParentProps): JSX.Element => {
  useAssertWrappedByClerkProvider('ClerkLoaded');
  const clerk = useClerkInstanceContext('ClerkLoaded');
  return <SolidShow when={clerk().loaded}>{props.children}</SolidShow>;
};

/**
 * Renders its children while Clerk is loading.
 */
export const ClerkLoading = (props: ParentProps): JSX.Element => {
  useAssertWrappedByClerkProvider('ClerkLoading');
  const { status } = useClerkContext('ClerkLoading');
  return <SolidShow when={status() === 'loading'}>{props.children}</SolidShow>;
};

/**
 * Renders its children when Clerk failed to load.
 */
export const ClerkFailed = (props: ParentProps): JSX.Element => {
  useAssertWrappedByClerkProvider('ClerkFailed');
  const { status } = useClerkContext('ClerkFailed');
  return <SolidShow when={status() === 'error'}>{props.children}</SolidShow>;
};

/**
 * Renders its children when Clerk loaded in a degraded state.
 */
export const ClerkDegraded = (props: ParentProps): JSX.Element => {
  useAssertWrappedByClerkProvider('ClerkDegraded');
  const { status } = useClerkContext('ClerkDegraded');
  return <SolidShow when={status() === 'degraded'}>{props.children}</SolidShow>;
};

export type ShowProps = ParentProps<
  {
    fallback?: JSX.Element;
    when: ShowWhenCondition;
  } & PendingSessionOptions
>;

/**
 * Use `<Show/>` to conditionally render content based on user authorization or sign-in state.
 * Renders nothing while auth is loading. Pending sessions are treated as signed out unless
 * `treatPendingAsSignedOut` is `false`.
 *
 * The `when` prop supports:
 * - `"signed-in"` or `"signed-out"` shorthands
 * - Authorization descriptors (e.g., `{ permission: "org:billing:manage" }`, `{ role: "admin" }`)
 * - A predicate function `(has) => boolean` that receives the `has` helper
 *
 * @example
 * ```tsx
 * <Show when={{ permission: "org:billing:manage" }} fallback={<p>Unauthorized</p>}>
 *   <BillingSettings />
 * </Show>
 *
 * <Show when={{ role: "admin" }}>
 *   <AdminPanel />
 * </Show>
 *
 * <Show when={(has) => has({ permission: "org:read" }) && isFeatureEnabled()}>
 *   <ProtectedFeature />
 * </Show>
 * ```
 */
export const Show = (props: ShowProps): JSX.Element => {
  useAssertWrappedByClerkProvider('Show');

  // `treatPendingAsSignedOut` is applied here rather than passed to `useAuth`, so the
  // prop stays reactive.
  const { has, isLoaded, userId, sessionStatus } = useAuth({
    treatPendingAsSignedOut: false
  });

  const effectiveUserId = () =>
    (props.treatPendingAsSignedOut ?? true) && sessionStatus() === 'pending'
      ? null
      : userId();

  const outcome = createMemo((): 'loading' | 'authorized' | 'unauthorized' => {
    if (!isLoaded()) {
      return 'loading';
    }
    const when = props.when;
    const signedIn = !!effectiveUserId();

    if (when === 'signed-out') {
      return signedIn ? 'unauthorized' : 'authorized';
    }
    if (!signedIn) {
      return 'unauthorized';
    }
    if (when === 'signed-in') {
      return 'authorized';
    }
    const authorized = typeof when === 'function' ? when(has) : has(when);
    return authorized ? 'authorized' : 'unauthorized';
  });

  return (
    <Switch>
      <Match when={outcome() === 'authorized'}>{props.children}</Match>
      <Match when={outcome() === 'unauthorized'}>{props.fallback}</Match>
    </Switch>
  );
};

/**
 * Props without the ones `withClerk` adds, as a plain object for a Clerk method call.
 */
const callProps = <T extends object>(props: WithClerkProp<T>): T =>
  ({ ...omit(props, 'clerk', 'component') }) as unknown as T;

export const RedirectToSignIn = withClerk(
  (props: WithClerkProp<RedirectToSignInProps>) => {
    const clerk = useClerkContext('RedirectToSignIn').clerk;
    onSettled(() => {
      const hasSignedInSessions =
        (clerk.client?.signedInSessions?.length ?? 0) > 0;
      if (clerk.session === null && hasSignedInSessions) {
        void clerk.redirectToAfterSignOut();
      } else {
        void clerk.redirectToSignIn(callProps(props));
      }
    });
    return null;
  },
  'RedirectToSignIn'
);

export const RedirectToSignUp = withClerk(
  (props: WithClerkProp<RedirectToSignUpProps>) => {
    const clerk = useClerkContext('RedirectToSignUp').clerk;
    onSettled(() => {
      void clerk.redirectToSignUp(callProps(props));
    });
    return null;
  },
  'RedirectToSignUp'
);

export const RedirectToTasks = withClerk(
  (props: WithClerkProp<RedirectToTasksProps>) => {
    const clerk = useClerkContext('RedirectToTasks').clerk;
    onSettled(() => {
      void clerk.redirectToTasks(callProps(props));
    });
    return null;
  },
  'RedirectToTasks'
);

/**
 * @deprecated Use [`redirectToUserProfile()`](https://clerk.com/docs/reference/objects/clerk#redirecttouserprofile) instead.
 */
export const RedirectToUserProfile = withClerk(() => {
  const clerk = useClerkContext('RedirectToUserProfile').clerk;
  onSettled(() => {
    deprecated(
      'RedirectToUserProfile',
      'Use the `redirectToUserProfile()` method instead.'
    );
    void clerk.redirectToUserProfile();
  });
  return null;
}, 'RedirectToUserProfile');

/**
 * @deprecated Use [`redirectToOrganizationProfile()`](https://clerk.com/docs/reference/objects/clerk#redirecttoorganizationprofile) instead.
 */
export const RedirectToOrganizationProfile = withClerk(() => {
  const clerk = useClerkContext('RedirectToOrganizationProfile').clerk;
  onSettled(() => {
    deprecated(
      'RedirectToOrganizationProfile',
      'Use the `redirectToOrganizationProfile()` method instead.'
    );
    void clerk.redirectToOrganizationProfile();
  });
  return null;
}, 'RedirectToOrganizationProfile');

/**
 * @deprecated Use [`redirectToCreateOrganization()`](https://clerk.com/docs/reference/objects/clerk#redirecttocreateorganization) instead.
 */
export const RedirectToCreateOrganization = withClerk(() => {
  const clerk = useClerkContext('RedirectToCreateOrganization').clerk;
  onSettled(() => {
    deprecated(
      'RedirectToCreateOrganization',
      'Use the `redirectToCreateOrganization()` method instead.'
    );
    void clerk.redirectToCreateOrganization();
  });
  return null;
}, 'RedirectToCreateOrganization');

export const AuthenticateWithRedirectCallback = withClerk(
  (props: WithClerkProp<HandleOAuthCallbackParams>) => {
    const clerk = useClerkContext('AuthenticateWithRedirectCallback').clerk;
    onSettled(() => {
      clerk.handleRedirectCallback(callProps(props)).catch(() => {});
    });
    return null;
  },
  'AuthenticateWithRedirectCallback'
);

/**
 * Re-creates its children whenever the active session changes, so per-session state
 * does not leak between sessions in multi-session apps.
 */
export const MultisessionAppSupport = (props: ParentProps): JSX.Element => {
  useAssertWrappedByClerkProvider('MultisessionAppSupport');
  const session = useSessionBase();
  const sessionKey = createMemo(() => session()?.id ?? 'no-users');
  return (
    // Keyed: a new session key disposes the old children and renders new ones.
    <SolidShow when={sessionKey()} keyed>
      {}
      {(_sessionKey) => props.children}
    </SolidShow>
  );
};
