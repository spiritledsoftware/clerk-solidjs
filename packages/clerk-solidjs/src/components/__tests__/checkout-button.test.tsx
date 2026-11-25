import { cleanup, render, screen, waitFor } from '@solidjs/testing-library';
import '@testing-library/jest-dom/vitest';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useAuth } from '../../hooks/use-auth';
import { CheckoutButton } from '../checkout-button';

vi.mock('../../hooks/use-auth', () => ({
  useAuth: vi.fn()
}));

const mockOpenCheckout = vi.fn();

const mockClerk = {
  __internal_openCheckout: mockOpenCheckout
};

vi.mock('../with-clerk', () => {
  return {
    withClerk: (Component: any) => (props: any) => {
      return <Component {...props} clerk={() => mockClerk} />;
    }
  };
});

const mockAuth = (userId: string | null, orgId: string | null) =>
  (useAuth as any).mockReturnValue({
    userId: () => userId,
    orgId: () => orgId
  });

describe('<CheckoutButton/>', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  describe('Authentication Validation', () => {
    it('throws error when rendered without authenticated user', () => {
      mockAuth(null, null);
      expect(() => render(() => <CheckoutButton planId="test_plan" />)).toThrow(
        'Ensure that `<CheckoutButton />` is rendered only when the user is signed in (wrap with `<Show when="signed-in">` or guard with `useAuth()`).'
      );
    });

    it('throws error when using org subscriber type without active organization', () => {
      mockAuth('user_123', null);
      expect(() =>
        render(() => <CheckoutButton planId="test_plan" for="organization" />)
      ).toThrow(
        'Wrap `<CheckoutButton for="organization" />` with a check for an active organization. Retrieve `orgId` from `useAuth()` and confirm it is defined.'
      );
    });

    it('renders successfully with authenticated user', () => {
      mockAuth('user_123', null);
      expect(() =>
        render(() => <CheckoutButton planId="test_plan" />)
      ).not.toThrow();
    });

    it('renders successfully with org subscriber type when organization is active', () => {
      mockAuth('user_123', 'org_123');
      expect(() =>
        render(() => <CheckoutButton planId="test_plan" for="organization" />)
      ).not.toThrow();
    });
  });

  describe('Event Handling', () => {
    beforeEach(() => {
      mockAuth('user_123', null);
    });

    it('calls clerk.__internal_openCheckout with correct props when clicked', async () => {
      const props = {
        planId: 'test_plan',
        planPeriod: 'month' as const,
        seatsQuantity: 7,
        onSubscriptionComplete: vi.fn(),
        newSubscriptionRedirectUrl: '/success',
        checkoutProps: {
          appearance: {},
          onClose: vi.fn()
        }
      };

      render(() => <CheckoutButton {...props} />);
      await userEvent.click(screen.getByText('Checkout'));

      await waitFor(() => {
        expect(mockOpenCheckout).toHaveBeenCalledWith(
          expect.objectContaining({
            ...props.checkoutProps,
            planId: props.planId,
            onSubscriptionComplete: props.onSubscriptionComplete,
            newSubscriptionRedirectUrl: props.newSubscriptionRedirectUrl,
            planPeriod: props.planPeriod,
            seatsQuantity: props.seatsQuantity
          })
        );
      });
    });

    it('executes child onClick handler before opening checkout', async () => {
      const order: string[] = [];
      mockOpenCheckout.mockImplementation(() => order.push('checkout'));

      render(() => (
        <CheckoutButton planId="test_plan">
          <button onClick={() => order.push('child')}>Custom Button</button>
        </CheckoutButton>
      ));
      await userEvent.click(screen.getByText('Custom Button'));

      await waitFor(() => {
        expect(order).toEqual(['child', 'checkout']);
        expect(mockOpenCheckout).toHaveBeenCalledWith(
          expect.objectContaining({ planId: 'test_plan' })
        );
      });
    });

    it('uses default "Checkout" text when no children provided', () => {
      render(() => <CheckoutButton planId="test_plan" />);
      expect(screen.getByText('Checkout')).toBeInTheDocument();
    });

    it('renders custom button content when provided', () => {
      render(() => (
        <CheckoutButton planId="test_plan">
          <button>Subscribe Now</button>
        </CheckoutButton>
      ));
      expect(screen.getByText('Subscribe Now')).toBeInTheDocument();
    });
  });

  describe('Props Handling', () => {
    beforeEach(() => {
      mockAuth('user_123', null);
    });

    it('passes additional props to child element', () => {
      render(() => (
        <CheckoutButton planId="test_plan" data-testid="checkout-btn">
          <button>Checkout</button>
        </CheckoutButton>
      ));
      expect(screen.getByTestId('checkout-btn')).toBeInTheDocument();
    });

    it('handles portal configuration correctly', async () => {
      const portalProps = {
        planId: 'test_plan',
        checkoutProps: {
          portalId: 'custom-portal',
          portalRoot: document.createElement('div')
        }
      };

      render(() => <CheckoutButton {...portalProps} />);
      await userEvent.click(screen.getByText('Checkout'));

      await waitFor(() => {
        expect(mockOpenCheckout).toHaveBeenCalledWith(
          expect.objectContaining({
            ...portalProps.checkoutProps,
            planId: portalProps.planId
          })
        );
      });
    });
  });
});
