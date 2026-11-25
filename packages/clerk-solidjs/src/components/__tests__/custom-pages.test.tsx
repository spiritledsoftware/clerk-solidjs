import { logErrorInDevMode } from '@clerk/shared/utils';
import { cleanup, render, screen } from '@solidjs/testing-library';
import '@testing-library/jest-dom/vitest';
import {
  createContext,
  createSignal,
  flush,
  onSettled,
  Show,
  useContext
} from 'solid-js';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  customLinkWrongProps,
  customMenuItemsIgnoredComponent,
  customPagesIgnoredComponent,
  customPageWrongProps,
  userButtonMenuActionRenderedError,
  userButtonMenuItemLinkWrongProps,
  userProfilePageRenderedError
} from '../../errors/messages';
import {
  OrganizationProfile,
  OrganizationSwitcher,
  UserButton,
  UserProfile
} from '../ui-components';
import { createTestClerk, signedInResources } from './test-utils';

vi.mock('@clerk/shared/utils', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@clerk/shared/utils')>()),
  logErrorInDevMode: vi.fn()
}));

const settle = async () => {
  flush();
  await Promise.resolve();
  flush();
};

const createClerk = () =>
  createTestClerk({
    mountUserProfile: vi.fn(),
    unmountUserProfile: vi.fn(),
    mountUserButton: vi.fn(),
    unmountUserButton: vi.fn(),
    mountOrganizationProfile: vi.fn(),
    unmountOrganizationProfile: vi.fn(),
    mountOrganizationSwitcher: vi.fn(),
    unmountOrganizationSwitcher: vi.fn(),
    __experimental_prefetchOrganizationSwitcher: vi.fn()
  });

/** The props of the last `method` call. */
const lastProps = (t: ReturnType<typeof createClerk>, method: string) =>
  t.clerk[method].mock.calls.at(-1)[1];

const Icon = (props: { name: string }) => <svg data-testid={props.name} />;

let t: ReturnType<typeof createClerk>;

beforeEach(() => {
  vi.mocked(logErrorInDevMode).mockClear();
  t = createClerk();
  t.load(signedInResources());
});

afterEach(() => {
  cleanup();
});

describe('custom pages', () => {
  it('turns <UserProfile.Page/> and <UserProfile.Link/> into customPages', async () => {
    render(() => (
      <t.Provider>
        <UserProfile>
          <UserProfile.Page label="account" />
          <UserProfile.Page
            label="Custom"
            url="custom"
            labelIcon={<Icon name="custom-icon" />}
          >
            <p>Custom page</p>
          </UserProfile.Page>
          <UserProfile.Link
            label="Home"
            url="/"
            labelIcon={<Icon name="home-icon" />}
          />
          <UserProfile.Page label="security" />
        </UserProfile>
      </t.Provider>
    ));
    await settle();

    const { customPages } = lastProps(t, 'mountUserProfile');
    expect(customPages).toEqual([
      { label: 'account' },
      {
        label: 'Custom',
        url: 'custom',
        mount: expect.any(Function),
        unmount: expect.any(Function),
        mountIcon: expect.any(Function),
        unmountIcon: expect.any(Function)
      },
      {
        label: 'Home',
        url: '/',
        mountIcon: expect.any(Function),
        unmountIcon: expect.any(Function)
      },
      { label: 'security' }
    ]);
    // Nothing is rendered until Clerk mounts the page.
    expect(screen.queryByText('Custom page')).not.toBeInTheDocument();
    expect(logErrorInDevMode).not.toHaveBeenCalled();
  });

  it('renders page content and icons into the elements Clerk mounts, and disposes them on unmount', async () => {
    const disposed = vi.fn();
    const Content = () => {
      onSettled(() => disposed);
      return <p>Custom page</p>;
    };
    render(() => (
      <t.Provider>
        <UserProfile>
          <UserProfile.Page
            label="Custom"
            url="custom"
            labelIcon={<Icon name="custom-icon" />}
          >
            <Content />
          </UserProfile.Page>
        </UserProfile>
      </t.Provider>
    ));
    await settle();
    const [page] = lastProps(t, 'mountUserProfile').customPages;

    const pageEl = document.createElement('div');
    const iconEl = document.createElement('div');
    document.body.append(pageEl, iconEl);
    page.mount(pageEl);
    page.mountIcon(iconEl);
    await settle();

    expect(pageEl).toHaveTextContent('Custom page');
    expect(iconEl.querySelector('[data-testid="custom-icon"]')).not.toBeNull();

    page.unmount(pageEl);
    page.unmountIcon(iconEl);
    await settle();
    expect(pageEl).toBeEmptyDOMElement();
    expect(iconEl).toBeEmptyDOMElement();
    expect(disposed).toHaveBeenCalledTimes(1);

    // Clerk can mount the same page again (e.g. navigating back to it).
    page.mount(pageEl);
    await settle();
    expect(pageEl).toHaveTextContent('Custom page');
    pageEl.remove();
    iconEl.remove();
  });

  it('gives page content the context of the component', async () => {
    const Theme = createContext('none');
    const Content = () => <p>theme: {useContext(Theme)}</p>;
    render(() => (
      <t.Provider>
        <Theme value="dark">
          <UserProfile>
            <UserProfile.Page
              label="Custom"
              url="custom"
              labelIcon={<Icon name="i" />}
            >
              <Content />
            </UserProfile.Page>
          </UserProfile>
        </Theme>
      </t.Provider>
    ));
    await settle();
    const [page] = lastProps(t, 'mountUserProfile').customPages;
    const el = document.createElement('div');
    page.mount(el);
    await settle();
    expect(el).toHaveTextContent('theme: dark');
  });

  it('keeps mounted page content reactive', async () => {
    const [count, setCount] = createSignal(0);
    render(() => (
      <t.Provider>
        <UserProfile>
          <UserProfile.Page
            label="Custom"
            url="custom"
            labelIcon={<Icon name="i" />}
          >
            <p>count: {count()}</p>
          </UserProfile.Page>
        </UserProfile>
      </t.Provider>
    ));
    await settle();
    const [page] = lastProps(t, 'mountUserProfile').customPages;
    const el = document.createElement('div');
    page.mount(el);
    await settle();
    expect(el).toHaveTextContent('count: 0');

    setCount(1);
    await settle();
    expect(el).toHaveTextContent('count: 1');
  });

  it('updates Clerk when pages are added or removed', async () => {
    const [showExtra, setShowExtra] = createSignal(false);
    render(() => (
      <t.Provider>
        <UserProfile>
          <UserProfile.Page label="account" />
          <Show when={showExtra()}>
            <UserProfile.Link
              label="Docs"
              url="/docs"
              labelIcon={<Icon name="d" />}
            />
          </Show>
        </UserProfile>
      </t.Provider>
    ));
    await settle();
    expect(lastProps(t, 'mountUserProfile').customPages).toHaveLength(1);

    setShowExtra(true);
    await settle();
    expect(t.clerk.__internal_updateProps).toHaveBeenCalledTimes(1);
    const [{ props }] = t.clerk.__internal_updateProps.mock.calls[0];
    expect(props.customPages.map((p: any) => p.label)).toEqual([
      'account',
      'Docs'
    ]);
    expect(logErrorInDevMode).not.toHaveBeenCalled();
  });

  it('ignores other children with a dev-mode error', async () => {
    render(() => (
      <t.Provider>
        <UserProfile>
          <p>not a page</p>
          <UserProfile.Page label="account" />
        </UserProfile>
      </t.Provider>
    ));
    await settle();
    expect(lastProps(t, 'mountUserProfile').customPages).toEqual([
      { label: 'account' }
    ]);
    expect(logErrorInDevMode).toHaveBeenCalledWith(
      customPagesIgnoredComponent('UserProfile')
    );
    expect(screen.queryByText('not a page')).not.toBeInTheDocument();
  });

  it('reports pages and links with missing props', async () => {
    render(() => (
      <t.Provider>
        <OrganizationProfile>
          {/* @ts-expect-error missing labelIcon */}
          <OrganizationProfile.Page label="No icon" url="no-icon">
            <p>content</p>
          </OrganizationProfile.Page>
          {/* @ts-expect-error missing url */}
          <OrganizationProfile.Link
            label="No url"
            labelIcon={<Icon name="x" />}
          />
        </OrganizationProfile>
      </t.Provider>
    ));
    await settle();
    expect(lastProps(t, 'mountOrganizationProfile').customPages).toEqual([]);
    expect(logErrorInDevMode).toHaveBeenCalledWith(
      customPageWrongProps('OrganizationProfile')
    );
    expect(logErrorInDevMode).toHaveBeenCalledWith(
      customLinkWrongProps('OrganizationProfile')
    );
  });

  it('logs an error and renders the children of a page outside its component', () => {
    render(() => (
      <UserProfile.Page label="Stray" url="stray" labelIcon={<Icon name="s" />}>
        <p>stray content</p>
      </UserProfile.Page>
    ));
    expect(logErrorInDevMode).toHaveBeenCalledWith(
      userProfilePageRenderedError
    );
    expect(screen.getByText('stray content')).toBeInTheDocument();
  });

  it('passes organization profile pages to <OrganizationSwitcher/>', async () => {
    render(() => (
      <t.Provider>
        <OrganizationSwitcher
          organizationProfileProps={{ appearance: { variables: {} } }}
        >
          <OrganizationSwitcher.OrganizationProfilePage label="members" />
          <OrganizationSwitcher.OrganizationProfileLink
            label="Home"
            url="/"
            labelIcon={<Icon name="h" />}
          />
        </OrganizationSwitcher>
      </t.Provider>
    ));
    await settle();
    const props = lastProps(t, 'mountOrganizationSwitcher');
    expect(props.organizationProfileProps).toEqual({
      appearance: { variables: {} },
      customPages: [
        { label: 'members' },
        {
          label: 'Home',
          url: '/',
          mountIcon: expect.any(Function),
          unmountIcon: expect.any(Function)
        }
      ]
    });
  });
});

describe('custom menu items', () => {
  it('turns <UserButton.MenuItems/> into customMenuItems and profile pages into userProfileProps', async () => {
    const onClick = vi.fn();
    render(() => (
      <t.Provider>
        <UserButton userProfileProps={{ additionalOAuthScopes: {} }}>
          <UserButton.MenuItems>
            <UserButton.Action label="signOut" />
            <UserButton.Action
              label="Help"
              labelIcon={<Icon name="help" />}
              onClick={onClick}
            />
            <UserButton.Action
              label="Open page"
              labelIcon={<Icon name="open" />}
              open="custom"
            />
            <UserButton.Link
              label="Docs"
              labelIcon={<Icon name="docs" />}
              href="https://clerk.com/docs"
            />
            <UserButton.Action label="manageAccount" />
          </UserButton.MenuItems>
          <UserButton.UserProfilePage
            label="Custom"
            url="custom"
            labelIcon={<Icon name="custom" />}
          >
            <p>Custom page</p>
          </UserButton.UserProfilePage>
        </UserButton>
      </t.Provider>
    ));
    await settle();

    const props = lastProps(t, 'mountUserButton');
    expect(props.customMenuItems).toEqual([
      { label: 'signOut' },
      {
        label: 'Help',
        onClick,
        mountIcon: expect.any(Function),
        unmountIcon: expect.any(Function)
      },
      {
        label: 'Open page',
        open: '/custom',
        mountIcon: expect.any(Function),
        unmountIcon: expect.any(Function)
      },
      {
        label: 'Docs',
        href: 'https://clerk.com/docs',
        mountIcon: expect.any(Function),
        unmountIcon: expect.any(Function)
      },
      { label: 'manageAccount' }
    ]);
    expect(props.userProfileProps.additionalOAuthScopes).toEqual({});
    expect(props.userProfileProps.customPages).toEqual([
      expect.objectContaining({ label: 'Custom', url: 'custom' })
    ]);
    expect(logErrorInDevMode).not.toHaveBeenCalled();

    const iconEl = document.createElement('div');
    props.customMenuItems[1].mountIcon(iconEl);
    await settle();
    expect(iconEl.querySelector('[data-testid="help"]')).not.toBeNull();
    props.customMenuItems[1].unmountIcon(iconEl);
    expect(iconEl).toBeEmptyDOMElement();
  });

  it('returns no menu items without children', async () => {
    render(() => (
      <t.Provider>
        <UserButton />
      </t.Provider>
    ));
    await settle();
    expect(lastProps(t, 'mountUserButton').customMenuItems).toEqual([]);
  });

  it('reports invalid menu items', async () => {
    render(() => (
      <t.Provider>
        <UserButton>
          <UserButton.MenuItems>
            <div>Invalid child</div>
            {/* @ts-expect-error missing href */}
            <UserButton.Link label="No href" labelIcon={<Icon name="x" />} />
          </UserButton.MenuItems>
        </UserButton>
      </t.Provider>
    ));
    await settle();
    expect(lastProps(t, 'mountUserButton').customMenuItems).toEqual([]);
    expect(logErrorInDevMode).toHaveBeenCalledWith(
      customMenuItemsIgnoredComponent
    );
    expect(logErrorInDevMode).toHaveBeenCalledWith(
      userButtonMenuItemLinkWrongProps
    );
  });

  it('logs an error for an action outside <UserButton.MenuItems/>', () => {
    render(() => (
      <t.Provider>
        <UserButton.Action
          label="Stray"
          labelIcon={<Icon name="s" />}
          onClick={() => {}}
        />
      </t.Provider>
    ));
    expect(logErrorInDevMode).toHaveBeenCalledWith(
      userButtonMenuActionRenderedError
    );
  });
});

describe('__experimental_asProvider', () => {
  it('renders the outlet with the configured props instead of the root', async () => {
    const { container } = render(() => (
      <t.Provider>
        <UserButton __experimental_asProvider showName>
          <UserButton.MenuItems>
            <UserButton.Action label="signOut" />
          </UserButton.MenuItems>
          <div class="wrapper">
            <UserButton.__experimental_Outlet appearance={{ variables: {} }} />
          </div>
        </UserButton>
      </t.Provider>
    ));
    await settle();

    expect(t.clerk.mountUserButton).toHaveBeenCalledTimes(1);
    const [node, props] = t.clerk.mountUserButton.mock.calls[0];
    expect(container.querySelector('.wrapper')?.contains(node)).toBe(true);
    expect(props).toEqual(
      expect.objectContaining({
        showName: true,
        appearance: { variables: {} },
        customMenuItems: [{ label: 'signOut' }]
      })
    );
    expect(logErrorInDevMode).not.toHaveBeenCalled();
  });
});
