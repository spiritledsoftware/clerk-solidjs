import { cleanup, render, screen, waitFor } from '@solidjs/testing-library';
import '@testing-library/jest-dom/vitest';
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
import { SignInButton } from '../sign-in-button';

const mockRedirectToSignIn = vi.fn();
const mockOpenSignIn = vi.fn();
const originalError = console.error;

const mockClerk = {
  redirectToSignIn: mockRedirectToSignIn,
  openSignIn: mockOpenSignIn
} as any;

vi.mock('../with-clerk', () => {
  return {
    withClerk: (Component: any) => (props: any) => {
      return <Component {...props} clerk={() => mockClerk} />;
    }
  };
});

const url = 'https://www.clerk.com';

describe('<SignInButton/>', () => {
  beforeAll(() => {
    console.error = vi.fn();
  });

  afterAll(() => {
    console.error = originalError;
  });

  beforeEach(() => {
    cleanup();
    mockRedirectToSignIn.mockReset();
    mockOpenSignIn.mockReset();
  });

  it('calls clerk.redirectToSignIn when clicked', async () => {
    render(() => <SignInButton />);
    const btn = screen.getByText('Sign in');
    await userEvent.click(btn);
    expect(mockRedirectToSignIn).toHaveBeenCalled();
  });

  it('handles forceRedirectUrl prop', async () => {
    render(() => <SignInButton forceRedirectUrl={url} />);

    const btn = screen.getByText('Sign in');
    await userEvent.click(btn);

    expect(mockRedirectToSignIn).toHaveBeenCalledWith({
      forceRedirectUrl: url,
      signInForceRedirectUrl: url
    });
  });

  it('handles fallbackRedirectUrl prop', async () => {
    render(() => <SignInButton fallbackRedirectUrl={url} />);

    const btn = screen.getByText('Sign in');
    await userEvent.click(btn);

    expect(mockRedirectToSignIn).toHaveBeenCalledWith({
      fallbackRedirectUrl: url,
      signInFallbackRedirectUrl: url
    });
  });

  it('renders passed button and calls both click handlers', async () => {
    const handler = vi.fn();

    render(() => (
      <SignInButton>
        <button onClick={handler} type="button">
          custom button
        </button>
      </SignInButton>
    ));

    const btn = screen.getByText('custom button');
    await userEvent.click(btn);

    expect(handler).toHaveBeenCalled();
    await waitFor(() => expect(mockRedirectToSignIn).toHaveBeenCalled());
  });

  it('renders an element child as is, without wrapping it in another button', () => {
    const { container } = render(() => (
      <SignInButton>
        <button type="button">custom button</button>
      </SignInButton>
    ));
    expect(container.querySelectorAll('button')).toHaveLength(1);
  });

  it('runs the child click handler before the Clerk action', async () => {
    const order: string[] = [];
    mockRedirectToSignIn.mockImplementation(() => order.push('clerk'));

    render(() => (
      <SignInButton>
        <a href="#sign-in" onClick={() => order.push('child')}>
          custom link
        </a>
      </SignInButton>
    ));
    await userEvent.click(screen.getByText('custom link'));

    await waitFor(() => expect(order).toEqual(['child', 'clerk']));
  });

  it('accepts a single child passed as an array', async () => {
    const handler = vi.fn();

    render(() => (
      <SignInButton>
        {[
          <button onClick={handler} type="button">
            custom button
          </button>
        ]}
      </SignInButton>
    ));

    await userEvent.click(screen.getByText('custom button'));

    expect(handler).toHaveBeenCalled();
    await waitFor(() => expect(mockRedirectToSignIn).toHaveBeenCalled());
  });

  it('applies HTML attributes to the default button', () => {
    render(() => <SignInButton class="my-button" />);
    expect(screen.getByText('Sign in')).toHaveClass('my-button');
  });

  it('opens the sign-in modal with the modal props', async () => {
    const appearance = { elements: { rootBox: 'test' } };
    render(() => (
      <SignInButton
        mode="modal"
        appearance={appearance}
        forceRedirectUrl={url}
        initialValues={{ emailAddress: 'a@b.c' }}
        withSignUp
      />
    ));

    await userEvent.click(screen.getByText('Sign in'));

    expect(mockOpenSignIn).toHaveBeenCalledWith(
      expect.objectContaining({
        appearance,
        forceRedirectUrl: url,
        initialValues: { emailAddress: 'a@b.c' },
        withSignUp: true
      })
    );
    expect(mockRedirectToSignIn).not.toHaveBeenCalled();
  });

  it('does not pass appearance prop to child element', () => {
    const { container } = render(() => (
      <SignInButton mode="modal" appearance={{ elements: { rootBox: 'test' } }}>
        <button type="button">Sign in</button>
      </SignInButton>
    ));

    const button = container.querySelector('button');
    expect(button?.hasAttribute('appearance')).toBe(false);
  });

  it('does not pass appearance prop to the default button', () => {
    const { container } = render(() => (
      <SignInButton
        mode="modal"
        appearance={{ elements: { rootBox: 'test' } }}
      />
    ));

    const button = container.querySelector('button');
    expect(button?.hasAttribute('appearance')).toBe(false);
  });

  it('uses text passed as children', async () => {
    render(() => <SignInButton>text</SignInButton>);
    screen.getByText('text');
  });

  it('throws if multiple children provided', () => {
    expect(() => {
      render(() => (
        <SignInButton>
          <button>1</button>
          <button>2</button>
        </SignInButton>
      ));
    }).toThrow();
  });
});
