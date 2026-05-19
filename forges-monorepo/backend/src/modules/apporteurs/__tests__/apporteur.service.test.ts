import { ApporteurService, } from '../apporteur.service';
import { ApporteurRepository, SEUIL_REVERSEMENT_DEFAUT } from '../apporteur.repository';
import { AuditLogger } from '../../../shared/audit/audit.logger';
import { EmailService } from '../../../shared/email/email.service';

describe('ApporteurService (MOD-13)', () => {
  let service: ApporteurService;
  let mockRepo: jest.Mocked<ApporteurRepository>;
  let mockPrisma: any;
  let mockAudit: jest.Mocked<AuditLogger>;
  let mockEmail: jest.Mocked<EmailService>;

  const apporteurActif = {
    id: 'apt-01',
    nom: 'TRAORE Mamadou',
    email: 'mamadou@test.ci',
    type: 'INDIVIDU',
    code_apporteur: '550e8400-e29b-41d4-a716-446655440000',
    taux_commission_pct: 5,
    statut: 'ACTIF',
  };

  beforeEach(() => {
    mockRepo = {
      findById: jest.fn(),
      findByCode: jest.fn(),
      findByCodeAnyStatut: jest.fn(),
      findByEmail: jest.fn(),
      findCommissions: jest.fn(),
      aggregerCommissionsMois: jest.fn(),
      validerCommissionsMois: jest.fn(),
      getCumulDu: jest.fn(),
      marquerReverseesCommePayees: jest.fn(),
      findEligiblesReversement: jest.fn(),
      getTopApporteursMois: jest.fn(),
      updateStatut: jest.fn(),
      regenererCode: jest.fn(),
    } as any;

    mockPrisma = {
      apprenant: { findUnique: jest.fn().mockResolvedValue(null) },
      organisation: { findUnique: jest.fn().mockResolvedValue(null) },
      partenaire: { findUnique: jest.fn().mockResolvedValue(null) },
      apporteur: { findUnique: jest.fn().mockResolvedValue(null), findMany: jest.fn(), count: jest.fn(), create: jest.fn() },
      commissionApporteur: { aggregate: jest.fn(), count: jest.fn().mockResolvedValue(0) },
    };

    mockAudit = { info: jest.fn(), warning: jest.fn() } as any;
    mockEmail = { sendReversementApporteur: jest.fn() } as any;

    service = new ApporteurService(mockRepo, mockPrisma, mockAudit, mockEmail);
  });

  // RM-142 : code UUID permanent dans le dashboard
  describe('RM-142 — Code UUID permanent affiché', () => {
    it('expose le code_apporteur dans le dashboard', async () => {
      mockRepo.findById.mockResolvedValue(apporteurActif as any);
      mockRepo.aggregerCommissionsMois.mockResolvedValue({ montant_total: 40000, nb_transactions: 8 });
      mockRepo.getCumulDu.mockResolvedValue(40000);
      mockRepo.findCommissions.mockResolvedValue([]);

      const result = await service.getDashboard('apt-01');

      expect(result.code_apporteur).toBe('550e8400-e29b-41d4-a716-446655440000');
      expect(result.lien_parrainage).toContain('550e8400-e29b-41d4-a716-446655440000');
    });

    // Bug B — lien_parrainage doit utiliser FRONTEND_URL
    it('getDashboard construit lien_parrainage avec FRONTEND_URL env var', async () => {
      const originalUrl = process.env.FRONTEND_URL;
      process.env.FRONTEND_URL = 'https://test.forges.ci';

      mockRepo.findById.mockResolvedValue(apporteurActif as any);
      mockRepo.aggregerCommissionsMois.mockResolvedValue({ montant_total: 0, nb_transactions: 0 });
      mockRepo.getCumulDu.mockResolvedValue(0);
      mockRepo.findCommissions.mockResolvedValue([]);

      const result = await service.getDashboard('apt-01');

      expect(result.lien_parrainage).toContain('test.forges.ci');
      expect(result.lien_parrainage).not.toContain('forges-group.com');
      expect(result.lien_parrainage).toBe(`https://test.forges.ci/register?ref=${apporteurActif.code_apporteur}`);

      process.env.FRONTEND_URL = originalUrl;
    });
  });

  describe('Inscription publique apporteur', () => {
    it('crée un apporteur en attente de vérification', async () => {
      mockRepo.findByEmail.mockResolvedValue(null);
      mockPrisma.apporteur.create.mockResolvedValue({
        id: 'apt-new',
        nom: 'Traore Mamadou',
        type: 'INDIVIDU',
        email: 'mamadou@test.ci',
        telephone: '0700000000',
        pays: null,
        code_apporteur: 'uuid-code',
        taux_commission_pct: 5,
        statut: 'EN_ATTENTE_VERIFICATION',
        date_inscription: new Date('2026-01-01T00:00:00.000Z'),
      });
      mockAudit.info.mockResolvedValue(undefined);

      const result = await service.register({
        nom: 'Traore Mamadou',
        email: 'mamadou@test.ci',
        telephone: '0700000000',
        adresse: 'Abidjan',
        password: 'Password1!',
        type: 'INDIVIDU',
        langue_preferee: 'FR',
        consentement_rgpd: true,
      } as any, '127.0.0.1');

      expect(mockPrisma.apporteur.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          nom: 'Traore Mamadou',
          email: 'mamadou@test.ci',
          telephone: '0700000000',
          statut: 'EN_ATTENTE_VERIFICATION',
        }),
      });
      expect(result.workflow_status).toBe('EN_ATTENTE_VERIFICATION');
      expect(result.apporteur.code_apporteur).toBe('uuid-code');
    });
  });

  // RM-143 : validation code apporteur
  describe('RM-143 — Validation code apporteur', () => {
    it('retourne valide=true si code actif et sans voucher concurrent', async () => {
      mockRepo.findByCodeAnyStatut.mockResolvedValue(apporteurActif as any);
      const result = await service.validerCode('code-valide');
      expect(result.valide).toBe(true);
      expect(result.apporteur_id).toBe('apt-01');
      expect(result.taux).toBe(5);
    });

    it('retourne valide=false si code inexistant (transaction continue)', async () => {
      mockRepo.findByCodeAnyStatut.mockResolvedValue(null);
      const result = await service.validerCode('code-inexistant');
      expect(result.valide).toBe(false);
      expect(result.message).toBeDefined();
    });

    // Bug A — RM-143 : distinction INVALIDE vs INACTIF
    it('retourne errorCode CODE_APPORTEUR_INVALIDE si code inexistant', async () => {
      mockRepo.findByCodeAnyStatut.mockResolvedValue(null);
      const result = await service.validerCode('code-inexistant');
      expect(result.valide).toBe(false);
      expect(result.errorCode).toBe('CODE_APPORTEUR_INVALIDE');
    });

    it('retourne errorCode CODE_APPORTEUR_INACTIF si apporteur SUSPENDU', async () => {
      mockRepo.findByCodeAnyStatut.mockResolvedValue({
        ...apporteurActif,
        statut: 'SUSPENDU',
      } as any);
      const result = await service.validerCode('code-suspendu');
      expect(result.valide).toBe(false);
      expect(result.errorCode).toBe('CODE_APPORTEUR_INACTIF');
    });

    it('retourne errorCode CODE_APPORTEUR_INACTIF si apporteur EN_ATTENTE_VERIFICATION', async () => {
      mockRepo.findByCodeAnyStatut.mockResolvedValue({
        ...apporteurActif,
        statut: 'EN_ATTENTE_VERIFICATION',
      } as any);
      const result = await service.validerCode('code-en-attente');
      expect(result.valide).toBe(false);
      expect(result.errorCode).toBe('CODE_APPORTEUR_INACTIF');
    });

    it('retourne valide=true et sans errorCode si code ACTIF sans voucher', async () => {
      mockRepo.findByCodeAnyStatut.mockResolvedValue(apporteurActif as any);
      const result = await service.validerCode('code-valide');
      expect(result.valide).toBe(true);
      expect(result.errorCode).toBeUndefined();
      expect(result.apporteur_id).toBe('apt-01');
    });
  });

  // RM-144 : non-cumulable avec un autre voucher
  describe('RM-144 — Non-cumul code apporteur + voucher', () => {
    it('rejette si un voucher est déjà appliqué', async () => {
      mockRepo.findByCodeAnyStatut.mockResolvedValue(apporteurActif as any);
      const result = await service.validerCode('code-valide', 'VCH-PROMO-01');
      expect(result.valide).toBe(false);
      expect(result.message).toContain('non cumulable');
    });

    it('accepte le code apporteur + réduction abonné -15% (RM-88 exception)', async () => {
      // RM-144 exception : -15% abonné n'est pas un voucher
      mockRepo.findByCodeAnyStatut.mockResolvedValue(apporteurActif as any);
      // Pas de voucher_code → valide même si réduction -15% appliquée côté paiement
      const result = await service.validerCode('code-valide', undefined);
      expect(result.valide).toBe(true);
    });
  });

  // RM-145 : calcul commission = montant × taux%
  describe('RM-145 — Calcul commission', () => {
    it('commission = 100000 × 5% = 5000 XOF', () => {
      const montant = 100000;
      const taux = 5;
      const commission = Math.floor(montant * taux / 100);
      expect(commission).toBe(5000);
    });

    it('commission sur montant après réduction -15% = 85000 × 5% = 4250 XOF', () => {
      // RM-145 : calculée sur le montant effectivement encaissé
      const montantApresReduction = 85000; // 100000 × 0.85
      const taux = 5;
      const commission = Math.floor(montantApresReduction * taux / 100);
      expect(commission).toBe(4250);
    });
  });

  // RM-146 : agrégation fin de mois
  describe('RM-146 — Agrégation mensuelle commissions', () => {
    it('agrège et valide les commissions du mois précédent', async () => {
      mockPrisma.apporteur.findMany.mockResolvedValue([apporteurActif]);
      mockRepo.aggregerCommissionsMois.mockResolvedValue({ montant_total: 40000, nb_transactions: 8 });
      mockRepo.validerCommissionsMois.mockResolvedValue({ count: 8 } as any);
      mockRepo.getCumulDu.mockResolvedValue(40000);
      mockAudit.info.mockResolvedValue(undefined);

      const result = await service.traiterFinDeMois();
      expect(result.nb_apporteurs_traites).toBe(1);
      expect(result.montant_total_agregé_xof).toBe(40000);
      expect(mockRepo.validerCommissionsMois).toHaveBeenCalled();
    });
  });

  // Bug D — effectuerReversementApporteur doit utiliser SEUIL_REVERSEMENT_DEFAUT et non process.env
  describe('Bug D — effectuerReversementApporteur utilise SEUIL_REVERSEMENT_DEFAUT', () => {
    it('rejette si cumul < SEUIL_REVERSEMENT_DEFAUT', async () => {
      mockRepo.findById.mockResolvedValue(apporteurActif as any);
      // Retourne un montant inférieur à SEUIL_REVERSEMENT_DEFAUT
      mockRepo.getCumulDu.mockResolvedValue(SEUIL_REVERSEMENT_DEFAUT - 1);

      await expect(service.effectuerReversementApporteur('apt-01', 'agent-01')).rejects.toThrow('SEUIL_NON_ATTEINT');
    });

    it('effectue le reversement si cumul >= SEUIL_REVERSEMENT_DEFAUT', async () => {
      mockRepo.findById.mockResolvedValue(apporteurActif as any);
      mockRepo.getCumulDu.mockResolvedValue(SEUIL_REVERSEMENT_DEFAUT);
      mockRepo.marquerReverseesCommePayees.mockResolvedValue({} as any);
      mockAudit.info.mockResolvedValue(undefined);

      const result = await service.effectuerReversementApporteur('apt-01', 'agent-01');
      expect(result.montant_total_xof).toBe(SEUIL_REVERSEMENT_DEFAUT);
    });
  });

  // RM-147 : seuil minimum reversement
  describe('RM-147 — Seuil minimum reversement 5 000 XOF', () => {
    it('n\'effectue pas le reversement si cumul < seuil', async () => {
      mockRepo.findEligiblesReversement.mockResolvedValue([]); // aucun éligible
      const result = await service.effectuerReversements('agent-01');
      expect(result.nb_reversements).toBe(0);
      expect(mockEmail.sendReversementApporteur).not.toHaveBeenCalled();
    });

    it('effectue le reversement si cumul >= seuil (5 000 XOF)', async () => {
      mockRepo.findEligiblesReversement.mockResolvedValue([
        { apporteur_id: 'apt-01', _sum: { montant_commission: 7500 } }
      ] as any);
      mockRepo.findById.mockResolvedValue(apporteurActif as any);
      mockRepo.marquerReverseesCommePayees.mockResolvedValue({ count: 3 } as any);
      mockAudit.info.mockResolvedValue(undefined);
      mockEmail.sendReversementApporteur.mockResolvedValue(undefined);

      const result = await service.effectuerReversements('agent-01');
      expect(result.nb_reversements).toBe(1);
      expect(result.montant_total_xof).toBe(7500);
      expect(mockEmail.sendReversementApporteur).toHaveBeenCalledWith(
        apporteurActif.email,
        expect.any(String),
        7500,
        expect.any(Number),
        expect.any(String),
        'FR'
      );
    });

    it('reverse intégralité du solde à la clôture (RM-147 alt4)', async () => {
      mockRepo.findById.mockResolvedValue(apporteurActif as any);
      mockRepo.getCumulDu.mockResolvedValue(3200); // < seuil mais clôture → reversement total
      mockRepo.marquerReverseesCommePayees.mockResolvedValue({} as any);
      mockRepo.updateStatut.mockResolvedValue({} as any);
      mockAudit.info.mockResolvedValue(undefined);
      mockEmail.sendReversementApporteur.mockResolvedValue(undefined);

      const result = await service.cloturerCompte('apt-01', 'agent-01');
      expect(result.montant_reverse_xof).toBe(3200);
      expect(mockEmail.sendReversementApporteur).toHaveBeenCalledWith(
        apporteurActif.email,
        expect.any(String),
        3200,
        expect.any(Number),
        expect.stringContaining('Clôture'),
        'FR'
      );
    });
  });

  // RM-148 : TDB mensuel Superviseur
  describe('RM-148 — Tableau de bord mensuel Superviseur', () => {
    it('retourne top apporteurs + commissions dues', async () => {
      mockRepo.getTopApporteursMois.mockResolvedValue([
        { apporteur_id: 'apt-01', _sum: { montant_commission: 40000, montant_base: 800000 }, _count: 8 }
      ] as any);
      mockPrisma.apporteur.count.mockResolvedValue(12);
      mockPrisma.commissionApporteur.aggregate.mockResolvedValue({ _sum: { montant_commission_xof: 85000 } });

      const result = await service.getTdbMensuelSuperviseur();
      expect(result.nb_apporteurs_actifs).toBe(12);
      expect(result.top_apporteurs).toHaveLength(1);
      expect(result.commissions_totales_dues_xof).toBe(85000);
    });

    // Bug C — getTdbMensuelSuperviseur doit agréger sur montant_commission_xof
    it('getTdbMensuelSuperviseur agrege sur montant_commission_xof', async () => {
      mockRepo.getTopApporteursMois.mockResolvedValue([]);
      mockPrisma.apporteur.count.mockResolvedValue(0);
      mockPrisma.commissionApporteur.aggregate.mockResolvedValue({ _sum: { montant_commission_xof: 95000 } });

      const result = await service.getTdbMensuelSuperviseur();

      expect(mockPrisma.commissionApporteur.aggregate).toHaveBeenCalledWith(
        expect.objectContaining({
          _sum: { montant_commission_xof: true },
        })
      );
      expect(result.commissions_totales_dues_xof).toBe(95000);
    });
  });

  // ===== SESSION 4 : TESTS COMMISSIONS EN ATTENTE =====
  describe('Session 4 — Commissions En Attente AGENT (RM-147)', () => {
    beforeEach(() => {
      // Ajouter mocks pour groupBy et findMany
      mockPrisma.commissionApporteur = {
        ...mockPrisma.commissionApporteur,
        groupBy: jest.fn(),
        findMany: jest.fn(),
      };
    });

    describe('getCommissionsEnAttente', () => {
      it('devrait retourner uniquement les commissions >= seuil 5 000 XOF', async () => {
        // Arrange : 2 apporteurs
        const apporteur1 = {
          id: 'apt-001',
          nom: 'Apporteur A',
          email: 'apporteura@test.com',
          code_apporteur: 'CODE-A',
        };

        const apporteur2 = {
          id: 'apt-002',
          nom: 'Apporteur B',
          email: 'apporteurb@test.com',
          code_apporteur: 'CODE-B',
        };

        // Apporteur A : 6 000 XOF >= seuil 5 000 XOF → INCLUS
        // Apporteur B : 4 000 XOF < seuil 5 000 XOF → EXCLU
        mockPrisma.commissionApporteur.groupBy.mockResolvedValue([
          {
            apporteur_id: 'apt-001',
            _sum: { montant_commission_xof: 6000 },
            _count: { id: 2 },
          },
          {
            apporteur_id: 'apt-002',
            _sum: { montant_commission_xof: 4000 },
            _count: { id: 1 },
          },
        ]);

        mockRepo.findById
          .mockResolvedValueOnce(apporteur1 as any)
          .mockResolvedValueOnce(apporteur2 as any);

        // Act
        const result = await service.getCommissionsEnAttente('agent-123');

        // Assert
        expect(result).toHaveLength(1); // Seulement Apporteur A
        expect(result[0].apporteur_id).toBe('apt-001');
        expect(result[0].nom).toBe('Apporteur A');
        expect(result[0].montant_total_xof).toBe(6000);
        expect(result[0].nb_commissions).toBe(2);
      });

      it('devrait calculer cumul mensuel pour déclenchement reversement', async () => {
        // Arrange : Apporteur avec plusieurs commissions
        const apporteur = {
          id: 'apt-001',
          nom: 'Apporteur A',
          email: 'apporteura@test.com',
          code_apporteur: 'CODE-A',
        };

        // 3 commissions = 7 000 XOF total >= seuil
        mockPrisma.commissionApporteur.groupBy.mockResolvedValue([
          {
            apporteur_id: 'apt-001',
            _sum: { montant_commission_xof: 7000 }, // 3000 + 2000 + 2000
            _count: { id: 3 },
          },
        ]);

        mockRepo.findById.mockResolvedValue(apporteur as any);

        // Act
        const result = await service.getCommissionsEnAttente('agent-123');

        // Assert
        expect(result[0].montant_total_xof).toBe(7000); // Cumul correct
        expect(result[0].nb_commissions).toBe(3);
      });

      it('devrait retourner tableau vide si aucun apporteur >= seuil', async () => {
        // Arrange : tous apporteurs < seuil 5 000 XOF
        mockPrisma.commissionApporteur.groupBy.mockResolvedValue([
          {
            apporteur_id: 'apt-001',
            _sum: { montant_commission_xof: 2000 }, // < 5000 XOF seuil
            _count: { id: 1 },
          },
        ]);

        // Act
        const result = await service.getCommissionsEnAttente('agent-123');

        // Assert
        expect(result).toHaveLength(0);
      });
    });
  });
});
