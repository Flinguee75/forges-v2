import { ValidationFormationService } from '../validation-formation.service';
import { PartenaireService } from '../partenaire.service';
import { FormationPartenaireRepository } from '../formation-partenaire.repository';
import { PartenaireRepository } from '../partenaire.repository';
import { AuditLogger } from '../../../shared/audit/audit.logger';
import { EmailService } from '../../../shared/email/email.service';

describe('MOD-12 — Partenaires & Validation', () => {
  let validationService: ValidationFormationService;
  let partenaireService: PartenaireService;
  let mockFpRepo: jest.Mocked<FormationPartenaireRepository>;
  let mockPartRepo: jest.Mocked<PartenaireRepository>;
  let mockPrisma: any;
  let mockAudit: jest.Mocked<AuditLogger>;
  let mockEmail: jest.Mocked<EmailService>;

  const fp = {
    id: 'fp-01',
    formation_id: 'f-01',
    partenaire_id: 'part-01',
    responsable_validateur_id: 'resp-01',
    statut_validation: 'EN_ATTENTE',
    prix_coutant_soumis: 80000,
    version: 1,
    date_soumission: new Date(Date.now() - 2 * 24 * 3600 * 1000),
    partenaire: { email_principal: 'partner@test.ci', commission_forges_pct: 30, raison_sociale: 'TestOrg' },
    formation: { intitule: 'Cybersécurité GWU' },
  };

  beforeEach(() => {
    mockFpRepo = {
      findById: jest.fn(),
      findByFormation: jest.fn(),
      findEnAttente: jest.fn(),
      create: jest.fn(),
      valider: jest.fn(),
      rejeter: jest.fn(),
      incrementerVersion: jest.fn(),
      findEnRetard: jest.fn(),
    } as any;

    mockPartRepo = {
      findById: jest.fn(),
      findByEmail: jest.fn(),
      findByToken: jest.fn(),
      create: jest.fn(),
      activer: jest.fn(),
      findFormationsPartenaire: jest.fn(),
      findReversementsNets: jest.fn(),
    } as any;

    mockPrisma = {
      formation: { create: jest.fn(), update: jest.fn(), findUnique: jest.fn() },
      partenaire: { update: jest.fn() },
      commissionPartenaire: {
        groupBy: jest.fn(),
        findMany: jest.fn(),
        updateMany: jest.fn(),
      },
      commissionPartenaireAbonnement: {
        groupBy: jest.fn(),
        findMany: jest.fn(),
        updateMany: jest.fn(),
      },
    };

    mockAudit = { info: jest.fn(), warning: jest.fn() } as any;
    mockEmail = {
      sendNouvelleFormationAValider: jest.fn(),
      sendFormationValidee: jest.fn(),
      sendFormationRejetee: jest.fn(),
      sendPartenaireApprouve: jest.fn(),
      sendReversementPartenaire: jest.fn(),
    } as any;

    validationService = new ValidationFormationService(mockFpRepo, mockPrisma, mockAudit, mockEmail);
    partenaireService = new PartenaireService(mockPartRepo, mockFpRepo, mockPrisma, mockAudit, mockEmail);
  });

  describe('RM-126 — Auto-inscription et activation partenaire', () => {
    it('refuse une auto-inscription si l’email existe déjà', async () => {
      mockPartRepo.findByEmail.mockResolvedValue({ id: 'part-01' } as any);

      await expect(partenaireService.autoInscrire({
        raison_sociale: 'Tech Formation',
        type: 'ONG',
        pays: 'CI',
        email_principal: 'partner@test.ci',
        password: 'Password1',
      })).rejects.toThrow('EMAIL_ALREADY_EXISTS');
    });

    it('crée un partenaire auto-inscrit avec les valeurs par défaut', async () => {
      mockPartRepo.findByEmail.mockResolvedValue(null);
      mockPartRepo.create.mockResolvedValue({ id: 'part-01' } as any);
      mockAudit.info.mockResolvedValue(undefined);

      const result = await partenaireService.autoInscrire({
        raison_sociale: 'Tech Formation',
        type: 'ONG',
        pays: 'CI',
        email_principal: 'partner@test.ci',
        password: 'Password1',
      });

      expect(result).toEqual({ id: 'part-01' });
      expect(mockPartRepo.create).toHaveBeenCalledWith({
        raison_sociale: 'Tech Formation',
        type: 'ONG',
        pays: 'CI',
        email_principal: 'partner@test.ci',
        commission_forges_pct: 30,
        mode_inscription: 'AUTO_INSCRIPTION',
        statut: 'EN_ATTENTE_VERIFICATION',
      });
    });

    it('rejette une activation avec token invalide', async () => {
      mockPartRepo.findByToken.mockResolvedValue(null);

      await expect(partenaireService.activerViaToken('bad-token', 'Password1'))
        .rejects
        .toThrow('TOKEN_INVALID');
    });

    it('rejette une activation avec token expiré', async () => {
      mockPartRepo.findByToken.mockResolvedValue({
        id: 'part-01',
        token_invitation_expiration: new Date(Date.now() - 1000),
      } as any);

      await expect(partenaireService.activerViaToken('expired-token', 'Password1'))
        .rejects
        .toThrow('TOKEN_EXPIRE');
    });

    it('active le partenaire via token et nettoie le token', async () => {
      mockPartRepo.findByToken.mockResolvedValue({
        id: 'part-01',
        token_invitation_expiration: new Date(Date.now() + 3600 * 1000),
      } as any);
      mockPrisma.partenaire.update.mockResolvedValue({} as any);
      mockAudit.info.mockResolvedValue(undefined);

      await expect(partenaireService.activerViaToken('valid-token', 'Password1'))
        .resolves
        .toMatchObject({ message: 'Compte Partenaire activé avec succès.' });

      expect(mockPrisma.partenaire.update).toHaveBeenCalledWith({
        where: { id: 'part-01' },
        data: {
          password_hash: expect.any(String),
          statut: 'ACTIF',
          token_invitation: null
        }
      });
    });
  });

  describe('RM-126 — Approbation admin d’un partenaire', () => {
    it('rejette si le partenaire est introuvable', async () => {
      mockPartRepo.findById.mockResolvedValue(null);

      await expect(partenaireService.approuver('part-01', 'resp-01', 'admin-01'))
        .rejects
        .toThrow('PARTENAIRE_NOT_FOUND');
    });

    it('rejette si le statut n’est pas EN_ATTENTE_VERIFICATION', async () => {
      mockPartRepo.findById.mockResolvedValue({
        id: 'part-01',
        statut: 'ACTIF',
      } as any);

      await expect(partenaireService.approuver('part-01', 'resp-01', 'admin-01'))
        .rejects
        .toThrow('STATUT_INVALIDE');
    });

    it('active et notifie le partenaire approuvé', async () => {
      mockPartRepo.findById.mockResolvedValue({
        id: 'part-01',
        statut: 'EN_ATTENTE_VERIFICATION',
        email_principal: 'partner@test.ci',
      } as any);
      mockPartRepo.activer.mockResolvedValue({} as any);
      mockAudit.info.mockResolvedValue(undefined);
      mockEmail.sendPartenaireApprouve.mockResolvedValue(undefined);

      await expect(partenaireService.approuver('part-01', 'resp-01', 'admin-01'))
        .resolves
        .toEqual({ message: 'Partenaire approuvé et activé.' });

      expect(mockPartRepo.activer).toHaveBeenCalledWith('part-01', 'resp-01');
      expect(mockEmail.sendPartenaireApprouve).toHaveBeenCalledWith('partner@test.ci', 'FR');
    });
  });

  describe('RM-136/RM-128 — Soumission et resoumission de formation', () => {
    const dto = {
      intitule: 'Formation partenaire',
      description_courte: 'Description courte',
      description_longue: 'Description longue',
      duree_jours: 3,
      mode_formation: 'AVEC_SESSION' as const,
      langues_disponibles: ['FR'] as ('FR' | 'EN' | 'ES' | 'PT')[],
      certification_delivree: false,
      objectifs_pedagogiques: ['Obj 1'],
      prix_coutant_propose: 100000,
      public_cible: 'Public',
      prerequis: 'Aucun',
    };

    it('rejette si le partenaire est absent', async () => {
      mockPartRepo.findById.mockResolvedValue(null);

      await expect(partenaireService.soumettreFormation(dto as any, 'part-01'))
        .rejects
        .toThrow('PARTENAIRE_INACTIF');
    });

    it('rejette si le partenaire est inactif', async () => {
      mockPartRepo.findById.mockResolvedValue({
        id: 'part-01',
        statut: 'SUSPENDU',
      } as any);

      await expect(partenaireService.soumettreFormation(dto as any, 'part-01'))
        .rejects
        .toThrow('PARTENAIRE_INACTIF');
    });

    it('soumet une formation sans notifier si aucun responsable n’est désigné', async () => {
      mockPartRepo.findById.mockResolvedValue({
        id: 'part-01',
        statut: 'ACTIF',
        responsable_designe_id: null,
      } as any);
      mockPrisma.formation.create.mockResolvedValue({
        id: 'formation-01',
        intitule: 'Formation partenaire',
      } as any);
      mockFpRepo.create.mockResolvedValue({ id: 'fp-01' } as any);
      mockAudit.info.mockResolvedValue(undefined);

      const result = await partenaireService.soumettreFormation(dto as any, 'part-01');

      expect(result).toEqual({
        formation_id: 'formation-01',
        fp_id: 'fp-01',
        message: 'Formation soumise en attente de validation.'
      });
      expect(mockPrisma.formation.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          responsable_id: '',
          type_formation: 'STANDARD',
          pilier_abonnement: 'RETAIL',
          partenaire_id: 'part-01',
          statut: 'EN_ATTENTE_VALIDATION',
        })
      });
      expect(mockFpRepo.create).toHaveBeenCalledWith({
        formation_id: 'formation-01',
        partenaire_id: 'part-01',
        responsable_validateur_id: undefined,
        prix_coutant_soumis: 100000,
      });
      expect(mockEmail.sendNouvelleFormationAValider).not.toHaveBeenCalled();
    });

    it('soumet une formation et notifie le responsable désigné', async () => {
      mockPartRepo.findById.mockResolvedValue({
        id: 'part-01',
        statut: 'ACTIF',
        responsable_designe_id: 'resp-01',
      } as any);
      mockPrisma.formation.create.mockResolvedValue({
        id: 'formation-01',
        intitule: 'Formation partenaire',
      } as any);
      mockFpRepo.create.mockResolvedValue({ id: 'fp-01' } as any);
      mockAudit.info.mockResolvedValue(undefined);
      mockEmail.sendNouvelleFormationAValider.mockResolvedValue(undefined);

      await partenaireService.soumettreFormation(dto as any, 'part-01');

      expect(mockPrisma.formation.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          responsable_id: 'resp-01',
        })
      });
      expect(mockFpRepo.create).toHaveBeenCalledWith(expect.objectContaining({
        responsable_validateur_id: 'resp-01',
      }));
      expect(mockEmail.sendNouvelleFormationAValider).toHaveBeenCalledWith(
        'resp-01',
        'Formation partenaire',
        'FR'
      );
    });

    it('rejette la resoumission si la formation est introuvable', async () => {
      mockFpRepo.findByFormation.mockResolvedValue(null);

      await expect(partenaireService.resoumettre('formation-01', 'part-01'))
        .rejects
        .toThrow('FORMATION_NOT_FOUND');
    });

    it('rejette la resoumission si la formation appartient à un autre partenaire', async () => {
      mockFpRepo.findByFormation.mockResolvedValue({
        partenaire_id: 'part-02',
        statut_validation: 'REJETE',
      } as any);

      await expect(partenaireService.resoumettre('formation-01', 'part-01'))
        .rejects
        .toThrow('FORMATION_NOT_FOUND');
    });

    it('rejette la resoumission si la formation n’est pas rejetée', async () => {
      mockFpRepo.findByFormation.mockResolvedValue({
        partenaire_id: 'part-01',
        statut_validation: 'VALIDE',
      } as any);

      await expect(partenaireService.resoumettre('formation-01', 'part-01'))
        .rejects
        .toThrow('FORMATION_NON_REJETEE');
    });

    it('resoumet une formation rejetée et incrémente la version', async () => {
      mockFpRepo.findByFormation.mockResolvedValue({
        partenaire_id: 'part-01',
        statut_validation: 'REJETE',
        version: 2,
      } as any);
      mockFpRepo.incrementerVersion.mockResolvedValue({} as any);
      mockPrisma.formation.update.mockResolvedValue({} as any);
      mockAudit.info.mockResolvedValue(undefined);

      await expect(partenaireService.resoumettre('formation-01', 'part-01'))
        .resolves
        .toEqual({ message: 'Formation resoumise (version 3).' });

      expect(mockPrisma.formation.update).toHaveBeenCalledWith({
        where: { id: 'formation-01' },
        data: { statut: 'EN_ATTENTE_VALIDATION' }
      });
    });
  });

  // RM-137 : calcul prix catalogue = prix_coutant / (1 - commission%)
  describe('RM-137 — Calcul prix catalogue automatique', () => {
    it('calcule correctement : 80000 / (1 - 0.30) = 114286 XOF', async () => {
      mockFpRepo.findById.mockResolvedValue(fp as any);
      mockFpRepo.valider.mockResolvedValue({} as any);
      mockPrisma.formation.update.mockResolvedValue({});
      mockAudit.info.mockResolvedValue(undefined);
      mockEmail.sendFormationValidee.mockResolvedValue(undefined);

      const result = await validationService.valider('fp-01', {
        type_formation: 'STANDARD',
        pilier_abonnement: 'RETAIL',
        prix_coutant_valide: 80000,
        responsable_id: 'resp-01',
      });

      expect(result.prix_catalogue).toBe(114286); // Math.ceil(80000/(1-0.30))
      expect(result.prix_coutant_valide).toBe(80000);
    });

    it('calcule avec commission 15% : 85000 / 0.85 = 100000 XOF', async () => {
      const fpComm15 = { ...fp, partenaire: { ...fp.partenaire, commission_forges_pct: 15 } };
      mockFpRepo.findById.mockResolvedValue(fpComm15 as any);
      mockFpRepo.valider.mockResolvedValue({} as any);
      mockPrisma.formation.update.mockResolvedValue({});
      mockAudit.info.mockResolvedValue(undefined);
      mockEmail.sendFormationValidee.mockResolvedValue(undefined);

      const result = await validationService.valider('fp-01', {
        type_formation: 'PREMIUM',
        pilier_abonnement: 'B2B',
        prix_coutant_valide: 85000,
        responsable_id: 'resp-01',
      });

      expect(result.prix_catalogue).toBe(100000); // ceil(85000/0.85)
    });
  });

  // RM-127 : type_formation assigné par FORGES uniquement
  describe('RM-127 — type_formation assigné par FORGES lors validation', () => {
    it('assigne type_formation et pilier_abonnement lors de la validation', async () => {
      mockFpRepo.findById.mockResolvedValue(fp as any);
      mockFpRepo.valider.mockResolvedValue({} as any);
      mockPrisma.formation.update.mockResolvedValue({});
      mockAudit.info.mockResolvedValue(undefined);
      mockEmail.sendFormationValidee.mockResolvedValue(undefined);

      const result = await validationService.valider('fp-01', {
        type_formation: 'STANDARD',
        pilier_abonnement: 'RETAIL',
        prix_coutant_valide: 80000,
        responsable_id: 'resp-01',
      });

      expect(result.type_formation).toBe('STANDARD');
      expect(result.pilier_abonnement).toBe('RETAIL');
      // Vérifie que formation.update est appelé avec les champs FORGES
      expect(mockPrisma.formation.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            type_formation: 'STANDARD',
            pilier_abonnement: 'RETAIL',
            statut: 'ACTIVE',
          })
        })
      );
    });

    it('calcule inclus_abonnement=true si STANDARD + RETAIL', async () => {
      mockFpRepo.findById.mockResolvedValue(fp as any);
      mockFpRepo.valider.mockResolvedValue({} as any);
      mockPrisma.formation.update.mockResolvedValue({});
      mockAudit.info.mockResolvedValue(undefined);
      mockEmail.sendFormationValidee.mockResolvedValue(undefined);

      const result = await validationService.valider('fp-01', {
        type_formation: 'STANDARD',
        pilier_abonnement: 'RETAIL',
        prix_coutant_valide: 80000,
        responsable_id: 'resp-01',
      });

      expect(result.inclus_abonnement).toBe(true);
    });

    it('calcule inclus_abonnement=false si PREMIUM', async () => {
      mockFpRepo.findById.mockResolvedValue(fp as any);
      mockFpRepo.valider.mockResolvedValue({} as any);
      mockPrisma.formation.update.mockResolvedValue({});
      mockAudit.info.mockResolvedValue(undefined);
      mockEmail.sendFormationValidee.mockResolvedValue(undefined);

      const result = await validationService.valider('fp-01', {
        type_formation: 'PREMIUM',
        pilier_abonnement: 'RETAIL',
        prix_coutant_valide: 80000,
        responsable_id: 'resp-01',
      });

      expect(result.inclus_abonnement).toBe(false);
    });
  });

  // RM-128 : motif obligatoire au rejet
  describe('RM-128 — Motif obligatoire au rejet', () => {
    it('rejette si le FP est introuvable', async () => {
      mockFpRepo.findById.mockResolvedValue(null);

      await expect(
        validationService.rejeter('fp-01', 'Motif assez long', undefined, 'resp-01')
      ).rejects.toThrow('FP_NOT_FOUND');
    });

    it('bloque si motif absent ou trop court', async () => {
      mockFpRepo.findById.mockResolvedValue(fp as any);
      await expect(
        validationService.rejeter('fp-01', 'Court', undefined, 'resp-01')
      ).rejects.toThrow('MOTIF_OBLIGATOIRE');
    });

    it('rejette avec motif suffisant', async () => {
      mockFpRepo.findById.mockResolvedValue(fp as any);
      mockFpRepo.rejeter.mockResolvedValue({} as any);
      mockPrisma.formation.update.mockResolvedValue({});
      mockAudit.warning.mockResolvedValue(undefined);
      mockEmail.sendFormationRejetee.mockResolvedValue(undefined);

      await expect(
        validationService.rejeter('fp-01', 'Le contenu est insuffisant pour certifier les apprenants.', undefined, 'resp-01')
      ).resolves.toBeDefined();
    });
  });

  // RM-128 : responsable désigné uniquement
  describe('RM-128 — Responsable désigné uniquement', () => {
    it('bloque si responsable non désigné pour ce partenaire', async () => {
      mockFpRepo.findById.mockResolvedValue(fp as any); // responsable_validateur_id = 'resp-01'
      await expect(
        validationService.valider('fp-01', {
          type_formation: 'STANDARD',
          pilier_abonnement: 'RETAIL',
          prix_coutant_valide: 80000,
          responsable_id: 'autre-resp', // pas le désigné
        })
      ).rejects.toThrow('RESPONSABLE_NON_DESIGNE');
    });

    it('rejette si la formation a déjà été traitée', async () => {
      mockFpRepo.findById.mockResolvedValue({
        ...fp,
        statut_validation: 'VALIDE',
      } as any);

      await expect(
        validationService.valider('fp-01', {
          type_formation: 'STANDARD',
          pilier_abonnement: 'RETAIL',
          prix_coutant_valide: 80000,
          responsable_id: 'resp-01',
        })
      ).rejects.toThrow('FORMATION_DEJA_TRAITEE');
    });

    it('rejette le rejet si le responsable n’est pas désigné', async () => {
      mockFpRepo.findById.mockResolvedValue(fp as any);

      await expect(
        validationService.rejeter('fp-01', 'Le contenu est insuffisant pour certifier les apprenants.', undefined, 'autre-resp')
      ).rejects.toThrow('RESPONSABLE_NON_DESIGNE');
    });
  });

  describe('RM-131/RM-134 — Suspension et alertes validation', () => {
    it('rejette la suspension si la formation est introuvable', async () => {
      mockPrisma.formation.findUnique.mockResolvedValue(null);

      await expect(validationService.suspendre('formation-01', 'Motif', 'resp-01'))
        .rejects
        .toThrow('FORMATION_NOT_FOUND');
    });

    it('rejette la suspension si la formation n’est pas active', async () => {
      mockPrisma.formation.findUnique.mockResolvedValue({
        id: 'formation-01',
        statut: 'REJETEE',
      } as any);

      await expect(validationService.suspendre('formation-01', 'Motif', 'resp-01'))
        .rejects
        .toThrow('FORMATION_NON_ACTIVE');
    });

    it('suspend une formation active et journalise l’action', async () => {
      mockPrisma.formation.findUnique.mockResolvedValue({
        id: 'formation-01',
        statut: 'ACTIVE',
        partenaire: { id: 'part-01' },
      } as any);
      mockPrisma.formation.update.mockResolvedValue({} as any);
      mockAudit.warning.mockResolvedValue(undefined);

      await expect(validationService.suspendre('formation-01', 'Motif', 'resp-01'))
        .resolves
        .toEqual({ message: 'Formation suspendue.' });

      expect(mockPrisma.formation.update).toHaveBeenCalledWith({
        where: { id: 'formation-01' },
        data: { statut: 'SUSPENDUE' }
      });
    });

    it('alerte les formations en retard et retourne leur nombre', async () => {
      mockFpRepo.findEnRetard.mockResolvedValue([
        { formation_id: 'f-01', date_soumission: new Date(Date.now() - 7 * 24 * 3600 * 1000), partenaire: { raison_sociale: 'Org A' } },
        { formation_id: 'f-02', date_soumission: new Date(Date.now() - 10 * 24 * 3600 * 1000), partenaire: { raison_sociale: 'Org B' } },
      ] as any);
      mockAudit.warning.mockResolvedValue(undefined);

      await expect(validationService.alerterFormationsEnRetard()).resolves.toBe(2);
      expect(mockAudit.warning).toHaveBeenCalledTimes(2);
    });

    it('retourne les formations en attente pour un responsable', async () => {
      mockFpRepo.findEnAttente.mockResolvedValue([{ id: 'fp-01' }] as any);

      await expect(validationService.getFormationsEnAttente('resp-01')).resolves.toEqual([{ id: 'fp-01' }]);
    });
  });

  // RM-130 : dashboard partenaire sans commission FORGES
  describe('RM-130 — Dashboard Partenaire — commission FORGES masquée', () => {
    it('ne retourne pas commission_forges_pct ni prix_catalogue', async () => {
      mockPartRepo.findFormationsPartenaire.mockResolvedValue([
        { id: 'f-01', intitule: 'Test', statut: 'ACTIVE', formation_partenaire: { statut_validation: 'VALIDE' }, _count: { dossiers: 10 } }
      ] as any);
      mockPartRepo.findReversementsNets.mockResolvedValue([
        { montant_reverse: 80000, statut: 'EN_ATTENTE', created_at: new Date() }
      ] as any);

      const result = await partenaireService.getDashboard('part-01');

      // Vérifier que les formations n'exposent PAS commission/prix catalogue
      result.formations.forEach((f: any) => {
        expect(f.commission_forges_pct).toBeUndefined();
        expect(f.prix_catalogue).toBeUndefined();
      });

      // Vérifier que les reversements n'exposent PAS commission FORGES
      expect((result.reversements as any).commission_forges_pct).toBeUndefined();
      expect(result.reversements.en_attente_xof).toBe(80000);
    });
  });

  // ===== SESSION 4 : TESTS REVERSEMENTS =====
  describe('Session 4 — Reversements AGENT (RM-138)', () => {
    beforeEach(() => {
      // Seuil par défaut : 50 000 XOF = 5 000 000 centimes
      process.env.SEUIL_REVERSEMENT_PARTENAIRE_XOF = '5000000';
    });

    describe('getReversementsEnAttente', () => {
      it('devrait retourner uniquement les reversements >= seuil 50 000 XOF', async () => {
        // Arrange : 2 partenaires
        const partenaire1 = {
          id: 'p-001',
          raison_sociale: 'Partner A',
          email_principal: 'partnera@test.com',
        };

        const partenaire2 = {
          id: 'p-002',
          raison_sociale: 'Partner B',
          email_principal: 'partnerb@test.com',
        };

        // Partner A : 6 000 000 centimes (60 000 XOF) >= seuil → INCLUS
        (mockPrisma.commissionPartenaire.groupBy as jest.Mock).mockResolvedValue([
          {
            partenaire_id: 'p-001',
            _sum: { montant_reverse: 6000000 },
            _count: { id: 2 },
          },
          // Partner B : 4 000 000 centimes (40 000 XOF) < seuil → EXCLU
          {
            partenaire_id: 'p-002',
            _sum: { montant_reverse: 4000000 },
            _count: { id: 1 },
          },
        ]);

        // Pas de commissions abonnement
        (mockPrisma.commissionPartenaireAbonnement.groupBy as jest.Mock).mockResolvedValue([]);

        // Mock findById : retourner les partenaires
        mockPartRepo.findById
          .mockResolvedValueOnce(partenaire1 as any)
          .mockResolvedValueOnce(partenaire2 as any);

        // Act
        const result = await partenaireService.getReversementsEnAttente('agent-123');

        // Assert
        expect(result).toHaveLength(1); // Seulement Partner A
        expect(result[0].partenaire_id).toBe('p-001');
        expect(result[0].raison_sociale).toBe('Partner A');
        expect(result[0].montant_total_xof).toBe(6000000);
        expect(result[0].nb_commissions).toBe(2);
      });

      it('devrait fusionner commissions retail + abonnement par partenaire (RM-132)', async () => {
        // Arrange : Partner A avec retail + abonnement
        const partenaire = {
          id: 'p-001',
          raison_sociale: 'Partner A',
          email_principal: 'partnera@test.com',
        };

        // Retail : 3 000 000 centimes
        (mockPrisma.commissionPartenaire.groupBy as jest.Mock).mockResolvedValue([
          {
            partenaire_id: 'p-001',
            _sum: { montant_reverse: 3000000 },
            _count: { id: 2 },
          },
        ]);

        // Abonnement : 3 500 000 centimes
        (mockPrisma.commissionPartenaireAbonnement.groupBy as jest.Mock).mockResolvedValue([
          {
            partenaire_id: 'p-001',
            _sum: { montant_reverse: 3500000 },
            _count: { id: 1 },
          },
        ]);

        mockPartRepo.findById.mockResolvedValue(partenaire as any);

        // Act
        const result = await partenaireService.getReversementsEnAttente('agent-123');

        // Assert
        expect(result).toHaveLength(1);
        expect(result[0].montant_total_xof).toBe(6500000); // Fusion retail + abonnement
        expect(result[0].nb_commissions).toBe(3); // 2 retail + 1 abonnement
      });

      it('devrait retourner tableau vide si aucun partenaire >= seuil', async () => {
        // Arrange : tous partenaires < seuil
        (mockPrisma.commissionPartenaire.groupBy as jest.Mock).mockResolvedValue([
          {
            partenaire_id: 'p-001',
            _sum: { montant_reverse: 2000000 }, // < seuil
            _count: { id: 1 },
          },
        ]);

        (mockPrisma.commissionPartenaireAbonnement.groupBy as jest.Mock).mockResolvedValue([]);

        // Act
        const result = await partenaireService.getReversementsEnAttente('agent-123');

        // Assert
        expect(result).toHaveLength(0);
      });
    });

    describe('effectuerReversementPartenaire', () => {
      it('devrait rejeter si montant total < seuil (RM-138)', async () => {
        // Arrange : commissions < seuil
        const partenaire = {
          id: 'p-001',
          raison_sociale: 'Partner A',
          email_principal: 'partnera@test.com',
        };

        mockPartRepo.findById.mockResolvedValue(partenaire as any);

        // Retail : 4 000 000 centimes (< seuil 5 000 000)
        (mockPrisma.commissionPartenaire.findMany as jest.Mock).mockResolvedValue([
          { id: 'c-001', montant_reverse: 4000000, statut: 'EN_ATTENTE' },
        ]);

        // Pas d'abonnement
        (mockPrisma.commissionPartenaireAbonnement.findMany as jest.Mock).mockResolvedValue([]);

        // Act & Assert
        await expect(
          partenaireService.effectuerReversementPartenaire('p-001', 'agent-123', {})
        ).rejects.toThrow('SEUIL_NON_ATTEINT');

        // Vérifier qu'aucune modification n'a été faite
        expect(mockPrisma.commissionPartenaire.updateMany).not.toHaveBeenCalled();
        expect(mockEmail.sendReversementPartenaire).not.toHaveBeenCalled();
      });

      it('devrait effectuer reversement si >= seuil et envoyer email', async () => {
        // Arrange
        const partenaire = {
          id: 'p-001',
          raison_sociale: 'Partner A',
          email_principal: 'partnera@test.com',
          langue_preferee: 'FR',
        };

        mockPartRepo.findById.mockResolvedValue(partenaire as any);

        // Retail : 6 000 000 centimes (>= seuil)
        (mockPrisma.commissionPartenaire.findMany as jest.Mock).mockResolvedValue([
          { id: 'c-001', montant_reverse: 3000000, statut: 'EN_ATTENTE' },
          { id: 'c-002', montant_reverse: 3000000, statut: 'EN_ATTENTE' },
        ]);

        // Pas d'abonnement
        (mockPrisma.commissionPartenaireAbonnement.findMany as jest.Mock).mockResolvedValue([]);

        (mockPrisma.commissionPartenaire.updateMany as jest.Mock).mockResolvedValue({ count: 2 });
        (mockPrisma.commissionPartenaireAbonnement.updateMany as jest.Mock).mockResolvedValue({
          count: 0,
        });

        mockEmail.sendReversementPartenaire.mockResolvedValue(undefined as any);
        mockAudit.info.mockResolvedValue(undefined);

        const dateExecution = new Date('2026-04-19');

        // Act
        const result = await partenaireService.effectuerReversementPartenaire('p-001', 'agent-123', {
          date_execution: dateExecution,
          preuve_virement: 'VIREMENT-001.pdf',
        });

        // Assert
        expect(result.success).toBe(true);
        expect(result.montant_reverse_xof).toBe(6000000);
        expect(result.nb_commissions).toBe(2);

        // Vérifier transition statut EN_ATTENTE → REVERSE
        expect(mockPrisma.commissionPartenaire.updateMany).toHaveBeenCalledWith({
          where: { partenaire_id: 'p-001', statut: 'EN_ATTENTE' },
          data: {
            statut: 'REVERSE',
            reverse_le: dateExecution,
            reverse_par: 'agent-123',
          },
        });

        // Vérifier email envoyé (signature: email, raison_sociale, montant, nb_commissions, periode, langue)
        expect(mockEmail.sendReversementPartenaire).toHaveBeenCalledWith(
          'partnera@test.com',
          'Partner A',
          6000000,
          2,
          expect.any(String), // periode
          'FR'
        );

        // Vérifier AuditLog
        expect(mockAudit.info).toHaveBeenCalledWith(
          'REVERSEMENT_PARTENAIRE_EFFECTUE',
          expect.objectContaining({
            partenaire_id: 'p-001',
            agent_id: 'agent-123',
            montant_xof: 6000000,
          })
        );
      });
    });
  });
});
