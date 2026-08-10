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
    const boundary = screen.getByTestId('pi-identity-boundary');
    expect(boundary).toHaveTextContent(/OpenSail account ≠ Pi Pioneer identity/);
    expect(boundary).toHaveTextContent(/Do not use Pi as OpenSail login/);
    expect(screen.queryByText(/Sign in to OpenSail with Pi/i)).toBeNull();
    expect(screen.queryByRole('button', { name: /use pi as opensail login/i })).toBeNull();
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
    expect(screen.getByText('OpenSail preview / deployment mode')).toBeInTheDocument();
    expect(screen.getByText('Pi SDK sandbox flag')).toBeInTheDocument();
    expect(screen.getByText('Developer Portal app network')).toBeInTheDocument();
    expect(screen.getByText('Payment DTO network')).toBeInTheDocument();
  });

  it('guides AgentSkillAssignment for recommended Pi skills', () => {
    render(<PiSetupChecklist baseSlug="pi-web-starter" />);
    expect(screen.getByTestId('pi-skill-assignment-guidance')).toHaveTextContent(
      /does not auto-assign/i
    );
    expect(screen.getByTestId('pi-skill-assignment-guidance')).toHaveTextContent(
      /AgentSkillAssignment/
    );
    const skills = screen.getByTestId('pi-recommended-skills');
    expect(skills).toHaveTextContent('pi-sdk');
    expect(skills).toHaveTextContent('pi-browser');
    expect(skills).not.toHaveTextContent('pi-payments');
  });

  it('recommends payment skills for payments starter', () => {
    render(<PiSetupChecklist baseSlug="pi-payments-starter" />);
    const skills = screen.getByTestId('pi-recommended-skills');
    expect(skills).toHaveTextContent('pi-payments');
    expect(skills).toHaveTextContent('pi-platform-api');
  });
});
