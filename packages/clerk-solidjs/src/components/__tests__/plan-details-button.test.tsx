import { cleanup, render, screen, waitFor } from '@solidjs/testing-library';
import '@testing-library/jest-dom/vitest';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PlanDetailsButton } from '../plan-details-button';

const mockOpenPlanDetails = vi.fn();

const mockClerk = {
  __internal_openPlanDetails: mockOpenPlanDetails
};

vi.mock('../with-clerk', () => {
  return {
    withClerk: (Component: any) => (props: any) => {
      return <Component {...props} clerk={() => mockClerk} />;
    }
  };
});

describe('<PlanDetailsButton/>', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it('renders with default "Plan details" text when no children provided', () => {
    render(() => <PlanDetailsButton planId="test_plan" />);
    expect(screen.getByText('Plan details')).toBeInTheDocument();
  });

  it('renders custom button content when provided', () => {
    render(() => (
      <PlanDetailsButton planId="test_plan">
        <button>View Plan</button>
      </PlanDetailsButton>
    ));
    expect(screen.getByText('View Plan')).toBeInTheDocument();
  });

  it('passes additional props to child element', () => {
    render(() => (
      <PlanDetailsButton planId="test_plan" data-testid="plan-details-btn">
        <button>Plan details</button>
      </PlanDetailsButton>
    ));
    expect(screen.getByTestId('plan-details-btn')).toBeInTheDocument();
  });

  it('calls clerk.__internal_openPlanDetails with planId when clicked', async () => {
    render(() => (
      <PlanDetailsButton planId="test_plan" initialPlanPeriod="month" />
    ));
    await userEvent.click(screen.getByText('Plan details'));
    await waitFor(() => {
      expect(mockOpenPlanDetails).toHaveBeenCalledWith(
        expect.objectContaining({
          planId: 'test_plan',
          initialPlanPeriod: 'month'
        })
      );
    });
  });

  it('calls clerk.__internal_openPlanDetails with plan object when clicked', async () => {
    const plan = { id: 'plan_123', name: 'Test Plan' } as any;
    render(() => <PlanDetailsButton plan={plan} />);
    await userEvent.click(screen.getByText('Plan details'));
    await waitFor(() => {
      expect(mockOpenPlanDetails).toHaveBeenCalledWith(
        expect.objectContaining({ plan })
      );
    });
  });

  it('executes child onClick handler before opening plan details', async () => {
    const childOnClick = vi.fn();
    render(() => (
      <PlanDetailsButton planId="test_plan">
        <button onClick={childOnClick}>Custom Button</button>
      </PlanDetailsButton>
    ));
    await userEvent.click(screen.getByText('Custom Button'));
    await waitFor(() => {
      expect(childOnClick).toHaveBeenCalled();
      expect(mockOpenPlanDetails).toHaveBeenCalledWith(
        expect.objectContaining({ planId: 'test_plan' })
      );
    });
  });

  it('handles portal configuration correctly', async () => {
    const planDetailsProps = {
      portalId: 'custom-portal',
      portalRoot: document.createElement('div')
    };
    render(() => (
      <PlanDetailsButton
        planId="test_plan"
        planDetailsProps={planDetailsProps}
      />
    ));
    await userEvent.click(screen.getByText('Plan details'));
    await waitFor(() => {
      expect(mockOpenPlanDetails).toHaveBeenCalledWith(
        expect.objectContaining({ ...planDetailsProps, planId: 'test_plan' })
      );
    });
  });
});
