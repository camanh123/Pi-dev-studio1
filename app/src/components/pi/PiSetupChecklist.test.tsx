import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PiSetupChecklist } from './PiSetupChecklist';

describe('PiSetupChecklist', () => {
  it('renders nothing for non-Pi bases', () => {
    const { container } = render(<PiSetupChecklist baseSlug="nextjs-16" />);
    expect(container).toBeEmptyDOMElement();
  });

  it('states identity boundary for auth starter', () => {
    render(<PiSetupChecklist baseSlug="pi-auth-starter" />);
    expect(screen.getByTestId('pi-identity-boundary')).toHaveTextContent(
      /OpenSail account ≠ Pi Pioneer identity/
    );
    expect(screen.queryByText(/Sign in to OpenSail with Pi/i)).toBeNull();
    expect(screen.queryByText(/Use Pi as OpenSail login/i)).toBeNull();
  });

  it('shows payment safety and mainnet human-review warning for payments starter', () => {
    render(<PiSetupChecklist baseSlug="pi-payments-starter" showKnowledgeNote />);
    expect(screen.getByTestId('pi-payment-safety')).toHaveTextContent(/Server API Key/);
    expect(screen.getByTestId('pi-payment-safety')).toHaveTextContent(/Stripe/);
    expect(screen.getByTestId('pi-mainnet-warning')).toHaveTextContent(/human verification/i);
    expect(screen.getByTestId('pi-knowledge-note')).toBeInTheDocument();
    expect(screen.queryByText(/sandbox = Mainnet/i)).toBeNull();
  });

  it('lists distinct environment concepts', () => {
    render(<PiSetupChecklist baseSlug="pi-web-starter" />);
    expect(screen.getByText(/OpenSail preview \/ deployment mode/i)).toBeInTheDocument();
    expect(screen.getByText(/Pi SDK sandbox flag/i)).toBeInTheDocument();
    expect(screen.getByText(/Developer Portal app network/i)).toBeInTheDocument();
    expect(screen.getByText(/Payment DTO network/i)).toBeInTheDocument();
  });
});
