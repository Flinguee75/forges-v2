import { AbonnementRetailService } from '../retail/abonnement-retail.service';
import { AbonnementRetailRepository, TARIFS_RETAIL } from '../retail/abonnement-retail.repository';
import { AuditLogger } from '../../../shared/audit/audit.logger';
import { EmailService } from '../../../shared/email/email.service';

// Mock NGSER en mode test (evite l'appel reseau)
process.env.NGSER_MOCK_MODE = 'true';

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
    order_ngser: 'ABO-2026-001-AAAAAA',
    transaction_id_ngser: 'tx-confirm-01',
    date_debut: new Date(Date.now() - 5 * 24 * 3600 * 1000),
    date_fin: new Date(Date.now() + 25 * 24 * 3600 * 1000),
    date_suspension: null, downgrade_planifie: null,
    consentement_auto: true,
    montant_premier_mois: 12000,
  };

  const aboActifPremium = { ...aboActifEssentiel, offre: 'PREMIUM', montant_mensuel: 25000 };

  const aboEnAttentePaiement = {
    ...aboActifEssentiel,
    statut: 'EN_ATTENTE_PAIEMENT',
    transaction_id_ngser: null,
    order_ngser: 'ABO-2026-124-BBBBBB',
  };

  beforeEach(() => {
    mockRepo = {
      findByApprenant: jest.fn(),
      findActifByApprenant: jest.fn(),
      findByOrderNgser: jest.fn(),
      activerApresPaiement: jest.fn(),
      annulerApresEchecPaiement: jest.fn(),
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
      findFormationsIncluses: jest.fn(),
    } as any;

    mockAudit = { info: jest.fn(), warning: jest.fn(), error: jest.fn() } as any;
    mockEmail = {
      sendConfirmationAbonnement: jest.fn(),
      sendUpgradeConfirmation: jest.fn(),
      sendEchecPrelevement: jest.fn(),
    } as any;

    mockPrisma = {
      abonnementRetail: {
        findUnique: jest.fn().mockResolvedValue(aboEnAttentePaiement),
      },
      accesFormationDemande: {
        updateMany: jest.fn().mockResolvedValue({ count: 0 }),
      },
    };

    service = new AbonnementRetailService(mockRepo, mockPrisma, mockAudit, mockEmail);
  });

  // ─── RM-70 : unicite abonnement Retail ───────────────────────────

  describe('RM-70 — Unicite abonnement Retail', () => {
    it('bloque si abonnement ACTIF existant', async () => {
      mockRepo.findByApprenant.mockResolvedValue(aboActifEssentiel as any);
      await expect(service.souscrire('a-01', 'ESSENTIEL', 'FR')).rejects.toThrow('ABONNEMENT_DEJA_ACTIF');
    });

    it('permet souscription si aucun abonnement', async () => {
      mockRepo.findByApprenant.mockResolvedValue(null);
      mockRepo.create.mockResolvedValue({ ...aboActifEssentiel, statut: 'ACTIF', order_ngser: 'ABO-2026-001-CCCCCC' } as any);
      mockAudit.info.mockResolvedValue(undefined);

      const result = await service.souscrire('a-01', 'ESSENTIEL', 'FR');
      expect(result).toBeDefined();
      expect(result.payment_url).toBeDefined();
      expect(result.order_ngser).toBeDefined();
    });
  });

  // ─── NGSER : souscription retourne payment_url ───────────────────

  describe('NGSER — Souscription retourne payment_url et order_ngser', () => {
    beforeEach(() => {
      mockRepo.findByApprenant.mockResolvedValue(null);
      mockAudit.info.mockResolvedValue(undefined);
    });

    it('retourne payment_url non vide apres souscription', async () => {
      mockRepo.create.mockResolvedValue({
        ...aboActifEssentiel,
        statut: 'ACTIF',
        order_ngser: 'ABO-2026-001-DDDDDD',
        id: 'abo-new-01',
      } as any);

      const result = await service.souscrire('a-01', 'ESSENTIEL', 'FR');
      expect(typeof result.payment_url).toBe('string');
      expect(result.payment_url.length).toBeGreaterThan(0);
    });

    it('retourne order_ngser au format ABO-YYYY-DDD-XXXXXX', async () => {
      mockRepo.create.mockImplementation(async (data: any) => ({
        ...aboActifEssentiel,
        statut: 'ACTIF',
        order_ngser: data.order_ngser,
        id: 'abo-new-02',
      } as any));

      const result = await service.souscrire('a-01', 'PREMIUM', 'FR');
      expect(result.order_ngser).toMatch(/^ABO-\d{4}-\d{3}-[A-F0-9]{6}$/);
    });

    it('cree l\'abonnement avec montant_mensuel correct pour ESSENTIEL', async () => {
      mockRepo.create.mockImplementation(async (data: any) => ({
        ...data, id: 'abo-ess', statut: 'ACTIF',
      } as any));

      await service.souscrire('a-01', 'ESSENTIEL', 'FR');
      expect(mockRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ montant_mensuel: TARIFS_RETAIL.ESSENTIEL })
      );
    });

    it('cree l\'abonnement avec montant_mensuel correct pour PREMIUM', async () => {
      mockRepo.create.mockImplementation(async (data: any) => ({
        ...data, id: 'abo-prem', statut: 'ACTIF',
      } as any));

      await service.souscrire('a-01', 'PREMIUM', 'FR');
      expect(mockRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ montant_mensuel: TARIFS_RETAIL.PREMIUM })
      );
    });

    it('passe order_ngser au repo.create', async () => {
      mockRepo.create.mockImplementation(async (data: any) => ({
        ...data, id: 'abo-order', statut: 'ACTIF',
      } as any));

      await service.souscrire('a-01', 'ESSENTIEL', 'FR');
      expect(mockRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ order_ngser: expect.stringMatching(/^ABO-/) })
      );
    });
  });

  // ─── Idempotence : EN_ATTENTE_PAIEMENT ───────────────────────────

  describe('Idempotence — abonnement EN_ATTENTE_PAIEMENT', () => {
    it('retourne une nouvelle session si abonnement en attente paiement', async () => {
      mockRepo.findByApprenant.mockResolvedValue(aboEnAttentePaiement as any);
      mockPrisma.abonnementRetail.findUnique.mockResolvedValue(aboEnAttentePaiement);
      mockAudit.info.mockResolvedValue(undefined);

      const result = await service.souscrire('a-01', 'ESSENTIEL', 'FR');
      expect(result.payment_url).toBeDefined();
      expect(result.order_ngser).toBe(aboEnAttentePaiement.order_ngser);
      // Ne doit pas creer un nouvel abonnement
      expect(mockRepo.create).not.toHaveBeenCalled();
    });

    it('ne bloque pas avec ABONNEMENT_DEJA_ACTIF si statut EN_ATTENTE_PAIEMENT', async () => {
      mockRepo.findByApprenant.mockResolvedValue(aboEnAttentePaiement as any);
      mockPrisma.abonnementRetail.findUnique.mockResolvedValue(aboEnAttentePaiement);
      mockAudit.info.mockResolvedValue(undefined);

      await expect(service.souscrire('a-01', 'ESSENTIEL', 'FR')).resolves.not.toThrow();
    });
  });

  // ─── RM-106 : premier mois au prorata ────────────────────────────

  describe('RM-106 — Premier mois au prorata', () => {
    it('calcule un montant prorata > 0 et <= tarif mensuel', async () => {
      mockRepo.findByApprenant.mockResolvedValue(null);
      mockRepo.create.mockImplementation(async (data: any) => ({
        ...data, id: 'abo-prorata', statut: 'ACTIF',
      } as any));
      mockAudit.info.mockResolvedValue(undefined);

      const result = await service.souscrire('a-01', 'ESSENTIEL', 'FR');
      expect(result.montant_premier_mois).toBeGreaterThan(0);
      expect(result.montant_premier_mois).toBeLessThanOrEqual(TARIFS_RETAIL.ESSENTIEL);
    });
  });

  // ─── RM-79 : upgrade immediat ────────────────────────────────────

  describe('RM-79 — Upgrade Essentiel -> Premium immediat', () => {
    it('effectue l\'upgrade avec prorata', async () => {
      mockRepo.findActifByApprenant.mockResolvedValue(aboActifEssentiel as any);
      mockRepo.upgrade.mockResolvedValue({ ...aboActifEssentiel, offre: 'PREMIUM' } as any);
      mockAudit.info.mockResolvedValue(undefined);
      mockEmail.sendUpgradeConfirmation.mockResolvedValue(undefined);

      const result = await service.upgrader('a-01', 'FR');
      expect(result.effectif).toBe('immediat');
      expect(result.montant_prorata).toBeGreaterThanOrEqual(0);
    });

    it('bloque si deja PREMIUM', async () => {
      mockRepo.findActifByApprenant.mockResolvedValue(aboActifPremium as any);
      await expect(service.upgrader('a-01', 'FR')).rejects.toThrow('DEJA_PREMIUM');
    });
  });

  // ─── RM-104 : downgrade planifie fin periode ──────────────────────

  describe('RM-104 — Downgrade planifie (non immediat)', () => {
    it('planifie sans effet immediat sur l\'offre', async () => {
      mockRepo.findActifByApprenant.mockResolvedValue(aboActifPremium as any);
      mockRepo.planifierDowngrade.mockResolvedValue({} as any);
      mockAudit.info.mockResolvedValue(undefined);

      const result = await service.planifierDowngrade('a-01');
      expect(result.effectif).toBeInstanceOf(Date);
      expect(result.message).toContain('Essentiel');
      expect(mockRepo.upgrade).not.toHaveBeenCalled();
    });
  });

  // ─── RM-76 : suspension max 1/trimestre ──────────────────────────

  describe('RM-76 — Suspension limitee a 1 fois par trimestre', () => {
    it('bloque 2eme suspension dans le meme trimestre', async () => {
      const aboSuspenduRecemment = {
        ...aboActifEssentiel,
        suspension_count: 1,
        date_suspension: new Date(Date.now() - 10 * 24 * 3600 * 1000),
      };
      mockRepo.findActifByApprenant.mockResolvedValue(aboSuspenduRecemment as any);
      await expect(service.suspendre('a-01', 'FR')).rejects.toThrow('SUSPENSION_LIMIT_ATTEINT');
    });

    it('autorise si aucune suspension ce trimestre', async () => {
      mockRepo.findActifByApprenant.mockResolvedValue({ ...aboActifEssentiel, suspension_count: 0 } as any);
      mockRepo.suspendre.mockResolvedValue({} as any);
      mockAudit.info.mockResolvedValue(undefined);
      await expect(service.suspendre('a-01', 'FR')).resolves.toBeDefined();
    });
  });

  // ─── RM-77 : resiliation fin periode ─────────────────────────────

  describe('RM-77 — Resiliation sans remboursement, acces maintenu', () => {
    it('marque EN_RESILIATION sans couper l\'acces', async () => {
      mockRepo.findActifByApprenant.mockResolvedValue(aboActifPremium as any);
      mockRepo.resilier.mockResolvedValue({} as any);
      mockAudit.info.mockResolvedValue(undefined);

      const result = await service.resilier('a-01');
      expect(result.date_fin).toBeDefined();
      expect(result.message).toContain('maintenu');
      expect(mockRepo.resilier).toHaveBeenCalled();
    });
  });

  // ─── RM-73 : grace 48h avant suspension ──────────────────────────

  describe('RM-73 — Grace 48h avant suspension', () => {
    it('suspend les graces expirees via scheduler', async () => {
      const abosGrace = [
        {
          ...aboActifEssentiel, statut: 'GRACE',
          date_grace: new Date(Date.now() - 50 * 3600 * 1000),
          apprenant: { apprenant_id: 'a-01', email: 'test@test.ci', langue_preferee: 'FR' },
        },
      ];
      mockRepo.findGracesExpirees.mockResolvedValue(abosGrace as any);
      mockRepo.suspendre.mockResolvedValue({} as any);
      mockAudit.warning.mockResolvedValue(undefined);

      const count = await service.traiterGracesExpires();
      expect(count).toBe(1);
      expect(mockRepo.suspendre).toHaveBeenCalled();
    });
  });

  // ─── Formations incluses ──────────────────────────────────────────

  describe('Formations incluses pour abonnement actif', () => {
    it('retourne la liste si abonnement actif', async () => {
      mockRepo.findActifByApprenant.mockResolvedValue(aboActifEssentiel as any);
      mockRepo.findFormationsIncluses.mockResolvedValue([
        { id: 'f-1', intitule: 'Formation incluse' },
      ] as any);

      const result = await service.getFormationsIncluses('a-01');
      expect(result).toEqual([{ id: 'f-1', intitule: 'Formation incluse' }]);
    });

    it('retourne tableau vide si aucun abonnement actif', async () => {
      mockRepo.findActifByApprenant.mockResolvedValue(null);
      const result = await service.getFormationsIncluses('a-01');
      expect(result).toEqual([]);
    });
  });

  // ─── RM-105 : suspension acces formations ────────────────────────

  describe('RM-105 — Suspension acces formations a la demande', () => {
    it('appelle suspendre lors de la suspension abonnement', async () => {
      mockRepo.findActifByApprenant.mockResolvedValue({ ...aboActifEssentiel, suspension_count: 0 } as any);
      mockRepo.suspendre.mockResolvedValue({} as any);
      mockAudit.info.mockResolvedValue(undefined);

      await service.suspendre('a-01', 'FR');
      expect(mockRepo.suspendre).toHaveBeenCalled();
    });
  });
});
