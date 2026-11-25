import { cleanup, render, screen, waitFor } from '@solidjs/testing-library';
import '@testing-library/jest-dom/vitest';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useAuth } from '../../hooks/use-auth';
import { SubscriptionDetailsButton } from '../subscription-details-button';

vi.mock('../../hooks/use-auth', () => ({
  useAuth: vi.fn()
}));

const mockOpenSubscriptionDetails = vi.fn();

const mockClerk = {
  __internal_openSubscriptionDetails: mockOpenSubscriptionDetails
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

describe('<SubscriptionDetailsButton/>', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  describe('Authentication Validation', () => {
    it('throws error when rendered without authenticated user', () => {
      mockAuth(null, null);
      expect(() => render(() => <SubscriptionDetailsButton />)).toThrow(
        'Ensure that `<SubscriptionDetailsButton />` is rendered only when the user is signed in (wrap with `<Show when="signed-in">` or guard with `useAuth()`).'
      );
    });

    it('throws error when using org subscriber type without active organization', () => {
      mockAuth('user_123', null);
      expect(() =>
        render(() => <SubscriptionDetailsButton for="organization" />)
      ).toThrow(
        'Wrap `<SubscriptionDetailsButton for="organization" />` with a check for an active organization.'
      );
    });

    it('renders successfully with authenticated user', () => {
      mockAuth('user_123', null);
      expect(() => render(() => <SubscriptionDetailsButton />)).not.toThrow();
    });

    it('renders successfully with org subscriber type when organization is active', () => {
      mockAuth('user_123', 'org_123');
      expect(() =>
        render(() => <SubscriptionDetailsButton for="organization" />)
      ).not.toThrow();
    });
  });

  describe('Rendering and Event Handling', () => {
    beforeEach(() => {
      mockAuth('user_123', 'org_123');
    });

    it('renders with default "Subscription details" text when no children provided', () => {
      render(() => <SubscriptionDetailsButton />);
      expect(screen.getByText('Subscription details')).toBeInTheDocument();
    });

    it('passes additional props to child element', () => {
      render(() => (
        <SubscriptionDetailsButton data-testid="subscription-details-btn">
          <button>Subscription details</button>
        </SubscriptionDetailsButton>
      ));
      expect(
        screen.getByTestId('subscription-details-btn')
      ).toBeInTheDocument();
    });

    it('calls clerk.__internal_openSubscriptionDetails with correct props when clicked', async () => {
      const onSubscriptionCancel = vi.fn();
      const subscriptionDetailsProps = {
        portalId: 'custom-portal',
        portalRoot: document.createElement('div')
      };
      render(() => (
        <SubscriptionDetailsButton
          for="organization"
          onSubscriptionCancel={onSubscriptionCancel}
          subscriptionDetailsProps={subscriptionDetailsProps}
        />
      ));
      await userEvent.click(screen.getByText('Subscription details'));
      await waitFor(() => {
        expect(mockOpenSubscriptionDetails).toHaveBeenCalledWith({
          for: 'organization',
          onSubscriptionCancel,
          ...subscriptionDetailsProps
        });
      });
    });

    it('executes child onClick handler before opening subscription details', async () => {
      const order: string[] = [];
      mockOpenSubscriptionDetails.mockImplementation(() => order.push('open'));
      render(() => (
        <SubscriptionDetailsButton>
          <button onClick={() => order.push('child')}>Custom Button</button>
        </SubscriptionDetailsButton>
      ));
      await userEvent.click(screen.getByText('Custom Button'));
      await waitFor(() => expect(order).toEqual(['child', 'open']));
    });
  });
});
