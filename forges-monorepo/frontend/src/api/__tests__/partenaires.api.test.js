import { beforeEach, describe, expect, it, vi } from 'vitest';
import { apiClient } from '../client';
import partenairesApi from '../partenaires.api';

const FORBIDDEN_FIELDS = ['commission_forges_pct', 'prix_catalogue', 'taux_commission_forges'];

vi.mock('../client', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
  },
}));

describe('partenairesApi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('appelle les bonnes routes runtime pour le parcours partenaire', async () => {
    apiClient.get.mockImplementation((url) => {
      if (url === '/partenaires/dashboard') return Promise.resolve({ data: { formations: [], reversements: [] } });
      if (url === '/partenaires/formations') return Promise.resolve({ data: [] });
      if (url === '/partenaires/formations/f-1') return Promise.resolve({ data: { id: 'f-1' } });
      if (url === '/partenaires/reversements') return Promise.resolve({ data: { reversements: [] } });
      if (url === '/partenaires/profil') return Promise.resolve({ data: { id: 'p-1' } });
      if (url === '/admin/partenaires') return Promise.resolve({ data: [] });
      if (url === '/admin/partenaires/p-1') return Promise.resolve({ data: { id: 'p-1' } });
      return Promise.resolve({ data: {} });
    });
    apiClient.post.mockImplementation((url) => {
      if (url === '/partenaires/formations') return Promise.resolve({ data: { id: 'f-1' } });
      if (url === '/partenaires/register') return Promise.resolve({ data: { id: 'p-1' } });
      if (url === '/partenaires/activate') return Promise.resolve({ data: { id: 'p-1' } });
      if (url === '/admin/partenaires') return Promise.resolve({ data: { id: 'p-1' } });
      return Promise.resolve({ data: {} });
    });
    apiClient.put.mockImplementation((url) => {
      if (url === '/partenaires/formations/f-1') return Promise.resolve({ data: { id: 'f-1' } });
      if (url === '/partenaires/formations/f-1/soumettre') return Promise.resolve({ data: { id: 'f-1' } });
      if (url === '/partenaires/profil') return Promise.resolve({ data: { id: 'p-1' } });
      if (url === '/admin/partenaires/p-1/approuver') return Promise.resolve({ data: { id: 'p-1' } });
      if (url === '/admin/partenaires/p-1/refuser') return Promise.resolve({ data: { id: 'p-1' } });
      if (url === '/admin/partenaires/p-1/suspendre') return Promise.resolve({ data: { id: 'p-1' } });
      if (url === '/admin/partenaires/p-1/reactiver') return Promise.resolve({ data: { id: 'p-1' } });
      return Promise.resolve({ data: {} });
    });

    await partenairesApi.getPartenaireStats();
    await partenairesApi.getMesFormations({ statut: 'ACTIVE', search: '' });
    await partenairesApi.getFormationDetail('f-1');
    await partenairesApi.createFormationPartenaire({ intitule: 'Formation 1' });
    await partenairesApi.updateFormationBrouillon('f-1', { intitule: 'Formation 2' });
    await partenairesApi.soumettreFormationBrouillon('f-1');
    await partenairesApi.getMesReversements({ page: 1 });
    await partenairesApi.getMonProfilPartenaire();
    await partenairesApi.updateMonProfilPartenaire({ raison_sociale: 'Tech Formation', email: 'p@test.ci', pays: 'CI' });
    await partenairesApi.registerPartenaire({ raison_sociale: 'Tech Formation', email: 'p@test.ci', password: 'Password1!' });
    await partenairesApi.confirmEmailPartenaire('token-1', 'Password1!');
    await partenairesApi.getAllPartenaires();
    await partenairesApi.getPartenaireAdmin('p-1');
    await partenairesApi.inviterPartenaire({ email: 'p@test.ci', raison_sociale: 'Tech Formation' });
    await partenairesApi.approuverPartenaire('p-1');
    await partenairesApi.refuserPartenaire('p-1');
    await partenairesApi.suspendrePartenaire('p-1');
    await partenairesApi.reactiverPartenaire('p-1');

    expect(apiClient.get).toHaveBeenCalledWith('/partenaires/dashboard');
    expect(apiClient.get).toHaveBeenCalledWith('/partenaires/formations', { params: { statut: 'ACTIVE' } });
    expect(apiClient.get).toHaveBeenCalledWith('/partenaires/formations/f-1');
    expect(apiClient.get).toHaveBeenCalledWith('/partenaires/reversements', { params: { page: 1 } });
    expect(apiClient.get).toHaveBeenCalledWith('/partenaires/profil');
    expect(apiClient.get).toHaveBeenCalledWith('/admin/partenaires');
    expect(apiClient.get).toHaveBeenCalledWith('/admin/partenaires/p-1');

    expect(apiClient.post).toHaveBeenCalledWith('/partenaires/formations', expect.objectContaining({
      intitule: 'Formation 1',
      brouillon: false,
    }));
    expect(apiClient.post).toHaveBeenCalledWith('/partenaires/register', expect.objectContaining({
      raison_sociale: 'Tech Formation',
      email_principal: 'p@test.ci',
      password: 'Password1!',
    }));
    expect(apiClient.post).toHaveBeenCalledWith('/partenaires/activate', {
      token: 'token-1',
      password: 'Password1!',
    });
    expect(apiClient.post).toHaveBeenCalledWith('/admin/partenaires', expect.objectContaining({
      email: 'p@test.ci',
      raison_sociale: 'Tech Formation',
    }));

    expect(apiClient.put).toHaveBeenCalledWith('/partenaires/formations/f-1', expect.objectContaining({
      intitule: 'Formation 2',
      brouillon: true,
    }));
    expect(apiClient.put).toHaveBeenCalledWith('/partenaires/formations/f-1/soumettre');
    expect(apiClient.put).toHaveBeenCalledWith('/partenaires/profil', {
      raison_sociale: 'Tech Formation',
      email_principal: 'p@test.ci',
      pays: 'CI',
    });
    expect(apiClient.put).toHaveBeenCalledWith('/admin/partenaires/p-1/approuver', {});
    expect(apiClient.put).toHaveBeenCalledWith('/admin/partenaires/p-1/refuser');
    expect(apiClient.put).toHaveBeenCalledWith('/admin/partenaires/p-1/suspendre');
    expect(apiClient.put).toHaveBeenCalledWith('/admin/partenaires/p-1/reactiver');
  });

  it('ne propage jamais les champs de classification FORGES dans une soumission partenaire', async () => {
    apiClient.post.mockResolvedValue({ data: { id: 'f-1' } });

    await partenairesApi.createFormationPartenaire({
      titre: 'Formation partenaire',
      description: 'Description',
      duree_heures: 16,
      prix_coutant: 100000,
      type_formation: 'PREMIUM',
      pilier_abonnement: 'RETAIL',
      commission_forges_pct: 20,
      prix_catalogue: 125000,
    });

    const payload = apiClient.post.mock.calls[0][1];
    expect(payload).toEqual(expect.objectContaining({
      intitule: 'Formation partenaire',
      prix_coutant_propose: 100000,
    }));
    expect(payload).not.toHaveProperty('type_formation');
    expect(payload).not.toHaveProperty('pilier_abonnement');
    expect(payload).not.toHaveProperty('commission_forges_pct');
    expect(payload).not.toHaveProperty('prix_catalogue');
  });

  describe('normalisation du statut reversement', () => {
    it('produit "Reversement effectué" quand le backend envoie statut REVERSE', async () => {
      apiClient.get.mockResolvedValue({
        data: { data: [{ id: 'rev-1', montant_reverse_xof: 7500000, statut: 'REVERSE' }] },
      });

      const result = await partenairesApi.getMesReversements();

      expect(result.data[0].message).toBe('Reversement effectué');
    });

    it('produit "En attente de reversement" quand statut est EN_ATTENTE', async () => {
      apiClient.get.mockResolvedValue({
        data: { data: [{ id: 'rev-2', montant_reverse_xof: 0, statut: 'EN_ATTENTE' }] },
      });

      const result = await partenairesApi.getMesReversements();

      expect(result.data[0].message).toBe('En attente de reversement');
    });
  });

  describe('champs FORGES interdits dans les réponses normalisées', () => {
    it('getMesFormations ne propage jamais les champs FORGES interdits', async () => {
      apiClient.get.mockResolvedValue({
        data: [{
          id: 'f-1',
          intitule: 'Formation Test',
          statut_validation: 'VALIDE',
          commission_forges_pct: 20,
          prix_catalogue: 250000,
          taux_commission_forges: 0.2,
        }],
      });

      const result = await partenairesApi.getMesFormations();

      for (const field of FORBIDDEN_FIELDS) {
        expect(result.data[0], `${field} ne doit pas apparaître dans la formation normalisée`).not.toHaveProperty(field);
      }
    });

    it('getMesReversements ne propage jamais les champs FORGES interdits', async () => {
      apiClient.get.mockResolvedValue({
        data: {
          data: [{
            id: 'rev-1',
            montant_reverse_xof: 5000000,
            statut: 'REVERSE',
            commission_forges_pct: 20,
            prix_catalogue: 250000,
            taux_commission_forges: 0.2,
          }],
        },
      });

      const result = await partenairesApi.getMesReversements();

      for (const field of FORBIDDEN_FIELDS) {
        expect(result.data[0], `${field} ne doit pas apparaître dans le reversement normalisé`).not.toHaveProperty(field);
      }
    });

    it('getPartenaireStats ne propage jamais les champs FORGES interdits dans les formations', async () => {
      apiClient.get.mockResolvedValue({
        data: {
          formations: [{
            id: 'f-1',
            intitule: 'Formation Test',
            statut_validation: 'VALIDE',
            commission_forges_pct: 20,
            prix_catalogue: 250000,
            taux_commission_forges: 0.2,
          }],
          reversements: [],
        },
      });

      const result = await partenairesApi.getPartenaireStats();

      for (const field of FORBIDDEN_FIELDS) {
        expect(result.formations[0], `${field} ne doit pas apparaître dans la formation du dashboard`).not.toHaveProperty(field);
      }
    });

    it('createFormationPartenaire ne propage jamais les champs FORGES interdits dans le payload sortant', async () => {
      apiClient.post.mockResolvedValue({ data: { id: 'f-1' } });

      await partenairesApi.createFormationPartenaire({
        titre: 'Formation Test',
        description: 'Description',
        duree_heures: 8,
        prix_coutant: 100000,
        commission_forges_pct: 20,
        prix_catalogue: 125000,
        taux_commission_forges: 0.2,
        type_formation: 'PREMIUM',
        pilier_abonnement: 'RETAIL',
      });

      const payload = apiClient.post.mock.calls[0][1];
      for (const field of FORBIDDEN_FIELDS) {
        expect(payload, `${field} ne doit pas apparaître dans le payload de soumission`).not.toHaveProperty(field);
      }
      expect(payload).not.toHaveProperty('type_formation');
      expect(payload).not.toHaveProperty('pilier_abonnement');
    });
  });

  it('normalise les reversements en montant net sans exposer commission_forges_pct', async () => {
    apiClient.get.mockResolvedValue({
      data: {
        data: [{
          formation_intitule: 'Cyber Defense',
          montant_reverse_xof: 7500000,
          statut: 'REVERSEE',
          commission_forges_pct: 20,
        }],
      },
    });

    const result = await partenairesApi.getMesReversements();

    expect(result.data[0]).toEqual(expect.objectContaining({
      montant_net: 7500000,
      statut_validation: 'REVERSEE',
      formation: expect.objectContaining({ titre: 'Cyber Defense' }),
    }));
    expect(result.data[0]).not.toHaveProperty('commission_forges_pct');
  });
});
