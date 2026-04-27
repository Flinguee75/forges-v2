import { beforeEach, describe, expect, it, vi } from 'vitest';
import { apiClient } from '../client';
import partenairesApi from '../partenaires.api';

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
});
