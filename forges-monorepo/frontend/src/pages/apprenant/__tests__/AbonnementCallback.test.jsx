import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import AbonnementCallback from '../AbonnementCallback';
import { apiClient } from '../../../api/client';

vi.mock('../../../api/client', () => ({
  apiClient: {
    get: vi.fn(),
  },
}));

vi.mock('../../../hooks/useToast', () => ({
  useToast: () => ({
    showSuccess: vi.fn(),
    showError: vi.fn(),
  }),
}));

function renderCallback(search = '') {
  return render(
    <MemoryRouter initialEntries={[`/apprenant/abonnement/callback${search}`]}>
      <Routes>
        <Route path="/apprenant/abonnement/callback" element={<AbonnementCallback />} />
        <Route path="/apprenant/abonnement" element={<div>Mon Abonnement</div>} />
        <Route path="/apprenant/abonnement/souscrire" element={<div>Souscrire</div>} />
        <Route path="/apprenant" element={<div>Dashboard</div>} />
      </Routes>
    </MemoryRouter>
  );
}

describe('AbonnementCallback', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ─── Affichage selon statut NGSER ────────────────────────────────

  it('affiche "Abonnement confirme" pour status=success', async () => {
    // Simule abonnement pas encore ACTIF (IPN pas encore arrive)
    apiClient.get.mockRejectedValue(Object.assign(new Error('NOT_FOUND'), { statusCode: 404, code: 'NOT_FOUND' }));

    renderCallback('?status=success&order_id=ABO-2026-001-TEST&status_id=1');

    await waitFor(() => {
      expect(screen.getByText(/abonnement confirm/i)).toBeInTheDocument();
    });
  });

  it('affiche "Paiement non abouti" pour status=fail', async () => {
    renderCallback('?status=fail&order_id=ABO-2026-001-TEST&status_id=0');

    await waitFor(() => {
      expect(screen.getByText(/paiement non abouti/i)).toBeInTheDocument();
    });
  });

  it('affiche "Paiement non abouti" pour status_id=0', async () => {
    renderCallback('?status_id=0&order_id=ABO-2026-001-TEST');
    await waitFor(() => {
      expect(screen.getByText(/paiement non abouti/i)).toBeInTheDocument();
    });
  });

  it('affiche "Abonnement confirme" pour status_id=1', async () => {
    apiClient.get.mockRejectedValue(new Error('pas encore'));
    renderCallback('?status_id=1&order_id=ABO-2026-001-TEST');
    await waitFor(() => {
      expect(screen.getByText(/abonnement confirm/i)).toBeInTheDocument();
    });
  });

  // ─── Polling abonnement apres succes ─────────────────────────────

  it('affiche le badge Actif si l\'abonnement est ACTIF apres polling', async () => {
    apiClient.get.mockResolvedValue({
      data: { id: 'abo-1', offre: 'ESSENTIEL', statut: 'ACTIF' },
    });

    renderCallback('?status=success&order_id=ABO-2026-001-TEST&status_id=1&transaction_id=tx-123');

    await waitFor(() => {
      expect(screen.getByText('Actif')).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  it('affiche un avertissement si abonnement pas encore ACTIF apres polling', async () => {
    vi.useFakeTimers();

    // Toujours en attente meme apres plusieurs appels
    apiClient.get.mockResolvedValue({
      data: { id: 'abo-1', offre: 'ESSENTIEL', statut: 'EN_ATTENTE_PAIEMENT' },
    });

    renderCallback('?status=success&order_id=ABO-2026-001-DELAY&status_id=1');

    // Avancer le temps pour epuiser les 6 tentatives de polling (6 x 2000ms)
    await act(async () => {
      await vi.advanceTimersByTimeAsync(13000);
    });

    expect(screen.getByText(/confirmation est en cours/i)).toBeInTheDocument();

    vi.useRealTimers();
  });

  // ─── Affichage echec ──────────────────────────────────────────────

  it('affiche message d\'echec de paiement et bouton reessayer', async () => {
    renderCallback('?status=fail&order_id=ABO-FAIL&status_id=0');

    await waitFor(() => {
      expect(screen.getByText(/aucun prelevement/i)).toBeInTheDocument();
      expect(screen.getByTestId('btn-reessayer')).toBeInTheDocument();
    });
  });

  it('affiche le bouton "Voir mon abonnement" en cas de succes', async () => {
    apiClient.get.mockResolvedValue({
      data: { id: 'abo-1', offre: 'ESSENTIEL', statut: 'ACTIF' },
    });

    renderCallback('?status=success&status_id=1');

    await waitFor(() => {
      expect(screen.getByTestId('btn-voir-abonnement')).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  // ─── Affichage reference NGSER ───────────────────────────────────

  it('affiche l\'order_id NGSER si present', async () => {
    apiClient.get.mockResolvedValue({
      data: { id: 'abo-1', offre: 'ESSENTIEL', statut: 'ACTIF' },
    });

    const ORDER_ID = 'ABO-2026-001-ABCDEF';
    renderCallback(`?status=success&status_id=1&order_id=${ORDER_ID}`);

    await waitFor(() => {
      expect(screen.getByText(ORDER_ID)).toBeInTheDocument();
    }, { timeout: 3000 });
  });
});
