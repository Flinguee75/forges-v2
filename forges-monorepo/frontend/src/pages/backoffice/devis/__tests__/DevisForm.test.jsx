import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import DevisForm from '../DevisForm';
import devisApi from '../../../../api/devis.api';
import formationsApi from '../../../../api/formations.api';
import { organisationsApi } from '../../../../api/organisations.api';
import { sessionsApi } from '../../../../api/sessions.api';

vi.mock('../../../../hooks/useApi', () => ({
  useApi: () => ({
    execute: vi.fn(async (fn, options) => {
      const data = await fn();
      options?.onSuccess?.(data);
      return data;
    }),
    isLoading: false,
  }),
}));

vi.mock('../../../../hooks/useToast', () => ({
  useToast: () => ({
    showToast: vi.fn(),
  }),
}));

describe('DevisForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(formationsApi, 'getAllBackoffice').mockResolvedValue({
      data: [{ id: 'f-01', intitule: 'Formation Test' }],
    });
    vi.spyOn(organisationsApi, 'getAll').mockResolvedValue({
      data: [{ id: 'org-01', raison_sociale: 'Organisation Test' }],
    });
    vi.spyOn(sessionsApi, 'getBackofficeList').mockResolvedValue({
      data: [
        {
          id: 's-01',
          formation_id: 'f-01',
          statut: 'PLANIFIEE',
          date_debut: '2026-06-01T00:00:00.000Z',
          date_fin: '2026-06-10T00:00:00.000Z',
        },
      ],
    });
    vi.spyOn(devisApi, 'create').mockResolvedValue({
      id: 'devis-01',
      numero_devis: 'FORGES-DEVIS-2026-001',
    });
    vi.spyOn(devisApi, 'envoyerEmail').mockResolvedValue({
      to: 'org@test.ci',
    });
  });

  it('exige une session et l envoie au backend', async () => {
    const user = userEvent.setup();

    render(
      <BrowserRouter>
        <DevisForm />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByTestId('select-organisation')).toBeInTheDocument();
      expect(screen.getByTestId('select-session')).toBeDisabled();
    });

    await user.selectOptions(screen.getByTestId('select-organisation'), 'org-01');
    await user.selectOptions(screen.getByTestId('select-formation'), 'f-01');

    await waitFor(() => {
      expect(screen.getByTestId('select-session')).not.toBeDisabled();
      expect(screen.getByTestId('select-session').textContent).toMatch(/du .* au .*/i);
    });

    await user.selectOptions(screen.getByTestId('select-session'), 's-01');
    await user.clear(screen.getByTestId('input-nb-places'));
    await user.type(screen.getByTestId('input-nb-places'), '2');
    await user.clear(screen.getByTestId('input-tarif'));
    await user.type(screen.getByTestId('input-tarif'), '15000');
    await user.click(screen.getByTestId('btn-submit-devis'));

    await waitFor(() => {
      expect(devisApi.create).toHaveBeenCalledWith(
        expect.objectContaining({
          organisation_id: 'org-01',
          formation_id: 'f-01',
          session_id: 's-01',
        })
      );
    });
  });
});
