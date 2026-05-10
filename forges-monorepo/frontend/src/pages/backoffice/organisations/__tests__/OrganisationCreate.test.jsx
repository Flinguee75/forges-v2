import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import OrganisationCreate from '../OrganisationCreate';
import { organisationsApi } from '../../../../api/organisations.api';

const mockNavigate = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

vi.mock('../../../../api/organisations.api', () => ({
  organisationsApi: { create: vi.fn() },
}));

const state = vi.hoisted(() => ({
  execute: vi.fn(async (apiCall, options) => {
    try {
      const result = await apiCall();
      await options?.onSuccess?.(result);
      return result;
    } catch (err) {
      await options?.onError?.(err);
    }
  }),
  isLoading: false,
  error: null,
}));

vi.mock('../../../../hooks/useApi', () => ({
  useApi: () => ({ execute: state.execute, isLoading: state.isLoading, error: state.error }),
}));

function renderComponent() {
  return render(
    <BrowserRouter>
      <OrganisationCreate />
    </BrowserRouter>
  );
}

describe('OrganisationCreate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('affiche la modale de confirmation apres creation', async () => {
    const user = userEvent.setup();
    organisationsApi.create.mockResolvedValue({
      data: {
        id: 'org-123',
        email: 'org@test.ci',
        raison_sociale: 'Org Test',
        type: 'ENTREPRISE',
        contact_referent: 'Alice Test',
        pays: 'CI',
        identifiant_legal: 'ORG-001',
      },
    });

    renderComponent();
    await waitFor(() => screen.getByLabelText(/Raison sociale/i));
    await user.type(screen.getByLabelText(/Raison sociale/i), 'Org Test');
    await user.type(screen.getByLabelText(/Email/i), 'org@test.ci');
    await user.type(screen.getByLabelText(/Contact référent/i), 'Alice Test');
    fireEvent.submit(screen.getByTestId('form-creer-organisation'));

    await waitFor(() => {
      expect(screen.getByText('Organisation créée')).toBeInTheDocument();
      expect(screen.getByText(/Un email de confirmation a été envoyé à/i)).toBeInTheDocument();
      expect(screen.getByText(/Si l’email n’a pas été reçu/i)).toBeInTheDocument();
      expect(screen.getByText(/Org Test/)).toBeInTheDocument();
      expect(screen.getAllByText(/org@test.ci/).length).toBeGreaterThan(0);
    });
  });
});
