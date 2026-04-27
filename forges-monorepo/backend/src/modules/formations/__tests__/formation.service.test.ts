import { FormationService } from '../formation.service';
import { FormationRepository } from '../formation.repository';
import { AuditLogger } from '../../../shared/audit/audit.logger';

describe('FormationService', () => {
  let service: FormationService;
  let mockRepo: jest.Mocked<FormationRepository>;
  let mockAudit: jest.Mocked<AuditLogger>;

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
    service = new FormationService(mockRepo, mockAudit);
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
      mockRepo.archiver.mockResolvedValue({} as any);
      mockAudit.info.mockResolvedValue(undefined);

      const result = await service.archiver('f-01', 'user-01');
      expect(mockRepo.archiver).toHaveBeenCalledWith('f-01');
      expect(result.message).toContain('archivée');
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
