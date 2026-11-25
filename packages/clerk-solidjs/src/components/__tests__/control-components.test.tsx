import { cleanup, render, screen } from '@solidjs/testing-library';
import '@testing-library/jest-dom/vitest';
import { flush } from 'solid-js';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  AuthenticateWithRedirectCallback,
  ClerkDegraded,
  ClerkFailed,
  ClerkLoaded,
  ClerkLoading,
  MultisessionAppSupport,
  RedirectToCreateOrganization,
  RedirectToOrganizationProfile,
  RedirectToSignIn,
  RedirectToSignUp,
  RedirectToTasks,
  RedirectToUserProfile,
  Show
} from '../control-components';
import {
  createTestClerk,
  signedInResources,
  signedOutResources
} from './test-utils';

vi.mock('@clerk/shared/deprecated', () => ({ deprecated: vi.fn() }));

const settle = async () => {
  flush();
  await Promise.resolve();
  flush();
};

afterEach(() => {
  cleanup();
});

describe('<ClerkLoaded/>, <ClerkLoading/>, <ClerkFailed/>, <ClerkDegraded/>', () => {
  const renderAll = () => {
    const t = createTestClerk();
    render(() => (
      <t.Provider>
        <ClerkLoaded>
          <p>loaded</p>
        </ClerkLoaded>
        <ClerkLoading>
          <p>loading</p>
        </ClerkLoading>
        <ClerkFailed>
          <p>failed</p>
        </ClerkFailed>
        <ClerkDegraded>
          <p>degraded</p>
        </ClerkDegraded>
      </t.Provider>
    ));
    return t;
  };

  it('follows the Clerk status', () => {
    const t = renderAll();
    expect(screen.queryByText('loading')).toBeInTheDocument();
    expect(screen.queryByText('loaded')).not.toBeInTheDocument();

    t.setStatus('ready');
    flush();
    expect(screen.queryByText('loaded')).toBeInTheDocument();
    expect(screen.queryByText('loading')).not.toBeInTheDocument();
    expect(screen.queryByText('degraded')).not.toBeInTheDocument();

    t.setStatus('degraded');
    flush();
    expect(screen.queryByText('loaded')).toBeInTheDocument();
    expect(screen.queryByText('degraded')).toBeInTheDocument();

    t.setStatus('error');
    flush();
    expect(screen.queryByText('failed')).toBeInTheDocument();
    expect(screen.queryByText('loaded')).not.toBeInTheDocument();
  });

  it('throws outside a <ClerkProvider>', () => {
    expect(() => render(() => <ClerkLoaded>x</ClerkLoaded>)).toThrow(
      /ClerkProvider/
    );
  });
});

describe('<Show/>', () => {
  const org = {
    id: 'org_1',
    role: 'org:admin',
    permissions: ['org:billing:manage']
  };

  it('renders nothing while auth is loading', () => {
    const t = createTestClerk();
    render(() => (
      <t.Provider>
        <Show when="signed-out" fallback={<p>fallback</p>}>
          <p>content</p>
        </Show>
      </t.Provider>
    ));
    expect(screen.queryByText('content')).not.toBeInTheDocument();
    expect(screen.queryByText('fallback')).not.toBeInTheDocument();
  });

  it('handles the signed-in and signed-out shorthands, and follows auth changes', () => {
    const t = createTestClerk();
    render(() => (
      <t.Provider>
        <Show when="signed-in" fallback={<p>in-fallback</p>}>
          <p>signed in</p>
        </Show>
        <Show when="signed-out">
          <p>signed out</p>
        </Show>
      </t.Provider>
    ));

    t.load(signedOutResources());
    flush();
    expect(screen.queryByText('signed out')).toBeInTheDocument();
    expect(screen.queryByText('in-fallback')).toBeInTheDocument();
    expect(screen.queryByText('signed in')).not.toBeInTheDocument();

    t.setResources(signedInResources());
    flush();
    expect(screen.queryByText('signed in')).toBeInTheDocument();
    expect(screen.queryByText('signed out')).not.toBeInTheDocument();
    expect(screen.queryByText('in-fallback')).not.toBeInTheDocument();
  });

  it('checks roles and permissions with `has`', () => {
    const t = createTestClerk();
    t.load(signedInResources({ org }));
    render(() => (
      <t.Provider>
        <Show when={{ role: 'org:admin' }}>
          <p>admin</p>
        </Show>
        <Show when={{ permission: 'org:billing:manage' }}>
          <p>billing</p>
        </Show>
        <Show when={{ role: 'org:member' }} fallback={<p>not member</p>}>
          <p>member</p>
        </Show>
      </t.Provider>
    ));
    expect(screen.queryByText('admin')).toBeInTheDocument();
    expect(screen.queryByText('billing')).toBeInTheDocument();
    expect(screen.queryByText('member')).not.toBeInTheDocument();
    expect(screen.queryByText('not member')).toBeInTheDocument();
  });

  it('passes `has` to a predicate', () => {
    const t = createTestClerk();
    t.load(signedInResources({ org }));
    const predicate = vi.fn((has: any) => has({ role: 'org:admin' }));
    render(() => (
      <t.Provider>
        <Show when={predicate}>
          <p>allowed</p>
        </Show>
      </t.Provider>
    ));
    expect(screen.queryByText('allowed')).toBeInTheDocument();
    expect(predicate).toHaveBeenCalledWith(expect.any(Function));
  });

  it('renders the fallback for authorization checks when signed out', () => {
    const t = createTestClerk();
    t.load(signedOutResources());
    const predicate = vi.fn(() => true);
    render(() => (
      <t.Provider>
        <Show when={predicate} fallback={<p>denied</p>}>
          <p>allowed</p>
        </Show>
      </t.Provider>
    ));
    expect(screen.queryByText('denied')).toBeInTheDocument();
    expect(predicate).not.toHaveBeenCalled();
  });

  it('treats pending sessions as signed out unless treatPendingAsSignedOut is false', () => {
    const t = createTestClerk();
    t.load(signedInResources({ sessionStatus: 'pending' }));
    render(() => (
      <t.Provider>
        <Show when="signed-in" fallback={<p>default: out</p>}>
          <p>default: in</p>
        </Show>
        <Show when="signed-in" treatPendingAsSignedOut={false}>
          <p>pending: in</p>
        </Show>
      </t.Provider>
    ));
    expect(screen.queryByText('default: out')).toBeInTheDocument();
    expect(screen.queryByText('pending: in')).toBeInTheDocument();
  });
});

describe('redirect components', () => {
  const redirectMethods = () => ({
    redirectToSignIn: vi.fn().mockResolvedValue(undefined),
    redirectToSignUp: vi.fn().mockResolvedValue(undefined),
    redirectToTasks: vi.fn().mockResolvedValue(undefined),
    redirectToUserProfile: vi.fn().mockResolvedValue(undefined),
    redirectToOrganizationProfile: vi.fn().mockResolvedValue(undefined),
    redirectToCreateOrganization: vi.fn().mockResolvedValue(undefined),
    redirectToAfterSignOut: vi.fn(),
    handleRedirectCallback: vi.fn().mockResolvedValue(undefined)
  });

  let t: ReturnType<typeof createTestClerk>;

  beforeEach(() => {
    t = createTestClerk(redirectMethods());
  });

  it('do nothing until Clerk has loaded, then redirect once', async () => {
    render(() => (
      <t.Provider>
        <RedirectToSignIn signInFallbackRedirectUrl="/after" />
      </t.Provider>
    ));
    await settle();
    expect(t.clerk.redirectToSignIn).not.toHaveBeenCalled();

    t.load(signedOutResources());
    await settle();
    expect(t.clerk.redirectToSignIn).toHaveBeenCalledTimes(1);
    expect(t.clerk.redirectToSignIn).toHaveBeenCalledWith({
      signInFallbackRedirectUrl: '/after'
    });

    t.setResources(signedOutResources());
    await settle();
    expect(t.clerk.redirectToSignIn).toHaveBeenCalledTimes(1);
  });

  it('<RedirectToSignIn/> redirects to after-sign-out when other sessions are signed in', async () => {
    t.load({
      ...signedOutResources(),
      client: { sessions: [], signedInSessions: [{ id: 'sess_2' }] }
    } as any);
    render(() => (
      <t.Provider>
        <RedirectToSignIn />
      </t.Provider>
    ));
    await settle();
    expect(t.clerk.redirectToAfterSignOut).toHaveBeenCalledTimes(1);
    expect(t.clerk.redirectToSignIn).not.toHaveBeenCalled();
  });

  it.each([
    [
      'RedirectToSignUp',
      () => <RedirectToSignUp signUpForceRedirectUrl="/x" />,
      'redirectToSignUp',
      { signUpForceRedirectUrl: '/x' }
    ],
    [
      'RedirectToTasks',
      () => <RedirectToTasks redirectUrl="/tasks-done" />,
      'redirectToTasks',
      { redirectUrl: '/tasks-done' }
    ],
    [
      'RedirectToUserProfile',
      () => <RedirectToUserProfile />,
      'redirectToUserProfile',
      undefined
    ],
    [
      'RedirectToOrganizationProfile',
      () => <RedirectToOrganizationProfile />,
      'redirectToOrganizationProfile',
      undefined
    ],
    [
      'RedirectToCreateOrganization',
      () => <RedirectToCreateOrganization />,
      'redirectToCreateOrganization',
      undefined
    ]
  ])('<%s/> calls clerk.%s', async (_name, Comp, method, args) => {
    t.load(signedOutResources());
    render(() => <t.Provider>{Comp()}</t.Provider>);
    await settle();
    expect(t.clerk[method as string]).toHaveBeenCalledTimes(1);
    if (args) {
      expect(t.clerk[method as string]).toHaveBeenCalledWith(args);
    }
  });
});

describe('<AuthenticateWithRedirectCallback />', () => {
  const unhandledRejections: unknown[] = [];
  const onUnhandledRejection = (reason: unknown) =>
    unhandledRejections.push(reason);

  beforeEach(() => {
    unhandledRejections.length = 0;
    process.on('unhandledRejection', onUnhandledRejection);
  });

  afterEach(() => {
    process.off('unhandledRejection', onUnhandledRejection);
  });

  it('passes its props to handleRedirectCallback on mount', async () => {
    const t = createTestClerk({
      handleRedirectCallback: vi.fn().mockResolvedValue(undefined)
    });
    t.load(signedOutResources());
    render(() => (
      <t.Provider>
        <AuthenticateWithRedirectCallback
          signInUrl="/sign-in"
          signUpUrl="/sign-up"
          signInForceRedirectUrl="/dashboard"
        />
      </t.Provider>
    ));
    await settle();

    expect(t.clerk.handleRedirectCallback).toHaveBeenCalledTimes(1);
    expect(t.clerk.handleRedirectCallback).toHaveBeenCalledWith({
      signInUrl: '/sign-in',
      signUpUrl: '/sign-up',
      signInForceRedirectUrl: '/dashboard'
    });
  });

  it('does not surface an unhandled rejection when handleRedirectCallback rejects', async () => {
    const calls: unknown[] = [];
    const t = createTestClerk({
      handleRedirectCallback: (params: unknown) => {
        calls.push(params);
        return Promise.reject(new Error('callback failed'));
      }
    });
    t.load(signedOutResources());
    render(() => (
      <t.Provider>
        <AuthenticateWithRedirectCallback />
      </t.Provider>
    ));
    await settle();
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(calls).toHaveLength(1);
    expect(unhandledRejections).toEqual([]);
  });
});

describe('<MultisessionAppSupport/>', () => {
  it('re-creates its children when the active session changes', () => {
    const t = createTestClerk();
    t.load(signedInResources({ sessionId: 'sess_1' }));
    let created = 0;
    const Child = () => {
      created++;
      return <p>child</p>;
    };
    render(() => (
      <t.Provider>
        <MultisessionAppSupport>
          <Child />
        </MultisessionAppSupport>
      </t.Provider>
    ));
    expect(screen.getByText('child')).toBeInTheDocument();
    expect(created).toBe(1);

    t.setResources(signedInResources({ sessionId: 'sess_1' }));
    flush();
    expect(created).toBe(1);

    t.setResources(signedInResources({ sessionId: 'sess_2' }));
    flush();
    expect(created).toBe(2);

    t.setResources(signedOutResources());
    flush();
    expect(created).toBe(3);
    expect(screen.getByText('child')).toBeInTheDocument();
  });
});
