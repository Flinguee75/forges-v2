import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import PaiementCallback from '../PaiementCallback';
import { paiementsApi } from '../../../api/paiements.api';

vi.mock('../../../api/paiements.api', () => ({
  paiementsApi: {
    getById: vi.fn(),
    getByReference: vi.fn(),
  },
}));

function renderCallback(search = '') {
  return render(
    <MemoryRouter initialEntries={[`/apprenant/paiements/callback${search}`]}>
      <Routes>
        <Route path="/apprenant/paiements/callback" element={<PaiementCallback />} />
        <Route path="/apprenant/dossiers" element={<div>Mes dossiers</div>} />
        <Route path="/apprenant/paiements" element={<div>Mes paiements</div>} />
      </Routes>
    </MemoryRouter>
  );
}

describe('PaiementCallback', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('ne confirme pas le paiement depuis status=success tant que FORGES retourne PENDING', async () => {
    paiementsApi.getByReference.mockResolvedValue({
      id: 'pay-1',
      statut: 'PENDING',
      order_ngser: 'FRG-FNO-2026-001',
      montant_final: 50000,
    });

    renderCallback('?status=success&status_id=1&order_id=FRG-FNO-2026-001');

    await waitFor(() => {
      expect(screen.getByText('En attente')).toBeInTheDocument();
    });

    expect(screen.queryByText(/Votre paiement a été confirmé/i)).not.toBeInTheDocument();
    expect(paiementsApi.getByReference).toHaveBeenCalledWith('FRG-FNO-2026-001');
  });

  it('affiche le succes uniquement quand le backend retourne CONFIRME', async () => {
    paiementsApi.getByReference.mockResolvedValue({
      id: 'pay-2',
      statut: 'CONFIRME',
      order_ngser: 'FRG-FNO-2026-002',
      montant_final: 75000,
    });

    renderCallback('?status=success&status_id=1&order_id=FRG-FNO-2026-002');

    await waitFor(() => {
      expect(screen.getByText(/Paiement confirmé/i)).toBeInTheDocument();
      expect(screen.getByText(/Votre paiement a été confirmé/i)).toBeInTheDocument();
    });
  });

  it('utilise paiement_id pour afficher une auto-confirmation interne', async () => {
    paiementsApi.getById.mockResolvedValue({
      id: 'pay-zero',
      statut: 'CONFIRME',
      montant_final: 0,
    });

    renderCallback('?paiement_id=pay-zero');

    await waitFor(() => {
      expect(screen.getByText(/Paiement confirmé/i)).toBeInTheDocument();
    });

    expect(paiementsApi.getById).toHaveBeenCalledWith('pay-zero');
    expect(paiementsApi.getByReference).not.toHaveBeenCalled();
  });
});
