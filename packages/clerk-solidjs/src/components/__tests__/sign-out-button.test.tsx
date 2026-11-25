import { cleanup, render, screen, waitFor } from '@solidjs/testing-library';
import userEvent from '@testing-library/user-event';

import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi
} from 'vitest';
import { SignOutButton } from '../sign-out-button';

const mockSignOut = vi.fn();
const originalError = console.error;

const mockClerk = {
  signOut: mockSignOut
} as any;

vi.mock('../with-clerk', () => {
  return {
    withClerk: (Component: any) => (props: any) => {
      return <Component {...props} clerk={() => mockClerk} />;
    }
  };
});

const url = 'https://www.clerk.com';

describe('<SignOutButton />', () => {
  beforeAll(() => {
    console.error = vi.fn();
  });

  afterAll(() => {
    console.error = originalError;
  });

  beforeEach(() => {
    cleanup();
    mockSignOut.mockReset();
  });

  it('calls clerk.signOutOne when clicked', async () => {
    render(() => <SignOutButton />);
    const btn = screen.getByText('Sign out');
    userEvent.click(btn);
    await waitFor(() => {
      expect(mockSignOut).toHaveBeenCalled();
    });
  });

  it('handles redirectUrl prop', async () => {
    render(() => <SignOutButton redirectUrl={url} />);
    await userEvent.click(screen.getByText('Sign out'));
    await waitFor(() => {
      expect(mockSignOut).toHaveBeenCalledWith({ redirectUrl: url });
    });
  });

  it('handles sessionId prop', async () => {
    render(() => (
      <SignOutButton sessionId="sess_1yDceUR8SIKtQ0gIOO8fNsW7nhe" />
    ));
    await userEvent.click(screen.getByText('Sign out'));
    await waitFor(() => {
      expect(mockSignOut).toHaveBeenCalledWith({
        redirectUrl: '/',
        sessionId: 'sess_1yDceUR8SIKtQ0gIOO8fNsW7nhe'
      });
    });
  });

  it('handles signOutOptions prop', async () => {
    render(() => (
      <SignOutButton
        signOutOptions={{
          redirectUrl: url,
          sessionId: 'sess_1yDceUR8SIKtQ0gIOO8fNsW7nhe'
        }}
      />
    ));
    await userEvent.click(screen.getByText('Sign out'));
    await waitFor(() => {
      expect(mockSignOut).toHaveBeenCalledWith({
        redirectUrl: url,
        sessionId: 'sess_1yDceUR8SIKtQ0gIOO8fNsW7nhe'
      });
    });
  });

  it('calls clerk.signOut when its element child is clicked', async () => {
    const handler = vi.fn();
    render(() => (
      <SignOutButton>
        <button type="button" onClick={handler}>
          custom button
        </button>
      </SignOutButton>
    ));
    await userEvent.click(screen.getByText('custom button'));
    await waitFor(() => {
      expect(handler).toHaveBeenCalled();
      expect(mockSignOut).toHaveBeenCalled();
    });
  });

  it('uses text passed as children', async () => {
    render(() => <SignOutButton>text</SignOutButton>);
    screen.getByText('text');
  });

  it('throws if multiple children provided', async () => {
    expect(() => {
      render(() => (
        <SignOutButton>
          <button>1</button>
          <button>2</button>
        </SignOutButton>
      ));
    }).toThrow();
  });
});
