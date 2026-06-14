import { FormationService } from '../formation.service';
import { FormationRepository } from '../formation.repository';
import { AuditLogger } from '../../../shared/audit/audit.logger';

describe('FormationService', () => {
  let service: FormationService;
  let mockRepo: jest.Mocked<FormationRepository>;
  let mockAudit: jest.Mocked<AuditLogger>;
  let mockPrisma: any;

  const baseFormation = {
    id: 'f-01',
    intitule: 'Formation Test',
    type_formation: 'STANDARD',
    mode_formation: 'AVEC_SESSION',
    statut: 'EN_ATTENTE_PLANIFICATION',
    cout_catalogue: 100000,
    inclus_abonnement: false,
    pilier_abonnement: 'RETAIL',
    sessions: [],
    partenaire: null,
  };

  beforeEach(() => {
    mockRepo = {
      findById: jest.fn(),
      findAll: jest.fn(),
      findCataloguePublic: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      archiver: jest.fn(),
      publish: jest.fn(),
      assignerType: jest.fn(),
      hasPaiementsValides: jest.fn(),
      calculerInclus: jest.fn(),
      annulerDossiersEnAttente: jest.fn(),
    } as any;
    mockAudit = { info: jest.fn(), warning: jest.fn() } as any;
    mockPrisma = {
      partenaire: { findUnique: jest.fn() },
      formationPartenaire: { findUnique: jest.fn(), create: jest.fn() },
      formation: { update: jest.fn() },
      paiement: { count: jest.fn() },
      dossier: { updateMany: jest.fn() },
      accesFormationDemande: { findFirst: jest.fn(), create: jest.fn() },
    };
    service = new FormationService(mockRepo, mockAudit, mockPrisma);
  });

  // RM-102 : calcul inclus_abonnement
  describe('RM-102 — inclus_abonnement calculé automatiquement', () => {
    it('est true si STANDARD + pilier RETAIL', () => {
      const repo = new FormationRepository({} as any);
      expect(repo.calculerInclus('STANDARD', 'RETAIL')).toBe(true);
    });

    it('est true si STANDARD + pilier TOUS', () => {
      const repo = new FormationRepository({} as any);
      expect(repo.calculerInclus('STANDARD', 'TOUS')).toBe(true);
    });

    it('est false si PREMIUM (jamais inclus RM-87)', () => {
      const repo = new FormationRepository({} as any);
      expect(repo.calculerInclus('PREMIUM', 'RETAIL')).toBe(false);
    });

    it('est false si STANDARD + pilier B2B', () => {
      const repo = new FormationRepository({} as any);
      expect(repo.calculerInclus('STANDARD', 'B2B')).toBe(false);
    });

    it('est false si STANDARD + pilier INSTITUTIONNEL', () => {
      const repo = new FormationRepository({} as any);
      expect(repo.calculerInclus('STANDARD', 'INSTITUTIONNEL')).toBe(false);
    });
  });

  // RM-11 : bloquer archivage si paiements validés (protection historique)
  describe('RM-11 — Bloquer archivage si paiements validés', () => {
    it('bloque archivage si paiements validés (protection historique)', async () => {
      mockRepo.findById.mockResolvedValue(baseFormation as any);
      mockRepo.hasPaiementsValides.mockResolvedValue(true);

      await expect(service.archiver('f-01', 'user-01')).rejects.toThrow('FORMATION_HAS_PAYMENTS');
      expect(mockRepo.archiver).not.toHaveBeenCalled();
    });

    it('autorise archivage si aucun paiement validé', async () => {
      mockRepo.findById.mockResolvedValue(baseFormation as any);
      mockRepo.hasPaiementsValides.mockResolvedValue(false);
      mockRepo.annulerDossiersEnAttente.mockResolvedValue(2);
      mockRepo.archiver.mockResolvedValue({ id: 'f-01', statut: 'ARCHIVEE' } as any);
      mockAudit.info.mockResolvedValue(undefined);

      const result = await service.archiver('f-01', 'user-01');
      expect(mockRepo.archiver).toHaveBeenCalledWith('f-01');
      expect(result.statut).toBe('ARCHIVEE');
    });
  });

  // RM-12 : tarif non modifiable après 1ère inscription
  describe('RM-12 — Tarif non modifiable après inscription', () => {
    it('bloque la modification du tarif si paiements validés', async () => {
      mockRepo.findById.mockResolvedValue(baseFormation as any);
      mockRepo.hasPaiementsValides.mockResolvedValue(true);

      await expect(
        service.update('f-01', { cout_catalogue: 150000 }, 'user-01')
      ).rejects.toThrow('TARIF_NON_MODIFIABLE_APRES_INSCRIPTION');
    });

    it('permet la modification du tarif sans paiements', async () => {
      mockRepo.findById.mockResolvedValue(baseFormation as any);
      mockRepo.hasPaiementsValides.mockResolvedValue(false);
      mockRepo.update.mockResolvedValue({ ...baseFormation, cout_catalogue: 150000 } as any);
      mockAudit.info.mockResolvedValue(undefined);

      await expect(
        service.update('f-01', { cout_catalogue: 150000 }, 'user-01')
      ).resolves.toBeDefined();
    });
  });

  // RM-13 : formation archivée = lecture seule
  describe('RM-13 — Formation archivée non réactivable', () => {
    it('bloque la modification d\'une formation archivée', async () => {
      mockRepo.findById.mockResolvedValue({ ...baseFormation, statut: 'ARCHIVEE' } as any);

      await expect(
        service.update('f-01', { intitule: 'Nouveau titre' }, 'user-01')
      ).rejects.toThrow('FORMATION_ARCHIVEE');
    });

    it('bloque le ré-archivage d\'une formation déjà archivée', async () => {
      mockRepo.findById.mockResolvedValue({ ...baseFormation, statut: 'ARCHIVEE' } as any);

      await expect(service.archiver('f-01', 'user-01')).rejects.toThrow('FORMATION_DEJA_ARCHIVEE');
    });
  });

  describe('Publication formation', () => {
    it('publie une formation non archivée et propage le statut runtime', async () => {
      mockRepo.findById.mockResolvedValue(baseFormation as any);
      mockRepo.update.mockResolvedValue({ ...baseFormation, statut: 'EN_ATTENTE_PLANIFICATION' } as any);
      mockAudit.info.mockResolvedValue(undefined);

      const result = await service.publish('f-01', 'admin-01');

      expect(mockRepo.update).toHaveBeenCalledWith('f-01', { statut: 'EN_ATTENTE_PLANIFICATION' });
      expect(result.statut).toBe('EN_ATTENTE_PLANIFICATION');
    });
  });

  // RM-86 : type_formation assigné par FORGES uniquement
  describe('RM-86 — type_formation assigné par FORGES uniquement', () => {
    it('permet l\'assignation type via assignerType (Responsable)', async () => {
      mockRepo.findById.mockResolvedValue(baseFormation as any);
      mockRepo.assignerType.mockResolvedValue({
        ...baseFormation,
        type_formation: 'PREMIUM',
        pilier_abonnement: 'B2B',
        inclus_abonnement: false,
      } as any);
      mockAudit.info.mockResolvedValue(undefined);

      const result = await service.assignerType('f-01', {
        type_formation: 'PREMIUM',
        pilier_abonnement: 'B2B'
      }, 'responsable-01');

      expect(mockRepo.assignerType).toHaveBeenCalledWith('f-01', 'PREMIUM', 'B2B');
      expect(result.type_formation).toBe('PREMIUM');
    });
  });

  describe('Rattachement partenaire', () => {
    it('lie une formation existante a un partenaire et crée le dossier de validation', async () => {
      mockRepo.findById.mockResolvedValue({
        ...baseFormation,
        partenaire: null,
      } as any);
      mockPrisma.partenaire.findUnique.mockResolvedValue({
        id: 'part-01',
        statut: 'ACTIF',
        responsable_designe_id: 'resp-01',
      } as any);
      mockPrisma.formationPartenaire.findUnique.mockResolvedValue(null);
      mockPrisma.formationPartenaire.create.mockResolvedValue({ id: 'fp-01' } as any);
      mockPrisma.formation.update.mockResolvedValue({
        ...baseFormation,
        partenaire_id: 'part-01',
        statut: 'EN_ATTENTE_VALIDATION',
      } as any);
      mockAudit.info.mockResolvedValue(undefined);

      const result = await service.lierPartenaire('f-01', {
        partenaire_id: 'part-01',
        prix_coutant_soumis: 80000,
      }, 'admin-01');

      expect(mockPrisma.formationPartenaire.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          formation_id: 'f-01',
          partenaire_id: 'part-01',
          responsable_validateur_id: 'resp-01',
          prix_coutant_soumis: 80000,
          statut_validation: 'EN_ATTENTE',
          version: 1,
        }),
      });
      expect(mockPrisma.formation.update).toHaveBeenCalledWith({
        where: { id: 'f-01' },
        data: {
          partenaire_id: 'part-01',
          statut: 'EN_ATTENTE_VALIDATION',
        },
      });
      expect(result.partenaire_id).toBe('part-01');
      expect(result.fp_id).toBe('fp-01');
    });
  });

  // RM-127 : recalcul inclus_abonnement à l'assignation
  describe('RM-127 — Recalcul inclus_abonnement à la validation', () => {
    it('met inclus_abonnement à true si STANDARD + RETAIL assigné', async () => {
      mockRepo.findById.mockResolvedValue(baseFormation as any);
      mockRepo.assignerType.mockResolvedValue({
        ...baseFormation,
        type_formation: 'STANDARD',
        pilier_abonnement: 'RETAIL',
        inclus_abonnement: true,
      } as any);
      mockAudit.info.mockResolvedValue(undefined);

      const result = await service.assignerType('f-01', {
        type_formation: 'STANDARD',
        pilier_abonnement: 'RETAIL'
      }, 'responsable-01');

      expect(result.inclus_abonnement).toBe(true);
    });
  });

  // RM-20/21 : catalogue public
  describe('RM-20/21 — Catalogue public formations actives', () => {
    it('retourne uniquement les formations actives', async () => {
      mockRepo.findCataloguePublic.mockResolvedValue([
        { id: 'f-01', statut: 'ACTIVE' }
      ] as any);

      const result = await service.getCataloguePublic();
      expect(result).toHaveLength(1);
      expect(mockRepo.findCataloguePublic).toHaveBeenCalled();
    });
  });
});

// Nouveaux champs — competences_acquises, outils, chapitres
describe('champs pedagogiques — competences_acquises, outils, chapitres', () => {
  it('cree une formation avec competences_acquises et outils', async () => {
    const payload = {
      competences_acquises: ['Cybersécurité stratégique', 'Gouvernance IA'],
      outils: ['Wireshark', 'Splunk'],
    };
    const created = { ...baseFormation, ...payload };
    mockRepo.create.mockResolvedValue(created as any);

    const result = await service.create({
      intitule: 'Formation Test',
      description_courte: 'Desc',
      duree_jours: 5,
      cout_catalogue: 100000,
      mode_formation: 'PRESENTIEL',
      langues_disponibles: ['FR'],
      certification_delivree: false,
      duree_acces_jours: 365,
      ...payload,
    }, 'responsable-01');

    expect(mockRepo.create).toHaveBeenCalled();
    expect(result.competences_acquises).toEqual(payload.competences_acquises);
    expect(result.outils).toEqual(payload.outils);
  });

  it('cree une formation avec chapitres structures', async () => {
    const chapitres = [
      { ordre: 1, titre: 'Introduction', duree: '1 heure' },
      { ordre: 2, titre: 'Approfondissement' },
    ];
    const created = { ...baseFormation, chapitres };
    mockRepo.create.mockResolvedValue(created as any);

    const result = await service.create({
      intitule: 'Formation Chapitres',
      description_courte: 'Desc',
      duree_jours: 3,
      cout_catalogue: 50000,
      mode_formation: 'EN_LIGNE',
      langues_disponibles: ['FR'],
      certification_delivree: false,
      duree_acces_jours: 365,
      chapitres,
    }, 'responsable-01');

    expect(result.chapitres).toHaveLength(2);
    expect(result.chapitres[0].titre).toBe('Introduction');
  });
});
