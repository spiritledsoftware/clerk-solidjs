import type {
  APIKeysProps,
  CreateOrganizationProps,
  GoogleOneTapProps,
  LoadedClerk,
  OAuthConsentProps,
  OAuthDeviceVerificationProps,
  OrganizationListProps,
  OrganizationProfileProps,
  OrganizationSwitcherProps,
  PricingTableProps,
  SignInProps,
  SignUpProps,
  TaskChooseOrganizationProps,
  TaskResetPasswordProps,
  TaskSetupMFAProps,
  UserAvatarProps,
  UserButtonProps,
  UserProfileProps,
  WaitlistProps,
  Without
} from '@clerk/shared/types';
import type { JSX } from '@solidjs/web';
import {
  type Accessor,
  createContext,
  createSignal,
  omit,
  onSettled,
  type ParentProps,
  Show,
  useContext
} from 'solid-js';
import { useClerkContext } from '../contexts/clerk-instance';
import {
  organizationProfileLinkRenderedError,
  organizationProfilePageRenderedError,
  userButtonMenuActionRenderedError,
  userButtonMenuItemsRenderedError,
  userButtonMenuLinkRenderedError,
  userProfileLinkRenderedError,
  userProfilePageRenderedError
} from '../errors/messages';
import type {
  MountProps,
  OrganizationProfileLinkProps,
  OrganizationProfilePageProps,
  UserButtonActionProps,
  UserButtonLinkProps,
  UserProfileLinkProps,
  UserProfilePageProps,
  WithClerkProp
} from '../types';
import {
  createMarkerComponent,
  resolveCustomItemChildren,
  sanitizeChildren
} from '../utils/custom-items';
import { createUserButtonCustomMenuItems } from '../utils/custom-menu-items';
import {
  createOrganizationProfileCustomPages,
  createUserProfileCustomPages,
  hasJSXProp
} from '../utils/custom-pages';
import { useWaitForComponentMount } from '../utils/use-wait-for-component-mount';
import { ClerkHostRenderer } from './clerk-host-renderer';
import { withClerk } from './with-clerk';

type FallbackProp = {
  /**
   * The element to render while the component is mounting.
   */
  fallback?: JSX.Element;
};

type ClerkComponentFrameProps = {
  clerk: Accessor<LoadedClerk>;
  component?: string;
  /** Whether a `fallback` was passed (checked without rendering it). */
  hasFallback: boolean;
  fallback?: JSX.Element;
  /** Extra selector for the element whose children signal that the component is ready. */
  readySelector?: string;
  mount?: MountProps['mount'];
  unmount?: MountProps['unmount'];
  open?: (props: any) => void;
  close?: () => void;
  props: Record<string, any>;
  hideRootHtmlElement?: boolean;
  children?: JSX.Element;
};

/**
 * Shared shell of the prebuilt components: renders `fallback` until Clerk has loaded
 * and the component has rendered into its root, and mounts the component (or opens it,
 * for modal-only components) once Clerk has loaded.
 */
function ClerkComponentFrame(props: ClerkComponentFrameProps): JSX.Element {
  const status = useWaitForComponentMount(() => props.component, {
    selector: props.readySelector,
    enabled: () => props.hasFallback
  });
  const showFallback = () =>
    props.hasFallback && (status() === 'rendering' || !props.clerk().loaded);
  const rootProps = () =>
    showFallback() ? { style: { display: 'none' } } : undefined;
  const clerk = useIsomorphicClerk();
  const updateProps = (value: any) => clerk.__internal_updateProps(value);

  return (
    <>
      <Show when={showFallback()}>{props.fallback}</Show>
      <Show when={props.clerk().loaded}>
        <Show
          when={props.open !== undefined}
          fallback={
            <ClerkHostRenderer
              component={props.component}
              mount={props.mount!}
              unmount={props.unmount!}
              updateProps={updateProps}
              props={props.props}
              rootProps={rootProps()}
              hideRootHtmlElement={props.hideRootHtmlElement}
            >
              {props.children}
            </ClerkHostRenderer>
          }
        >
          <ClerkHostRenderer
            component={props.component}
            open={props.open!}
            close={props.close!}
            props={props.props}
            rootProps={rootProps()}
          />
        </Show>
      </Show>
    </>
  );
}

/**
 * The stable Clerk instance, for the mount/unmount/update methods. They are called from
 * settle and effect callbacks, where reading the tracking `props.clerk()` accessor would
 * be an untracked reactive read.
 */
const useIsomorphicClerk = () => useClerkContext().clerk;

const OWN_PROPS = ['clerk', 'component', 'fallback', 'children'] as const;

/** The props to hand to Clerk: everything but the ones this package consumes. */
const clerkProps = <T extends Record<string, any>>(props: T) =>
  omit(props, ...OWN_PROPS) as Record<string, any>;

export const SignIn = withClerk(
  (props: WithClerkProp<SignInProps & FallbackProp>) => {
    const clerk = useIsomorphicClerk();
    return (
      <ClerkComponentFrame
        clerk={props.clerk}
        component={props.component}
        hasFallback={hasJSXProp(props, 'fallback')}
        fallback={props.fallback}
        mount={clerk.mountSignIn}
        unmount={clerk.unmountSignIn}
        props={clerkProps(props)}
      />
    );
  },
  { component: 'SignIn', renderWhileLoading: true }
);

export const SignUp = withClerk(
  (props: WithClerkProp<SignUpProps & FallbackProp>) => {
    const clerk = useIsomorphicClerk();
    return (
      <ClerkComponentFrame
        clerk={props.clerk}
        component={props.component}
        hasFallback={hasJSXProp(props, 'fallback')}
        fallback={props.fallback}
        mount={clerk.mountSignUp}
        unmount={clerk.unmountSignUp}
        props={clerkProps(props)}
      />
    );
  },
  { component: 'SignUp', renderWhileLoading: true }
);

export const UserProfilePage = createMarkerComponent<
  ParentProps<UserProfilePageProps>
>('UserProfilePage', 'customPages', userProfilePageRenderedError);

export const UserProfileLink = createMarkerComponent<
  ParentProps<UserProfileLinkProps>
>('UserProfileLink', 'customPages', userProfileLinkRenderedError);

const _UserProfile = withClerk(
  (
    props: WithClerkProp<
      ParentProps<Without<UserProfileProps, 'customPages'>> & FallbackProp
    >
  ) => {
    const clerk = useIsomorphicClerk();
    const resolved = resolveCustomItemChildren(() => props.children);
    const customPages = createUserProfileCustomPages(() => resolved.toArray());

    return (
      <ClerkComponentFrame
        clerk={props.clerk}
        component={props.component}
        hasFallback={hasJSXProp(props, 'fallback')}
        fallback={props.fallback}
        mount={clerk.mountUserProfile}
        unmount={clerk.unmountUserProfile}
        props={{ ...clerkProps(props), customPages: customPages() }}
      />
    );
  },
  { component: 'UserProfile', renderWhileLoading: true }
);

type UserProfileExportType = typeof _UserProfile & {
  Page: typeof UserProfilePage;
  Link: typeof UserProfileLink;
};

export const UserProfile: UserProfileExportType = Object.assign(_UserProfile, {
  Page: UserProfilePage,
  Link: UserProfileLink
});

type OutletContextValue = {
  mount: MountProps['mount'];
  unmount: MountProps['unmount'];
  updateProps: MountProps['updateProps'];
  props: Accessor<Record<string, any>>;
  component?: string;
};

const noopOutletContext: OutletContextValue = {
  mount: () => {},
  unmount: () => {},
  updateProps: () => {},
  props: () => ({})
};

const UserButtonContext = createContext<OutletContextValue>(noopOutletContext);

/**
 * Renders an `<Outlet />`'s component. The outlet is created while its provider resolves
 * its children, before the provider's props exist, so mounting waits for the first settle.
 */
function OutletHost(props: {
  ctx: OutletContextValue;
  props: Record<string, any>;
}): JSX.Element {
  const [ready, setReady] = createSignal(false);
  onSettled(() => {
    setReady(true);
  });
  return (
    <Show when={ready()}>
      <ClerkHostRenderer
        component={props.ctx.component}
        mount={props.ctx.mount}
        unmount={props.ctx.unmount}
        updateProps={props.ctx.updateProps}
        props={{ ...props.ctx.props(), ...props.props }}
      />
    </Show>
  );
}

type UserButtonPropsWithoutCustomPages = Without<
  UserButtonProps,
  'userProfileProps' | '__experimental_asStandalone'
> & {
  userProfileProps?: Pick<
    UserProfileProps,
    'additionalOAuthScopes' | 'appearance' | 'apiKeysProps'
  >;
  /**
   * Adding `asProvider` will defer rendering until the `<Outlet />` component is mounted.
   *
   * @experimental This API is experimental and may change at any moment.
   * @default undefined
   */
  __experimental_asProvider?: boolean;
};

const _UserButton = withClerk(
  (
    props: WithClerkProp<
      ParentProps<UserButtonPropsWithoutCustomPages> & FallbackProp
    >
  ) => {
    const clerk = useIsomorphicClerk();
    const outlet: OutletContextValue = {
      mount: (node, value) => clerk.mountUserButton(node, value),
      unmount: (node) => clerk.unmountUserButton(node),
      updateProps: (value) => clerk.__internal_updateProps(value),
      props: () => buttonProps()
    };
    // The children are resolved here, so an `<Outlet />` among them needs the context
    // around the resolution rather than around the rendered output.
    const resolved = resolveCustomItemChildren(() => (
      <UserButtonContext value={outlet}>{props.children}</UserButtonContext>
    ));
    const allowForAnyChildren = () => ({
      allowForAnyChildren: !!props.__experimental_asProvider
    });
    const customPages = createUserProfileCustomPages(
      () => resolved.toArray(),
      allowForAnyChildren
    );
    const customMenuItems = createUserButtonCustomMenuItems(
      () => resolved.toArray(),
      allowForAnyChildren
    );

    const buttonProps = () => ({
      ...omit(clerkProps(props), '__experimental_asProvider'),
      userProfileProps: {
        ...props.userProfileProps,
        customPages: customPages()
      },
      customMenuItems: customMenuItems()
    });

    return (
      <>
        <ClerkComponentFrame
          clerk={props.clerk}
          component={props.component}
          hasFallback={hasJSXProp(props, 'fallback')}
          fallback={props.fallback}
          mount={clerk.mountUserButton}
          unmount={clerk.unmountUserButton}
          props={buttonProps()}
          hideRootHtmlElement={!!props.__experimental_asProvider}
        >
          {/* Mimics the behaviour before asProvider existed. */}
          <Show when={props.__experimental_asProvider}>
            {sanitizeChildren(resolved.toArray())}
          </Show>
        </ClerkComponentFrame>
      </>
    );
  },
  { component: 'UserButton', renderWhileLoading: true }
);

export const MenuItems = createMarkerComponent<ParentProps>(
  'MenuItems',
  'customPages',
  userButtonMenuItemsRenderedError
);

export const MenuAction = createMarkerComponent<
  ParentProps<UserButtonActionProps>
>('MenuAction', 'menuItems', userButtonMenuActionRenderedError);

export const MenuLink = createMarkerComponent<ParentProps<UserButtonLinkProps>>(
  'MenuLink',
  'menuItems',
  userButtonMenuLinkRenderedError
);

/**
 * Renders the `<UserButton />` configured by an ancestor `<UserButton __experimental_asProvider>`.
 *
 * @experimental This API is experimental and may change at any moment.
 */
export function UserButtonOutlet(
  outletProps: Without<UserButtonProps, 'userProfileProps'>
): JSX.Element {
  const ctx = useContext(UserButtonContext);
  return <OutletHost ctx={ctx} props={{ ...outletProps }} />;
}

type UserButtonExportType = typeof _UserButton & {
  UserProfilePage: typeof UserProfilePage;
  UserProfileLink: typeof UserProfileLink;
  MenuItems: typeof MenuItems;
  Action: typeof MenuAction;
  Link: typeof MenuLink;
  /**
   * The `<Outlet />` component can be used in conjunction with `asProvider` in order to control rendering
   * of the `<UserButton />` without affecting its configuration or any custom pages that could be mounted
   * @experimental This API is experimental and may change at any moment.
   */
  __experimental_Outlet: typeof UserButtonOutlet;
};

export const UserButton: UserButtonExportType = Object.assign(_UserButton, {
  UserProfilePage,
  UserProfileLink,
  MenuItems,
  Action: MenuAction,
  Link: MenuLink,
  __experimental_Outlet: UserButtonOutlet
});

export const OrganizationProfilePage = createMarkerComponent<
  ParentProps<OrganizationProfilePageProps>
>(
  'OrganizationProfilePage',
  'customPages',
  organizationProfilePageRenderedError
);

export const OrganizationProfileLink = createMarkerComponent<
  ParentProps<OrganizationProfileLinkProps>
>(
  'OrganizationProfileLink',
  'customPages',
  organizationProfileLinkRenderedError
);

const _OrganizationProfile = withClerk(
  (
    props: WithClerkProp<
      ParentProps<Without<OrganizationProfileProps, 'customPages'>> &
        FallbackProp
    >
  ) => {
    const clerk = useIsomorphicClerk();
    const resolved = resolveCustomItemChildren(() => props.children);
    const customPages = createOrganizationProfileCustomPages(() =>
      resolved.toArray()
    );

    return (
      <ClerkComponentFrame
        clerk={props.clerk}
        component={props.component}
        hasFallback={hasJSXProp(props, 'fallback')}
        fallback={props.fallback}
        mount={clerk.mountOrganizationProfile}
        unmount={clerk.unmountOrganizationProfile}
        props={{ ...clerkProps(props), customPages: customPages() }}
      />
    );
  },
  { component: 'OrganizationProfile', renderWhileLoading: true }
);

type OrganizationProfileExportType = typeof _OrganizationProfile & {
  Page: typeof OrganizationProfilePage;
  Link: typeof OrganizationProfileLink;
};

export const OrganizationProfile: OrganizationProfileExportType = Object.assign(
  _OrganizationProfile,
  {
    Page: OrganizationProfilePage,
    Link: OrganizationProfileLink
  }
);

export const CreateOrganization = withClerk(
  (props: WithClerkProp<CreateOrganizationProps & FallbackProp>) => {
    const clerk = useIsomorphicClerk();
    return (
      <ClerkComponentFrame
        clerk={props.clerk}
        component={props.component}
        hasFallback={hasJSXProp(props, 'fallback')}
        fallback={props.fallback}
        mount={clerk.mountCreateOrganization}
        unmount={clerk.unmountCreateOrganization}
        props={clerkProps(props)}
      />
    );
  },
  { component: 'CreateOrganization', renderWhileLoading: true }
);

const OrganizationSwitcherContext =
  createContext<OutletContextValue>(noopOutletContext);

type OrganizationSwitcherPropsWithoutCustomPages = Without<
  OrganizationSwitcherProps,
  'organizationProfileProps' | '__experimental_asStandalone'
> & {
  organizationProfileProps?: Pick<OrganizationProfileProps, 'appearance'>;
  /**
   * Adding `asProvider` will defer rendering until the `<Outlet />` component is mounted.
   *
   * @experimental This API is experimental and may change at any moment.
   * @default undefined
   */
  __experimental_asProvider?: boolean;
};

const _OrganizationSwitcher = withClerk(
  (
    props: WithClerkProp<
      ParentProps<OrganizationSwitcherPropsWithoutCustomPages> & FallbackProp
    >
  ) => {
    const clerk = useIsomorphicClerk();
    const outlet: OutletContextValue = {
      mount: (node, value) => clerk.mountOrganizationSwitcher(node, value),
      unmount: (node) => clerk.unmountOrganizationSwitcher(node),
      updateProps: (value) => clerk.__internal_updateProps(value),
      props: () => switcherProps(),
      get component() {
        return props.component;
      }
    };
    // See `<UserButton>`: the context must surround the resolution of the children.
    const resolved = resolveCustomItemChildren(() => (
      <OrganizationSwitcherContext value={outlet}>
        {props.children}
      </OrganizationSwitcherContext>
    ));
    const customPages = createOrganizationProfileCustomPages(
      () => resolved.toArray(),
      () => ({ allowForAnyChildren: !!props.__experimental_asProvider })
    );

    const switcherProps = () => ({
      ...omit(clerkProps(props), '__experimental_asProvider'),
      organizationProfileProps: {
        ...props.organizationProfileProps,
        customPages: customPages()
      }
    });

    // Prefetch the organization list.
    onSettled(() => {
      clerk.__experimental_prefetchOrganizationSwitcher();
    });

    return (
      <>
        <ClerkComponentFrame
          clerk={props.clerk}
          component={props.component}
          hasFallback={hasJSXProp(props, 'fallback')}
          fallback={props.fallback}
          mount={clerk.mountOrganizationSwitcher}
          unmount={clerk.unmountOrganizationSwitcher}
          props={switcherProps()}
          hideRootHtmlElement={!!props.__experimental_asProvider}
        >
          {/* Mimics the behaviour before asProvider existed. */}
          <Show when={props.__experimental_asProvider}>
            {sanitizeChildren(resolved.toArray())}
          </Show>
        </ClerkComponentFrame>
      </>
    );
  },
  { component: 'OrganizationSwitcher', renderWhileLoading: true }
);

/**
 * Renders the `<OrganizationSwitcher />` configured by an ancestor
 * `<OrganizationSwitcher __experimental_asProvider>`.
 *
 * @experimental This API is experimental and may change at any moment.
 */
export function OrganizationSwitcherOutlet(
  outletProps: Without<OrganizationSwitcherProps, 'organizationProfileProps'>
): JSX.Element {
  const ctx = useContext(OrganizationSwitcherContext);
  return <OutletHost ctx={ctx} props={{ ...outletProps }} />;
}

type OrganizationSwitcherExportType = typeof _OrganizationSwitcher & {
  OrganizationProfilePage: typeof OrganizationProfilePage;
  OrganizationProfileLink: typeof OrganizationProfileLink;
  /**
   * The `<Outlet />` component can be used in conjunction with `asProvider` in order to control rendering
   * of the `<OrganizationSwitcher />` without affecting its configuration or any custom pages that could be mounted
   *
   * @experimental This API is experimental and may change at any moment.
   */
  __experimental_Outlet: typeof OrganizationSwitcherOutlet;
};

export const OrganizationSwitcher: OrganizationSwitcherExportType =
  Object.assign(_OrganizationSwitcher, {
    OrganizationProfilePage,
    OrganizationProfileLink,
    __experimental_Outlet: OrganizationSwitcherOutlet
  });

export const OrganizationList = withClerk(
  (props: WithClerkProp<OrganizationListProps & FallbackProp>) => {
    const clerk = useIsomorphicClerk();
    return (
      <ClerkComponentFrame
        clerk={props.clerk}
        component={props.component}
        hasFallback={hasJSXProp(props, 'fallback')}
        fallback={props.fallback}
        mount={clerk.mountOrganizationList}
        unmount={clerk.unmountOrganizationList}
        props={clerkProps(props)}
      />
    );
  },
  { component: 'OrganizationList', renderWhileLoading: true }
);

export const GoogleOneTap = withClerk(
  (props: WithClerkProp<GoogleOneTapProps & FallbackProp>) => {
    const clerk = useIsomorphicClerk();
    return (
      <ClerkComponentFrame
        clerk={props.clerk}
        component={props.component}
        hasFallback={hasJSXProp(props, 'fallback')}
        fallback={props.fallback}
        open={clerk.openGoogleOneTap}
        close={clerk.closeGoogleOneTap}
        props={clerkProps(props)}
      />
    );
  },
  { component: 'GoogleOneTap', renderWhileLoading: true }
);

export const Waitlist = withClerk(
  (props: WithClerkProp<WaitlistProps & FallbackProp>) => {
    const clerk = useIsomorphicClerk();
    return (
      <ClerkComponentFrame
        clerk={props.clerk}
        component={props.component}
        hasFallback={hasJSXProp(props, 'fallback')}
        fallback={props.fallback}
        mount={clerk.mountWaitlist}
        unmount={clerk.unmountWaitlist}
        props={clerkProps(props)}
      />
    );
  },
  { component: 'Waitlist', renderWhileLoading: true }
);

export const PricingTable = withClerk(
  (props: WithClerkProp<PricingTableProps & FallbackProp>) => {
    const clerk = useIsomorphicClerk();
    return (
      <ClerkComponentFrame
        clerk={props.clerk}
        component={props.component}
        hasFallback={hasJSXProp(props, 'fallback')}
        fallback={props.fallback}
        // Added to the root once the plans have been fetched.
        readySelector='[data-component-status="ready"]'
        mount={clerk.mountPricingTable}
        unmount={clerk.unmountPricingTable}
        props={clerkProps(props)}
      />
    );
  },
  { component: 'PricingTable', renderWhileLoading: true }
);

/**
 * @experimental This component is in early access and may change in future releases.
 */
export const APIKeys = withClerk(
  (props: WithClerkProp<APIKeysProps & FallbackProp>) => {
    const clerk = useIsomorphicClerk();
    return (
      <ClerkComponentFrame
        clerk={props.clerk}
        component={props.component}
        hasFallback={hasJSXProp(props, 'fallback')}
        fallback={props.fallback}
        mount={clerk.mountAPIKeys}
        unmount={clerk.unmountAPIKeys}
        props={clerkProps(props)}
      />
    );
  },
  { component: 'ApiKeys', renderWhileLoading: true }
);

export const OAuthConsent = withClerk(
  (props: WithClerkProp<OAuthConsentProps & FallbackProp>) => {
    const clerk = useIsomorphicClerk();
    return (
      <ClerkComponentFrame
        clerk={props.clerk}
        component={props.component}
        hasFallback={hasJSXProp(props, 'fallback')}
        fallback={props.fallback}
        mount={clerk.__internal_mountOAuthConsent}
        unmount={clerk.__internal_unmountOAuthConsent}
        props={clerkProps(props)}
      />
    );
  },
  { component: 'OAuthConsent', renderWhileLoading: true }
);

/**
 * Renders the OAuth device verification flow for a signed-in user to authorize a device or app.
 *
 * @example
 * ```tsx
 * import { OAuthDeviceVerification } from 'clerk-solidjs';
 *
 * export default function DeviceVerificationPage() {
 *   return <OAuthDeviceVerification />;
 * }
 * ```
 */
export const OAuthDeviceVerification = withClerk(
  (props: WithClerkProp<OAuthDeviceVerificationProps & FallbackProp>) => {
    const clerk = useIsomorphicClerk();
    return (
      <ClerkComponentFrame
        clerk={props.clerk}
        component={props.component}
        hasFallback={hasJSXProp(props, 'fallback')}
        fallback={props.fallback}
        mount={clerk.__internal_mountOAuthDeviceVerification}
        unmount={clerk.__internal_unmountOAuthDeviceVerification}
        props={clerkProps(props)}
      />
    );
  },
  { component: 'OAuthDeviceVerification', renderWhileLoading: true }
);

export const UserAvatar = withClerk(
  (props: WithClerkProp<UserAvatarProps & FallbackProp>) => {
    const clerk = useIsomorphicClerk();
    return (
      <ClerkComponentFrame
        clerk={props.clerk}
        component={props.component}
        hasFallback={hasJSXProp(props, 'fallback')}
        fallback={props.fallback}
        mount={clerk.mountUserAvatar}
        unmount={clerk.unmountUserAvatar}
        props={clerkProps(props)}
      />
    );
  },
  { component: 'UserAvatar', renderWhileLoading: true }
);

export const TaskChooseOrganization = withClerk(
  (props: WithClerkProp<TaskChooseOrganizationProps & FallbackProp>) => {
    const clerk = useIsomorphicClerk();
    return (
      <ClerkComponentFrame
        clerk={props.clerk}
        component={props.component}
        hasFallback={hasJSXProp(props, 'fallback')}
        fallback={props.fallback}
        mount={clerk.mountTaskChooseOrganization}
        unmount={clerk.unmountTaskChooseOrganization}
        props={clerkProps(props)}
      />
    );
  },
  { component: 'TaskChooseOrganization', renderWhileLoading: true }
);

export const TaskResetPassword = withClerk(
  (props: WithClerkProp<TaskResetPasswordProps & FallbackProp>) => {
    const clerk = useIsomorphicClerk();
    return (
      <ClerkComponentFrame
        clerk={props.clerk}
        component={props.component}
        hasFallback={hasJSXProp(props, 'fallback')}
        fallback={props.fallback}
        mount={clerk.mountTaskResetPassword}
        unmount={clerk.unmountTaskResetPassword}
        props={clerkProps(props)}
      />
    );
  },
  { component: 'TaskResetPassword', renderWhileLoading: true }
);

export const TaskSetupMFA = withClerk(
  (props: WithClerkProp<TaskSetupMFAProps & FallbackProp>) => {
    const clerk = useIsomorphicClerk();
    return (
      <ClerkComponentFrame
        clerk={props.clerk}
        component={props.component}
        hasFallback={hasJSXProp(props, 'fallback')}
        fallback={props.fallback}
        mount={clerk.mountTaskSetupMFA}
        unmount={clerk.unmountTaskSetupMFA}
        props={clerkProps(props)}
      />
    );
  },
  { component: 'TaskSetupMFA', renderWhileLoading: true }
);
