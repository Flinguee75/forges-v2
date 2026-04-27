import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import OrgLayout from '../OrgLayout';

vi.mock('../../../hooks/useAuth', () => ({
  useAuth: () => ({
    user: { id: 'org-1', email: 'org@test.com', role: 'ORGANISATION' },
    logout: vi.fn(),
  }),
}));

describe('OrgLayout', () => {
  it('affiche les entrees de navigation F17', () => {
    render(
      <BrowserRouter>
        <OrgLayout />
      </BrowserRouter>
    );

    expect(screen.getByText('Abonnement')).toBeInTheDocument();
    expect(screen.getByText('Abonnement B2B')).toBeInTheDocument();
    expect(screen.getByText('Vouchers')).toBeInTheDocument();
    expect(screen.getByText('Inscriptions')).toBeInTheDocument();
  });
});
