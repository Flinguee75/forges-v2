import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import BackofficeLayout from '../BackofficeLayout';

let mockRole = 'SUPERVISEUR';

vi.mock('../../../hooks/useAuth', () => ({
  useAuth: () => ({
    user: mockRole ? { role: mockRole } : null,
    logout: vi.fn(),
  }),
}));

vi.mock('../Navbar', () => ({
  default: () => <div data-testid="navbar" />,
}));

vi.mock('../Footer', () => ({
  default: () => <div data-testid="footer" />,
}));

describe('BackofficeLayout', () => {
  it('ne montre pas le bloc Bot admin au superviseur', () => {
    mockRole = 'SUPERVISEUR';

    render(
      <MemoryRouter initialEntries={['/backoffice/dashboard']}>
        <Routes>
          <Route path="/backoffice" element={<BackofficeLayout />}>
            <Route path="dashboard" element={<div>Dashboard</div>} />
          </Route>
        </Routes>
      </MemoryRouter>
    );

    expect(screen.queryByText('Bot admin')).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Enquêtes catalogue' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Feedbacks formations' })).not.toBeInTheDocument();
  });

  it('laisse le bloc Bot admin visible a l admin', () => {
    mockRole = 'ADMIN';

    render(
      <MemoryRouter initialEntries={['/backoffice/dashboard']}>
        <Routes>
          <Route path="/backoffice" element={<BackofficeLayout />}>
            <Route path="dashboard" element={<div>Dashboard</div>} />
          </Route>
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText('Bot admin')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Enquêtes catalogue' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Feedbacks formations' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Demandes de contact' })).toBeInTheDocument();
  });
});
