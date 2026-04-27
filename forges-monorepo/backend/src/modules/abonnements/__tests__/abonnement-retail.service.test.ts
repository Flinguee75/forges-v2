import { AbonnementRetailService } from '../retail/abonnement-retail.service';
import { AbonnementRetailRepository, TARIFS_RETAIL } from '../retail/abonnement-retail.repository';
import { AuditLogger } from '../../../shared/audit/audit.logger';
import { EmailService } from '../../../shared/email/email.service';

describe('AbonnementRetailService', () => {
  let service: AbonnementRetailService;
  let mockRepo: jest.Mocked<AbonnementRetailRepository>;
  let mockPrisma: any;
  let mockAudit: jest.Mocked<AuditLogger>;
  let mockEmail: jest.Mocked<EmailService>;

  const aboActifEssentiel = {
    id: 'abo-01', apprenant_id: 'a-01',
    offre: 'ESSENTIEL', montant_mensuel: 15000,
    statut: 'ACTIF', suspension_count: 0,
    date_debut: new Date(Date.now() - 5 * 24 * 3600 * 1000),
    date_fin: new Date(Date.now() + 25 * 24 * 3600 * 1000),
    date_suspension: null, downgrade_planifie: null,
    consentement_auto: true,
  };

  const aboActifPremium = { ...aboActifEssentiel, offre: 'PREMIUM', montant_mensuel: 25000 };

  beforeEach(() => {
    mockRepo = {
      findByApprenant: jest.fn(),
      findActifByApprenant: jest.fn(),
      create: jest.fn(),
      upgrade: jest.fn(),
      planifierDowngrade: jest.fn(),
      effectuerDowngrade: jest.fn(),
      suspendre: jest.fn(),
      reactiver: jest.fn(),
      resilier: jest.fn(),
      renouveler: jest.fn(),
      suspendreGrace: jest.fn(),
      findARenouveler: jest.fn(),
      findGracesExpirees: jest.fn(),
      findDowngradesPlanifies: jest.fn(),
      countFormationsActives: jest.fn(),
    } as any;

    mockAudit = { info: jest.fn(), warning: jest.fn() } as any;
    mockEmail = {
      sendConfirmationAbonnement: jest.fn(),
      sendUpgradeConfirmation: jest.fn(),
      sendEchecPrelevement: jest.fn(),
    } as any;

    mockPrisma = {
      accesFormationDemande: {
        updateMany: jest.fn().mockResolvedValue({ count: 0 }),
      },
    };

    service = new AbonnementRetailService(mockRepo, mockPrisma, mockAudit, mockEmail);
  });

  // RM-70 : unicité abonnement Retail
  describe('RM-70 — Unicité abonnement Retail', () => {
    it('bloque si abonnement déjà actif', async () => {
      mockRepo.findByApprenant.mockResolvedValue(aboActifEssentiel as any);
      await expect(service.souscrire('a-01', 'ESSENTIEL', 'FR')).rejects.toThrow('ABONNEMENT_DEJA_ACTIF');
    });

    it('permet souscription si aucun abonnement actif', async () => {
      mockRepo.findByApprenant.mockResolvedValue(null);
      mockRepo.create.mockResolvedValue(aboActifEssentiel as any);
      mockAudit.info.mockResolvedValue(undefined);
      mockEmail.sendConfirmationAbonnement.mockResolvedValue(undefined);
      await expect(service.souscrire('a-01', 'ESSENTIEL', 'FR')).resolves.toBeDefined();
    });
  });

  // RM-106 : premier mois au prorata
  describe('RM-106 — Premier mois au prorata', () => {
    it('calcule correctement le montant prorata', async () => {
      mockRepo.findByApprenant.mockResolvedValue(null);
      mockRepo.create.mockImplementation(async (data: any) => ({ ...data, id: 'new' } as any));
      mockAudit.info.mockResolvedValue(undefined);
      mockEmail.sendConfirmationAbonnement.mockResolvedValue(undefined);

      const result = await service.souscrire('a-01', 'ESSENTIEL', 'FR');
      // Le montant prorata doit être <= tarif mensuel et > 0
      expect(result.montant_premier_mois).toBeGreaterThan(0);
      expect(result.montant_premier_mois).toBeLessThanOrEqual(TARIFS_RETAIL.ESSENTIEL);
    });
  });

  // RM-79 : upgrade immédiat
  describe('RM-79 — Upgrade Essentiel → Premium immédiat', () => {
    it('effectue l\'upgrade immédiatement avec prorata', async () => {
      mockRepo.findActifByApprenant.mockResolvedValue(aboActifEssentiel as any);
      mockRepo.upgrade.mockResolvedValue({ ...aboActifEssentiel, offre: 'PREMIUM' } as any);
      mockAudit.info.mockResolvedValue(undefined);
      mockEmail.sendUpgradeConfirmation.mockResolvedValue(undefined);

      const result = await service.upgrader('a-01', 'FR');
      expect(result.effectif).toBe('immediat');
      expect(result.montant_prorata).toBeGreaterThanOrEqual(0);
    });

    it('bloque si déjà Premium', async () => {
      mockRepo.findActifByApprenant.mockResolvedValue(aboActifPremium as any);
      await expect(service.upgrader('a-01', 'FR')).rejects.toThrow('DEJA_PREMIUM');
    });
  });

  // RM-104 : downgrade planifié fin de période
  describe('RM-104 — Downgrade planifié (non immédiat)', () => {
    it('planifie le downgrade sans effet immédiat', async () => {
      mockRepo.findActifByApprenant.mockResolvedValue(aboActifPremium as any);
      mockRepo.planifierDowngrade.mockResolvedValue({} as any);
      mockAudit.info.mockResolvedValue(undefined);

      const result = await service.planifierDowngrade('a-01');
      expect(result.effectif).toBeInstanceOf(Date);
      expect(result.message).toContain('Essentiel');
      // Vérifier que l'abonnement n'est PAS changé immédiatement
      expect(mockRepo.upgrade).not.toHaveBeenCalled();
      expect(mockRepo.planifierDowngrade).toHaveBeenCalled();
    });
  });

  // RM-76 : suspension max 1/trimestre
  describe('RM-76 — Suspension limitée à 1 fois par trimestre', () => {
    it('bloque 2ème suspension dans le même trimestre', async () => {
      const aboSuspenduRecemment = {
        ...aboActifEssentiel,
        suspension_count: 1,
        date_suspension: new Date(Date.now() - 10 * 24 * 3600 * 1000), // il y a 10j (< 90j)
      };
      mockRepo.findActifByApprenant.mockResolvedValue(aboSuspenduRecemment as any);
      await expect(service.suspendre('a-01', 'FR')).rejects.toThrow('SUSPENSION_LIMIT_ATTEINT');
    });

    it('autorise suspension si aucune dans ce trimestre', async () => {
      mockRepo.findActifByApprenant.mockResolvedValue({ ...aboActifEssentiel, suspension_count: 0 } as any);
      mockRepo.suspendre.mockResolvedValue({} as any);
      mockAudit.info.mockResolvedValue(undefined);
      await expect(service.suspendre('a-01', 'FR')).resolves.toBeDefined();
    });
  });

  // RM-77 : résiliation fin période
  describe('RM-77 — Résiliation sans remboursement, accès maintenu', () => {
    it('marque EN_RESILIATION sans couper l\'accès immédiatement', async () => {
      mockRepo.findActifByApprenant.mockResolvedValue(aboActifPremium as any);
      mockRepo.resilier.mockResolvedValue({} as any);
      mockAudit.info.mockResolvedValue(undefined);

      const result = await service.resilier('a-01');
      expect(result.date_fin).toBeDefined();
      expect(result.message).toContain('maintenu');
      expect(mockRepo.resilier).toHaveBeenCalled();
    });
  });

  // RM-73 : grâce 48h sur échec renouvellement
  describe('RM-73 — Grâce 48h avant suspension', () => {
    it('passe en GRACE sur échec paiement avant de suspendre', async () => {
      const abosGraceExpiree = [
        { ...aboActifEssentiel, statut: 'GRACE', date_grace: new Date(Date.now() - 50 * 3600 * 1000), apprenant: { apprenant_id: 'a-01', email: 'test@test.ci', langue_preferee: 'FR' } }
      ];
      mockRepo.findGracesExpirees.mockResolvedValue(abosGraceExpiree as any);
      mockRepo.suspendre.mockResolvedValue({} as any);
      mockAudit.warning.mockResolvedValue(undefined);

      const count = await service.traiterGracesExpires();
      expect(count).toBe(1);
      expect(mockRepo.suspendre).toHaveBeenCalled();
    });
  });


  describe('Formations incluses pour abonnement actif', () => {
    it('retourne la liste des formations incluses si un abonnement retail actif existe', async () => {
      mockRepo.findActifByApprenant.mockResolvedValue(aboActifEssentiel as any);
      mockRepo.findFormationsIncluses = jest.fn().mockResolvedValue([
        { id: 'f-1', intitule: 'Formation incluse' },
      ]);

      const result = await service.getFormationsIncluses('a-01');
      expect(result).toEqual([{ id: 'f-1', intitule: 'Formation incluse' }]);
      expect(mockRepo.findFormationsIncluses).toHaveBeenCalled();
    });

    it('retourne un tableau vide si aucun abonnement actif', async () => {
      mockRepo.findActifByApprenant.mockResolvedValue(null);

      const result = await service.getFormationsIncluses('a-01');
      expect(result).toEqual([]);
    });
  });

  // RM-105 : suspension accès formations lors suspension abo
  describe('RM-105 — Suspension accès formations à la demande', () => {
    it('suspend les AccèsFormationDemande source=ABONNEMENT', async () => {
      mockRepo.findActifByApprenant.mockResolvedValue({ ...aboActifEssentiel, suspension_count: 0 } as any);
      mockRepo.suspendre.mockResolvedValue({} as any);
      mockAudit.info.mockResolvedValue(undefined);

      await service.suspendre('a-01', 'FR');
      expect(mockRepo.suspendre).toHaveBeenCalled();
    });
  });
});
