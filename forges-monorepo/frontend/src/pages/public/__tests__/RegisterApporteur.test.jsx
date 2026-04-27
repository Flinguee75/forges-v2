import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import RegisterApporteur from '../RegisterApporteur';
import apporteursApi from '../../../api/apporteurs.api';

const mockNavigate = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock('../../../hooks/useApi', () => ({
  useApi: () => ({
    execute: async (fn) => fn(),
    isLoading: false,
  }),
}));

vi.mock('../../../hooks/useToast', () => ({
  useToast: () => ({
    showToast: vi.fn(),
  }),
}));

vi.mock('../../../api/apporteurs.api', () => ({
  default: {
    register: vi.fn(),
  },
}));

describe('RegisterApporteur', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    apporteursApi.register.mockResolvedValue({
      workflow_status: 'EN_ATTENTE_VERIFICATION',
    });
  });

  it('appelle la route publique runtime de register apporteur', async () => {
    render(
      <BrowserRouter>
        <RegisterApporteur />
      </BrowserRouter>
    );

    const inputs = screen.getAllByRole('textbox');
    fireEvent.change(inputs[0], { target: { value: 'Traore Mamadou' } });
    fireEvent.change(inputs[1], { target: { value: 'mamadou@test.ci' } });
    fireEvent.change(inputs[2], { target: { value: '0700000000' } });
    fireEvent.change(screen.getAllByRole('textbox')[3], { target: { value: 'Abidjan' } });
    const passwordInputs = document.querySelectorAll('input[type="password"]');
    fireEvent.change(passwordInputs[0], { target: { value: 'Password1!' } });
    fireEvent.change(passwordInputs[1], { target: { value: 'Password1!' } });
    fireEvent.click(screen.getByRole('checkbox'));

    fireEvent.click(screen.getByRole('button', { name: /S'inscrire comme apporteur/i }));

    await waitFor(() => {
      expect(apporteursApi.register).toHaveBeenCalledWith(expect.objectContaining({
        nom: 'Traore Mamadou',
        email: 'mamadou@test.ci',
        telephone: '0700000000',
        password: 'Password1!',
        consentement_rgpd: true,
      }));
      expect(mockNavigate).toHaveBeenCalledWith('/login');
    });
  });
});
