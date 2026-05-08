import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import DevisDetail from '../DevisDetail';
import devisApi from '../../../../api/devis.api';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useParams: () => ({ id: 'devis-uuid-1' }),
  };
});

vi.mock('../../../../api/devis.api', () => ({
  default: {
    getById: vi.fn(),
    listerVouchers: vi.fn(),
    genererVouchers: vi.fn(),
    payer: vi.fn(),
    annuler: vi.fn(),
    telechargerPdf: vi.fn(),
    telechargerDocx: vi.fn(),
  },
}));

const state = vi.hoisted(() => ({
  showToast: vi.fn(),
  execute: vi.fn(async (apiCall, options) => {
    try {
      const result = await apiCall();
      await options?.onSuccess?.(result);
      return result;
    } catch {
      if (options?.showErrorToast !== false) state.showToast('Erreur', 'error');
    }
  }),
  isLoading: false,
}));

vi.mock('../../../../hooks/useToast', () => ({
  useToast: () => ({ showToast: state.showToast }),
}));

vi.mock('../../../../hooks/useApi', () => ({
  useApi: () => ({ execute: state.execute, isLoading: state.isLoading }),
}));

const devisBase = {
  id: 'devis-uuid-1',
  numero_devis: 'DEV-2026-001',
  statut: 'CREE',
  nb_places: 3,
  tarif_unitaire_xof: 200000,
  montant_total_xof: 600000,
  organisation: { raison_sociale: 'ANSSI CI' },
  organisation_id: 'org-1',
  formation: { intitule: 'Formation Securite' },
  formation_id: 'form-1',
  created_at: '2026-01-15T10:00:00Z',
};

function renderComponent() {
  return render(
    <BrowserRouter>
      <DevisDetail />
    </BrowserRouter>
  );
}

describe('DevisDetail — section vouchers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    devisApi.getById.mockResolvedValue(devisBase);
    devisApi.listerVouchers.mockResolvedValue([]);
  });

  it('affiche le numero de devis et le statut', async () => {
    renderComponent();
    await waitFor(() => {
      expect(screen.getByTestId('devis-numero')).toHaveTextContent('DEV-2026-001');
      expect(screen.getByText('En attente de paiement')).toBeInTheDocument();
    });
  });

  it('affiche le bouton "Generer les vouchers" quand CREE sans vouchers', async () => {
    renderComponent();
    await waitFor(() => {
      expect(screen.getByTestId('btn-generer-vouchers')).toBeInTheDocument();
    });
  });

  it('cache le bouton "Generer les vouchers" quand des vouchers existent deja', async () => {
    devisApi.listerVouchers.mockResolvedValue([
      { id: 'v1', code: 'CODE-001', statut: 'EN_ATTENTE' },
    ]);
    renderComponent();
    await waitFor(() => {
      expect(screen.queryByTestId('btn-generer-vouchers')).not.toBeInTheDocument();
    });
  });

  it('affiche le message vide si aucun voucher', async () => {
    renderComponent();
    await waitFor(() => {
      expect(screen.getByTestId('vouchers-empty')).toBeInTheDocument();
    });
  });

  it('appelle genererVouchers et recharge la liste au clic', async () => {
    const user = userEvent.setup();
    devisApi.genererVouchers.mockResolvedValue({ nb_generes: 3 });
    devisApi.listerVouchers
      .mockResolvedValueOnce([])
      .mockResolvedValue([
        { id: 'v1', code: 'CODE-001', statut: 'EN_ATTENTE' },
        { id: 'v2', code: 'CODE-002', statut: 'EN_ATTENTE' },
        { id: 'v3', code: 'CODE-003', statut: 'EN_ATTENTE' },
      ]);
    renderComponent();
    await waitFor(() => screen.getByTestId('btn-generer-vouchers'));
    await user.click(screen.getByTestId('btn-generer-vouchers'));
    await waitFor(() => {
      expect(screen.getByTestId('vouchers-list')).toBeInTheDocument();
      expect(screen.getByTestId('voucher-item-0')).toBeInTheDocument();
      expect(screen.getByTestId('voucher-item-2')).toBeInTheDocument();
    });
    expect(state.showToast).toHaveBeenCalledWith('3 voucher(s) genere(s) avec succes.', 'success');
  });

  it('affiche les vouchers avec leurs statuts', async () => {
    devisApi.listerVouchers.mockResolvedValue([
      { id: 'v1', code: 'VCH-XXXX-0001', statut: 'EN_ATTENTE' },
      { id: 'v2', code: 'VCH-XXXX-0002', statut: 'ACTIF' },
    ]);
    renderComponent();
    await waitFor(() => {
      expect(screen.getByTestId('voucher-item-0')).toHaveTextContent('VCH-XXXX-0001');
      expect(screen.getByTestId('voucher-item-0')).toHaveTextContent('En attente');
      expect(screen.getByTestId('voucher-item-1')).toHaveTextContent('Actif');
    });
  });

  it('affiche toast VOUCHERS_DEJA_GENERES si deja generes', async () => {
    const user = userEvent.setup();
    devisApi.genererVouchers.mockRejectedValue({
      response: { data: { error: 'VOUCHERS_DEJA_GENERES' } },
    });
    renderComponent();
    await waitFor(() => screen.getByTestId('btn-generer-vouchers'));
    await user.click(screen.getByTestId('btn-generer-vouchers'));
    await waitFor(() => {
      expect(state.showToast).toHaveBeenCalledWith(
        'Les vouchers ont deja ete generes pour ce devis.',
        'warning'
      );
    });
  });

  it('cache le bouton generer si devis statut PAYE', async () => {
    devisApi.getById.mockResolvedValue({ ...devisBase, statut: 'PAYE' });
    renderComponent();
    await waitFor(() => {
      expect(screen.queryByTestId('btn-generer-vouchers')).not.toBeInTheDocument();
    });
  });
});

describe('DevisDetail — actions payer / annuler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    devisApi.getById.mockResolvedValue(devisBase);
    devisApi.listerVouchers.mockResolvedValue([]);
  });

  it('affiche les boutons Payer et Annuler pour statut CREE', async () => {
    renderComponent();
    await waitFor(() => {
      expect(screen.getByTestId('btn-payer')).toBeInTheDocument();
      expect(screen.getByTestId('btn-annuler')).toBeInTheDocument();
    });
  });

  it('affiche le formulaire de confirmation au clic Payer', async () => {
    const user = userEvent.setup();
    renderComponent();
    await waitFor(() => screen.getByTestId('btn-payer'));
    await user.click(screen.getByTestId('btn-payer'));
    await waitFor(() => {
      expect(screen.getByTestId('btn-confirm-action')).toBeInTheDocument();
      expect(screen.getByTestId('input-notes')).toBeInTheDocument();
    });
  });

  it('confirmer le paiement met a jour le statut et recharge les vouchers', async () => {
    const user = userEvent.setup();
    const updatedDevis = { ...devisBase, statut: 'PAYE' };
    devisApi.payer.mockResolvedValue(updatedDevis);
    devisApi.listerVouchers
      .mockResolvedValueOnce([])
      .mockResolvedValue([
        { id: 'v1', code: 'VCH-001', statut: 'ACTIF' },
      ]);
    renderComponent();
    await waitFor(() => screen.getByTestId('btn-payer'));
    await user.click(screen.getByTestId('btn-payer'));
    await waitFor(() => screen.getByTestId('btn-confirm-action'));
    await user.click(screen.getByTestId('btn-confirm-action'));
    await waitFor(() => {
      expect(state.showToast).toHaveBeenCalledWith('Devis marqué comme payé.', 'success');
    });
  });

  it('masque les boutons actions pour statut PAYE', async () => {
    devisApi.getById.mockResolvedValue({ ...devisBase, statut: 'PAYE' });
    renderComponent();
    await waitFor(() => {
      expect(screen.queryByTestId('btn-payer')).not.toBeInTheDocument();
      expect(screen.queryByTestId('btn-annuler')).not.toBeInTheDocument();
    });
  });
});

describe('DevisDetail — telechargement PDF', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    devisApi.getById.mockResolvedValue(devisBase);
    devisApi.listerVouchers.mockResolvedValue([]);
  });

  it('affiche le bouton telecharger PDF', async () => {
    renderComponent();
    await waitFor(() => {
      expect(screen.getByTestId('btn-telecharger-pdf')).toBeInTheDocument();
    });
  });

  it('appelle telechargerPdf au clic', async () => {
    const user = userEvent.setup();
    devisApi.telechargerPdf.mockResolvedValue();
    renderComponent();
    await waitFor(() => screen.getByTestId('btn-telecharger-pdf'));
    await user.click(screen.getByTestId('btn-telecharger-pdf'));
    await waitFor(() => {
      expect(devisApi.telechargerPdf).toHaveBeenCalledWith('devis-uuid-1', 'DEV-2026-001');
    });
  });

  it('affiche toast erreur si telechargerPdf echoue', async () => {
    const user = userEvent.setup();
    devisApi.telechargerPdf.mockRejectedValue(new Error('network'));
    renderComponent();
    await waitFor(() => screen.getByTestId('btn-telecharger-pdf'));
    await user.click(screen.getByTestId('btn-telecharger-pdf'));
    await waitFor(() => {
      expect(state.showToast).toHaveBeenCalledWith(
        'Erreur lors du telechargement du PDF.',
        'error'
      );
    });
  });
});
