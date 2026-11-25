import { cleanup, render, screen, waitFor } from '@solidjs/testing-library';
import type { JSX } from '@solidjs/web';
import '@testing-library/jest-dom/vitest';
import { createSignal, flush } from 'solid-js';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  APIKeys,
  CreateOrganization,
  GoogleOneTap,
  OAuthConsent,
  OAuthDeviceVerification,
  OrganizationList,
  OrganizationProfile,
  OrganizationSwitcher,
  PricingTable,
  SignIn,
  SignUp,
  TaskChooseOrganization,
  TaskResetPassword,
  TaskSetupMFA,
  UserAvatar,
  UserButton,
  UserProfile,
  Waitlist
} from '../ui-components';
import { createTestClerk, signedInResources } from './test-utils';

const settle = async () => {
  flush();
  await Promise.resolve();
  flush();
};

const mountMethods = [
  'mountSignIn',
  'mountSignUp',
  'mountUserProfile',
  'mountUserButton',
  'mountOrganizationProfile',
  'mountCreateOrganization',
  'mountOrganizationSwitcher',
  'mountOrganizationList',
  'mountWaitlist',
  'mountPricingTable',
  'mountAPIKeys',
  '__internal_mountOAuthConsent',
  '__internal_mountOAuthDeviceVerification',
  'mountUserAvatar',
  'mountTaskChooseOrganization',
  'mountTaskResetPassword',
  'mountTaskSetupMFA'
];

const createClerk = () => {
  const methods: Record<string, ReturnType<typeof vi.fn>> = {
    openGoogleOneTap: vi.fn(),
    closeGoogleOneTap: vi.fn(),
    __experimental_prefetchOrganizationSwitcher: vi.fn()
  };
  for (const mount of mountMethods) {
    methods[mount] = vi.fn();
    methods[mount.replace('mount', 'unmount')] = vi.fn();
  }
  return createTestClerk(methods);
};

afterEach(() => {
  cleanup();
});

describe('prebuilt components', () => {
  const cases: Array<
    [string, () => JSX.Element, string, Record<string, unknown>]
  > = [
    [
      'SignIn',
      () => <SignIn path="/sign-in" />,
      'mountSignIn',
      { path: '/sign-in' }
    ],
    [
      'SignUp',
      () => <SignUp path="/sign-up" />,
      'mountSignUp',
      { path: '/sign-up' }
    ],
    [
      'CreateOrganization',
      () => <CreateOrganization skipInvitationScreen />,
      'mountCreateOrganization',
      { skipInvitationScreen: true }
    ],
    [
      'OrganizationList',
      () => <OrganizationList hidePersonal />,
      'mountOrganizationList',
      { hidePersonal: true }
    ],
    [
      'Waitlist',
      () => <Waitlist signInUrl="/in" />,
      'mountWaitlist',
      { signInUrl: '/in' }
    ],
    [
      'PricingTable',
      () => <PricingTable for="organization" />,
      'mountPricingTable',
      { for: 'organization' }
    ],
    ['APIKeys', () => <APIKeys perPage={5} />, 'mountAPIKeys', { perPage: 5 }],
    [
      'OAuthConsent',
      () => <OAuthConsent scope="openid" />,
      '__internal_mountOAuthConsent',
      { scope: 'openid' }
    ],
    [
      'OAuthDeviceVerification',
      () => <OAuthDeviceVerification appearance={{}} />,
      '__internal_mountOAuthDeviceVerification',
      { appearance: {} }
    ],
    [
      'UserAvatar',
      () => <UserAvatar rounded />,
      'mountUserAvatar',
      { rounded: true }
    ],
    [
      'TaskChooseOrganization',
      () => <TaskChooseOrganization redirectUrlComplete="/done" />,
      'mountTaskChooseOrganization',
      { redirectUrlComplete: '/done' }
    ],
    [
      'TaskResetPassword',
      () => <TaskResetPassword redirectUrlComplete="/done" />,
      'mountTaskResetPassword',
      { redirectUrlComplete: '/done' }
    ],
    [
      'TaskSetupMFA',
      () => <TaskSetupMFA redirectUrlComplete="/done" />,
      'mountTaskSetupMFA',
      { redirectUrlComplete: '/done' }
    ]
  ];

  it.each(cases)(
    '<%s/> mounts once Clerk has loaded and unmounts on dispose',
    async (_name, Comp, method, expectedProps) => {
      const t = createClerk();
      const { unmount } = render(() => <t.Provider>{Comp()}</t.Provider>);
      await settle();
      expect(t.clerk[method]).not.toHaveBeenCalled();

      t.load(signedInResources());
      await settle();
      expect(t.clerk[method]).toHaveBeenCalledTimes(1);
      const [node, props] = t.clerk[method].mock.calls[0];
      expect(node).toBeInstanceOf(HTMLDivElement);
      expect(props).toEqual(expectedProps);

      unmount();
      expect(t.clerk[method.replace('mount', 'unmount')]).toHaveBeenCalledWith(
        node
      );
    }
  );

  it.each([
    ['UserProfile', () => <UserProfile />, 'mountUserProfile'],
    ['UserButton', () => <UserButton />, 'mountUserButton'],
    [
      'OrganizationProfile',
      () => <OrganizationProfile />,
      'mountOrganizationProfile'
    ],
    [
      'OrganizationSwitcher',
      () => <OrganizationSwitcher />,
      'mountOrganizationSwitcher'
    ]
  ])('<%s/> mounts with no custom pages', async (_name, Comp, method) => {
    const t = createClerk();
    t.load(signedInResources());
    render(() => <t.Provider>{Comp()}</t.Provider>);
    await settle();
    expect(t.clerk[method]).toHaveBeenCalledTimes(1);
  });

  it('<OrganizationSwitcher/> prefetches the organization list', async () => {
    const t = createClerk();
    t.load(signedInResources());
    render(() => (
      <t.Provider>
        <OrganizationSwitcher />
      </t.Provider>
    ));
    await settle();
    expect(
      t.clerk.__experimental_prefetchOrganizationSwitcher
    ).toHaveBeenCalled();
  });

  it('<GoogleOneTap/> opens and closes the modal', async () => {
    const t = createClerk();
    t.load(signedInResources());
    const { unmount } = render(() => (
      <t.Provider>
        <GoogleOneTap cancelOnTapOutside />
      </t.Provider>
    ));
    await settle();
    expect(t.clerk.openGoogleOneTap).toHaveBeenCalledWith({
      cancelOnTapOutside: true
    });
    unmount();
    expect(t.clerk.closeGoogleOneTap).toHaveBeenCalled();
  });

  it('passes prop changes to Clerk through __internal_updateProps', async () => {
    const t = createClerk();
    t.load(signedInResources());
    const [path, setPath] = createSignal('/a');
    render(() => (
      <t.Provider>
        <SignIn path={path()} />
      </t.Provider>
    ));
    await settle();
    expect(t.clerk.__internal_updateProps).not.toHaveBeenCalled();

    setPath('/b');
    await settle();
    expect(t.clerk.__internal_updateProps).toHaveBeenCalledWith({
      node: t.clerk.mountSignIn.mock.calls[0][0],
      props: { path: '/b' }
    });
  });

  it('shows the fallback until Clerk has rendered the component', async () => {
    const t = createClerk();
    render(() => (
      <t.Provider>
        <SignIn fallback={<p>Loading sign in</p>} />
      </t.Provider>
    ));
    await settle();
    expect(screen.getByText('Loading sign in')).toBeInTheDocument();

    t.load(signedInResources());
    await settle();
    const node: HTMLDivElement = t.clerk.mountSignIn.mock.calls[0][0];
    expect(node.style.display).toBe('none');
    expect(t.clerk.mountSignIn.mock.calls[0][1]).toEqual({});
    expect(screen.getByText('Loading sign in')).toBeInTheDocument();

    // Clerk renders into the root.
    node.appendChild(document.createElement('form'));
    await waitFor(() =>
      expect(screen.queryByText('Loading sign in')).not.toBeInTheDocument()
    );
    expect(node.style.display).toBe('');
  });

  it('<PricingTable/> waits for the ready status before hiding the fallback', async () => {
    const t = createClerk();
    t.load(signedInResources());
    render(() => (
      <t.Provider>
        <PricingTable fallback={<p>Loading plans</p>} />
      </t.Provider>
    ));
    await settle();
    const node: HTMLDivElement = t.clerk.mountPricingTable.mock.calls[0][0];

    node.appendChild(document.createElement('div'));
    await settle();
    expect(screen.getByText('Loading plans')).toBeInTheDocument();

    node.setAttribute('data-component-status', 'ready');
    node.appendChild(document.createElement('div'));
    await waitFor(() =>
      expect(screen.queryByText('Loading plans')).not.toBeInTheDocument()
    );
  });
});
