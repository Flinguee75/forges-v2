import { beforeEach, describe, expect, it, vi } from 'vitest';
import { apprenantApi } from '../espace-apprenant.api';
import { apiClient } from '../client';

vi.mock('../client', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

describe('espace-apprenant.api', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    apiClient.get.mockImplementation((url) => {
      if (url === '/abonnements/retail/formations-incluses') {
        return Promise.resolve({
          data: [
            { id: 'f-1', inclus_abonnement: true },
            { id: 'f-2', inclus_abonnement: false },
          ],
        });
      }

      return Promise.resolve({});
    });
  });

  it('utilise les routes runtime réelles pour les dossiers et attestations', async () => {
    await apprenantApi.getMesDossiers({ statut: 'RETENU', page: 2 });
    await apprenantApi.getProfil();
    await apprenantApi.updateProfil({ nom: 'Alpha' });
    await apprenantApi.getDossierDetail('d-1');
    await apprenantApi.getMesAttestations();
    await apprenantApi.getAttestation('d-1');
    await apprenantApi.annulerDossier('d-1');

    expect(apiClient.get).toHaveBeenCalledWith('/espace-apprenant/dossiers', {
      params: { statut: 'RETENU', page: 2 },
    });
    expect(apiClient.get).toHaveBeenCalledWith('/apprenants/profil');
    expect(apiClient.put).toHaveBeenCalledWith('/apprenants/profil', { nom: 'Alpha' });
    expect(apiClient.get).toHaveBeenCalledWith('/dossiers/d-1');
    expect(apiClient.get).toHaveBeenCalledWith('/attestations');
    expect(apiClient.get).toHaveBeenCalledWith('/attestations/d-1/download', {
      responseType: 'blob',
    });
    expect(apiClient.delete).toHaveBeenCalledWith('/espace-apprenant/dossiers/d-1');
  });

  it('alimente les formations à la demande et les abonnements retail', async () => {
    await apprenantApi.getMonAbonnementRetail();
    await apprenantApi.souscrireAbonnementRetail({ offre: 'ESSENTIEL' });
    await apprenantApi.upgradeAbonnementRetail({ offre: 'PREMIUM' });
    await apprenantApi.downgradeAbonnementRetail({ offre: 'ESSENTIEL' });
    await apprenantApi.suspendreAbonnementRetail({ motif: 'pause' });
    await apprenantApi.getFormationsInclusesParAbonnement();
    await apprenantApi.getMesFormationsDemande();
    await apprenantApi.getAccesFormationDemande('acc-1');
    await apprenantApi.updateProgressionFormationDemande('acc-1', 55);
    await apprenantApi.accederFormationDemande('f-1');
    await apprenantApi.inscrireSession('s-1', { source_financement: 'RETAIL' });

    expect(apiClient.get).toHaveBeenCalledWith('/abonnements/retail/me');
    expect(apiClient.post).toHaveBeenCalledWith('/abonnements/retail', { offre: 'ESSENTIEL' });
    expect(apiClient.put).toHaveBeenCalledWith('/abonnements/retail/upgrade', { offre: 'PREMIUM' });
    expect(apiClient.put).toHaveBeenCalledWith('/abonnements/retail/downgrade', { offre: 'ESSENTIEL' });
    expect(apiClient.put).toHaveBeenCalledWith('/abonnements/retail/suspendre', { motif: 'pause' });
    expect(apiClient.get).toHaveBeenCalledWith('/abonnements/retail/formations-incluses');
    expect(apiClient.get).toHaveBeenCalledWith('/espace-apprenant/formations-demande', {
      params: {},
    });
    expect(apiClient.get).toHaveBeenCalledWith('/espace-apprenant/formations-demande/acc-1');
    expect(apiClient.patch).toHaveBeenCalledWith(
      '/espace-apprenant/formations-demande/acc-1/progression',
      { progression: 55 }
    );
    expect(apiClient.post).toHaveBeenCalledWith('/formations/f-1/acceder');
    expect(apiClient.post).toHaveBeenCalledWith('/sessions/s-1/inscrire', { source_financement: 'RETAIL' });
  });
});
