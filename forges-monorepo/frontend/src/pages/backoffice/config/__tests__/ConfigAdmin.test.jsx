import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ConfigAdmin from '../ConfigAdmin';
import { dashboardApi } from '../../../../api/dashboard.api';

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

describe('ConfigAdmin', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('charge et enregistre la configuration runtime', async () => {
    vi.spyOn(dashboardApi, 'getAdminConfig').mockResolvedValue({
      default_commission_forges_pct: 20,
      default_commission_apporteur_pct: 5,
      seuil_reversement_partenaire_xof: 50000,
      seuil_reversement_apporteur_xof: 5000,
    });
    const updateSpy = vi.spyOn(dashboardApi, 'updateAdminConfig').mockResolvedValue({
      default_commission_forges_pct: 25,
      default_commission_apporteur_pct: 5,
      seuil_reversement_partenaire_xof: 50000,
      seuil_reversement_apporteur_xof: 5000,
    });

    render(<ConfigAdmin />);

    await waitFor(() => {
      expect(screen.getByText('Configuration globale')).toBeInTheDocument();
      expect(screen.getByText('20%')).toBeInTheDocument();
      expect(screen.getByText('5%')).toBeInTheDocument();
    });

    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: /enregistrer/i }));

    await waitFor(() => {
      expect(updateSpy).toHaveBeenCalledWith({
        DEFAULT_COMMISSION_FORGES_PCT: 20,
        DEFAULT_COMMISSION_APPORTEUR_PCT: 5,
        seuil_reversement_partenaire_xof: 50000,
        seuil_reversement_apporteur_xof: 5000,
      });
    });
  });
});
