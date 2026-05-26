import { BotRepository } from '../bot.repository';

describe('BotRepository — new methods', () => {
  const mockPrisma = {
    apprenant: {
      findUnique: jest.fn(),
      count: jest.fn(),
    },
    organisation: {
      findUnique: jest.fn(),
    },
    abonnementB2B: {
      findFirst: jest.fn(),
    },
  } as any;

  const repo = new BotRepository(mockPrisma);

  beforeEach(() => jest.clearAllMocks());

  describe('getProfilApprenant', () => {
    it('returns apprenant profil fields', async () => {
      mockPrisma.apprenant.findUnique.mockResolvedValue({
        type_apprenant: 'PROFESSIONNEL',
        secteur_activite: 'IT',
        langue_preferee: 'FR',
        abonnement_retail: null,
      });

      const result = await repo.getProfilApprenant('a1');

      expect(mockPrisma.apprenant.findUnique).toHaveBeenCalledWith({
        where: { id: 'a1' },
        select: expect.objectContaining({ type_apprenant: true }),
      });
      expect(result?.type_apprenant).toBe('PROFESSIONNEL');
    });

    it('returns null when apprenant not found', async () => {
      mockPrisma.apprenant.findUnique.mockResolvedValue(null);
      const result = await repo.getProfilApprenant('unknown');
      expect(result).toBeNull();
    });
  });

  describe('getProfilOrganisation', () => {
    it('returns organisation langue_preferee', async () => {
      mockPrisma.organisation.findUnique.mockResolvedValue({ langue_preferee: 'EN' });
      const result = await repo.getProfilOrganisation('o1');
      expect(result?.langue_preferee).toBe('EN');
    });
  });

  describe('getAbonnementB2B', () => {
    it('returns first active B2B subscription for organisation', async () => {
      mockPrisma.abonnementB2B.findFirst.mockResolvedValue({ palier: 'STARTER', statut: 'ACTIF' });
      const result = await repo.getAbonnementB2B('o1');
      expect(result?.palier).toBe('STARTER');
    });

    it('returns null when no active B2B', async () => {
      mockPrisma.abonnementB2B.findFirst.mockResolvedValue(null);
      const result = await repo.getAbonnementB2B('o1');
      expect(result).toBeNull();
    });
  });

  describe('countApprenantsActifsOrganisation', () => {
    it('counts active apprenants for organisation', async () => {
      mockPrisma.apprenant.count.mockResolvedValue(42);
      const result = await repo.countApprenantsActifsOrganisation('o1');
      expect(mockPrisma.apprenant.count).toHaveBeenCalledWith({
        where: { organisation_id: 'o1', statut: 'ACTIF' },
      });
      expect(result).toBe(42);
    });
  });
});
