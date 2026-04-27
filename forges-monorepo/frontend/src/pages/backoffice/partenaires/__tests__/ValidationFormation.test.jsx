import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ValidationFormation from '../ValidationFormation';
import * as responsableApiModule from '../../../../api/responsable.api';

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => vi.fn(),
    useParams: () => ({ id: 'f-1' }),
  };
});

vi.mock('../../../../hooks/useApi', () => ({
  useApi: () => ({
    execute: vi.fn(async (fn, options) => {
      const data = await fn();
      options?.onSuccess?.(data);
      return data;
    }),
    isLoading: false,
    error: null,
    reset: vi.fn(),
  }),
}));

vi.mock('../../../../hooks/useAuth', () => ({
  useAuth: () => ({
    user: { id: 'r-1', role: 'RESPONSABLE' },
  }),
}));

vi.mock('../../../../hooks/useToast', () => ({
  useToast: () => ({
    showToast: vi.fn(),
  }),
}));

describe('ValidationFormation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('n envoie plus commission_forges_pct ni prix_catalogue au backend', async () => {
    vi.spyOn(responsableApiModule.default, 'getValidationDetail').mockResolvedValue({
      id: 'f-1',
      titre: 'Formation Node',
      description: 'Description longue de la formation',
      mode: 'AVEC_SESSION',
      duree: 12,
      modalite: 'EN_LIGNE',
      statut: 'EN_ATTENTE_VALIDATION',
      prix_coutant: 100000,
      created_at: '2026-04-01T10:00:00.000Z',
      partenaire: { raison_sociale: 'Partner Test' },
    });
    const validateSpy = vi.spyOn(responsableApiModule.default, 'validerFormation').mockResolvedValue({});

    const user = userEvent.setup();
    render(<ValidationFormation />);

    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 2, name: 'Formation Node' })).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /Valider et publier/i }));
    await user.click(screen.getByRole('button', { name: /^Confirmer$/i }));

    await waitFor(() => {
      expect(validateSpy).toHaveBeenCalledTimes(1);
    });

    const payload = validateSpy.mock.calls[0][1];
    expect(payload).toEqual(expect.objectContaining({
      type_formation: 'STANDARD',
      pilier_abonnement: 'TOUS',
      prix_coutant: 100000,
    }));
    expect(payload).not.toHaveProperty('commission_forges_pct');
    expect(payload).not.toHaveProperty('prix_catalogue');
  });
});
