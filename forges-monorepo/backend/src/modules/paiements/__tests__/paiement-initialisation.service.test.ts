import { PaiementInitialisationService } from '../paiement-initialisation.service';

jest.mock('../../../config/env.config', () => ({
  getDelaiPaiementMs: () => 72 * 60 * 60 * 1000,
}));

describe('PaiementInitialisationService', () => {
  let service: PaiementInitialisationService;
  let mockPrisma: any;

  const baseOptions = {
    dossier_id: 'dossier-01',
    montant_catalogue: 100000,
    montant_final: 100000,
    reduction_appliquee: 0,
    methode: 'DIRECT',
  };

  beforeEach(() => {
    mockPrisma = {
      paiement: {
        findUnique: jest.fn(),
        create: jest.fn(),
      },
    };
    service = new PaiementInitialisationService(mockPrisma as any);
  });

  describe('idempotence', () => {
    it('retourne le paiement existant sans en creer un nouveau', async () => {
      const existant = { id: 'p-existant', dossier_id: 'dossier-01', statut: 'EN_ATTENTE' };
      mockPrisma.paiement.findUnique.mockResolvedValue(existant);

      const result = await service.creerOuRecuperer(baseOptions);

      expect(result).toBe(existant);
      expect(mockPrisma.paiement.create).not.toHaveBeenCalled();
    });

    it('cree un paiement si aucun existant pour ce dossier', async () => {
      mockPrisma.paiement.findUnique.mockResolvedValue(null);
      const nouveau = { id: 'p-nouveau', dossier_id: 'dossier-01', statut: 'EN_ATTENTE' };
      mockPrisma.paiement.create.mockResolvedValue(nouveau);

      const result = await service.creerOuRecuperer(baseOptions);

      expect(result).toBe(nouveau);
      expect(mockPrisma.paiement.create).toHaveBeenCalledTimes(1);
    });
  });

  describe('statut EN_ATTENTE', () => {
    it('cree avec statut EN_ATTENTE par defaut et calcule expires_at', async () => {
      const before = Date.now();
      mockPrisma.paiement.findUnique.mockResolvedValue(null);
      mockPrisma.paiement.create.mockResolvedValue({ id: 'p-01', statut: 'EN_ATTENTE' });

      await service.creerOuRecuperer(baseOptions);

      const createCall = mockPrisma.paiement.create.mock.calls[0][0];
      expect(createCall.data.statut).toBe('EN_ATTENTE');
      expect(createCall.data.expires_at).toBeInstanceOf(Date);

      const expiresAt = createCall.data.expires_at as Date;
      const expectedMin = before + 72 * 60 * 60 * 1000;
      const expectedMax = Date.now() + 72 * 60 * 60 * 1000;
      expect(expiresAt.getTime()).toBeGreaterThanOrEqual(expectedMin);
      expect(expiresAt.getTime()).toBeLessThanOrEqual(expectedMax);
    });

    it('cree avec statut EN_ATTENTE explicite et expires_at calcule', async () => {
      mockPrisma.paiement.findUnique.mockResolvedValue(null);
      mockPrisma.paiement.create.mockResolvedValue({ id: 'p-02', statut: 'EN_ATTENTE' });

      await service.creerOuRecuperer({ ...baseOptions, statut: 'EN_ATTENTE' });

      const createCall = mockPrisma.paiement.create.mock.calls[0][0];
      expect(createCall.data.statut).toBe('EN_ATTENTE');
      expect(createCall.data.expires_at).toBeDefined();
    });
  });

  describe('statut CONFIRME', () => {
    it('cree avec statut CONFIRME sans expires_at', async () => {
      mockPrisma.paiement.findUnique.mockResolvedValue(null);
      mockPrisma.paiement.create.mockResolvedValue({ id: 'p-03', statut: 'CONFIRME' });

      const confirmedAt = new Date();
      await service.creerOuRecuperer({
        ...baseOptions,
        statut: 'CONFIRME',
        transaction_id: 'TX-123',
        confirmed_at: confirmedAt,
      });

      const createCall = mockPrisma.paiement.create.mock.calls[0][0];
      expect(createCall.data.statut).toBe('CONFIRME');
      expect(createCall.data.expires_at).toBeUndefined();
      expect(createCall.data.transaction_id).toBe('TX-123');
      expect(createCall.data.confirmed_at).toBe(confirmedAt);
    });
  });

  describe('champs passes correctement', () => {
    it('transmet tous les champs monetaires et methode a Prisma', async () => {
      mockPrisma.paiement.findUnique.mockResolvedValue(null);
      mockPrisma.paiement.create.mockResolvedValue({ id: 'p-04' });

      await service.creerOuRecuperer({
        dossier_id: 'dossier-02',
        montant_catalogue: 200000,
        montant_final: 170000,
        reduction_appliquee: 30000,
        methode: 'VOUCHER_PROMO',
      });

      const createCall = mockPrisma.paiement.create.mock.calls[0][0];
      expect(createCall.data.dossier_id).toBe('dossier-02');
      expect(createCall.data.montant_catalogue).toBe(200000);
      expect(createCall.data.montant_final).toBe(170000);
      expect(createCall.data.reduction_appliquee).toBe(30000);
      expect(createCall.data.methode).toBe('VOUCHER_PROMO');
    });

    it('cherche le paiement par dossier_id pour l\'idempotence', async () => {
      mockPrisma.paiement.findUnique.mockResolvedValue(null);
      mockPrisma.paiement.create.mockResolvedValue({ id: 'p-05' });

      await service.creerOuRecuperer(baseOptions);

      expect(mockPrisma.paiement.findUnique).toHaveBeenCalledWith({
        where: { dossier_id: 'dossier-01' },
      });
    });
  });
});
