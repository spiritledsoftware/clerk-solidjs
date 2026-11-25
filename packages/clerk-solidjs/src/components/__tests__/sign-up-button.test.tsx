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
import { SignUpButton } from '../sign-up-button';

const mockRedirectToSignUp = vi.fn();
const mockOpenSignUp = vi.fn();
const originalError = console.error;

const mockClerk = {
  redirectToSignUp: mockRedirectToSignUp,
  openSignUp: mockOpenSignUp
} as any;

vi.mock('../with-clerk', () => {
  return {
    withClerk: (Component: any) => (props: any) => {
      return <Component {...props} clerk={() => mockClerk} />;
    }
  };
});

const url = 'https://www.clerk.com';

describe('<SignUpButton/>', () => {
  beforeAll(() => {
    console.error = vi.fn();
  });

  afterAll(() => {
    console.error = originalError;
  });

  beforeEach(() => {
    cleanup();
    mockRedirectToSignUp.mockReset();
    mockOpenSignUp.mockReset();
  });

  it('opens the sign-up modal with appearance and unsafeMetadata', async () => {
    const appearance = { elements: { rootBox: 'test' } };
    const unsafeMetadata = { plan: 'pro' };
    render(() => (
      <SignUpButton
        mode="modal"
        appearance={appearance}
        unsafeMetadata={unsafeMetadata}
        fallbackRedirectUrl={url}
        oauthFlow="popup"
      />
    ));
    await userEvent.click(screen.getByText('Sign up'));
    expect(mockOpenSignUp).toHaveBeenCalledWith(
      expect.objectContaining({
        appearance,
        unsafeMetadata,
        fallbackRedirectUrl: url,
        oauthFlow: 'popup'
      })
    );
    expect(mockRedirectToSignUp).not.toHaveBeenCalled();
  });

  it('does not pass unsafeMetadata or appearance to the child element', () => {
    const { container } = render(() => (
      <SignUpButton
        mode="modal"
        appearance={{ elements: { rootBox: 'test' } }}
        unsafeMetadata={{ plan: 'pro' }}
      >
        <button type="button">Sign up</button>
      </SignUpButton>
    ));
    const button = container.querySelector('button');
    expect(button?.hasAttribute('appearance')).toBe(false);
    expect(button?.hasAttribute('unsafeMetadata')).toBe(false);
  });

  it('calls clerk.redirectToSignUp when clicked', async () => {
    render(() => <SignUpButton />);
    const btn = screen.getByText('Sign up');
    userEvent.click(btn);
    await waitFor(() => {
      expect(mockRedirectToSignUp).toHaveBeenCalled();
    });
  });

  it('handles forceRedirectUrl prop', async () => {
    render(() => <SignUpButton forceRedirectUrl={url} />);
    const btn = screen.getByText('Sign up');
    userEvent.click(btn);
    await waitFor(() => {
      expect(mockRedirectToSignUp).toHaveBeenCalledWith({
        forceRedirectUrl: url,
        signUpForceRedirectUrl: url
      });
    });
  });

  it('handles fallbackRedirectUrl prop', async () => {
    render(() => <SignUpButton fallbackRedirectUrl={url} />);
    const btn = screen.getByText('Sign up');
    userEvent.click(btn);
    await waitFor(() => {
      expect(mockRedirectToSignUp).toHaveBeenCalledWith({
        fallbackRedirectUrl: url,
        signUpFallbackRedirectUrl: url
      });
    });
  });

  it('renders passed button and calls both click handlers', async () => {
    const handler = vi.fn();
    render(() => (
      <SignUpButton>
        <button onClick={handler}>custom button</button>
      </SignUpButton>
    ));
    const btn = screen.getByText('custom button');
    userEvent.click(btn);
    await waitFor(() => {
      expect(handler).toHaveBeenCalled();
      expect(mockRedirectToSignUp).toHaveBeenCalled();
    });
  });

  it('uses text passed as children', async () => {
    render(() => <SignUpButton>text</SignUpButton>);
    screen.getByText('text');
  });

  it('throws if multiple children provided', async () => {
    expect(() => {
      render(() => (
        <SignUpButton>
          <button>1</button>
          <button>2</button>
        </SignUpButton>
      ));
    }).toThrow();
  });
});
