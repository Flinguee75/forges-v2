import { VoucherService } from '../voucher.service';
import { VoucherValidationService } from '../voucher-validation.service';
import { VoucherRepository } from '../voucher.repository';
import { AuditLogger } from '../../../shared/audit/audit.logger';
import { EmailService } from '../../../shared/email/email.service';

describe('VoucherService', () => {
  let service: VoucherService;
  let validationService: VoucherValidationService;
  let mockRepo: jest.Mocked<VoucherRepository>;
  let mockAudit: jest.Mocked<AuditLogger>;
  let mockEmail: jest.Mocked<EmailService>;

  const voucherActif = {
    id: 'vch-01',
    code: 'code-actif',
    type: 'ORGANISATION',
    formation_id: 'f-01',
    organisation_id: 'org-01',
    valeur: 100000,
    type_valeur: 'MONTANT',
    quota_max: 1,
    quota_utilise: 0,
    statut: 'ACTIF',
    date_expiration: new Date(Date.now() + 30 * 24 * 3600 * 1000),
    cree_par: 'org-01',
  };

  const voucherBrouillon = {
    ...voucherActif,
    id: 'vch-02',
    type: 'PROMOTIONNEL',
    statut: 'BROUILLON',
  };

  beforeEach(() => {
    mockRepo = {
      findByCode: jest.fn(),
      findById: jest.fn(),
      findByOrganisation: jest.fn(),
      findPromoEnAttente: jest.fn(),
      createBulk: jest.fn(),
      createPromo: jest.fn(),
      valider: jest.fn(),
      refuser: jest.fn(),
      utiliser: jest.fn(),
      reactiverApresRejet: jest.fn(),
      expirerVouchersExpires: jest.fn(),
      prisma: { apporteur: { findFirst: jest.fn() } }
    } as any;

    mockAudit = { info: jest.fn(), warning: jest.fn() } as any;
    mockEmail = {
      sendVouchersOrganisation: jest.fn(),
      sendVoucherRefuse: jest.fn(),
    } as any;

    service = new VoucherService(mockRepo, mockAudit, mockEmail);
    validationService = new VoucherValidationService(mockRepo);
  });

  // RM-37 : voucher lié à une formation spécifique
  describe('RM-37 — Voucher lié à une formation', () => {
    it('rejette si voucher utilisé sur mauvaise formation', async () => {
      mockRepo.findByCode.mockResolvedValue(voucherActif as any);
      await expect(
        validationService.validerVoucher('code-actif', 'f-AUTRE', 'apprenant-01')
      ).rejects.toThrow('VOUCHER_FORMATION_INCORRECTE');
    });

    it('accepte si formation correcte', async () => {
      mockRepo.findByCode.mockResolvedValue(voucherActif as any);
      const result = await validationService.validerVoucher('code-actif', 'f-01', 'apprenant-01');
      expect(result).toBeDefined();
    });
  });

  // RM-38 : usage unique
  describe('RM-38 — Usage unique par bénéficiaire', () => {
    it('rejette si quota épuisé', async () => {
      mockRepo.findByCode.mockResolvedValue({
        ...voucherActif, quota_utilise: 1, quota_max: 1, statut: 'EPUISE'
      } as any);
      await expect(
        validationService.validerVoucher('code-actif', 'f-01', 'apprenant-01')
      ).rejects.toThrow('VOUCHER_QUOTA_EPUISE');
    });
  });

  // RM-39 : workflow validation Flux B
  describe('RM-39 — Workflow validation voucher promotionnel', () => {
    it('crée en statut BROUILLON', async () => {
      mockRepo.createPromo.mockResolvedValue(voucherBrouillon as any);
      mockAudit.info.mockResolvedValue(undefined);

      const result = await service.creerVoucherPromo({
        formation_id: 'f-01',
        valeur: 20,
        type_valeur: 'POURCENTAGE',
        quota_max: 10,
        date_expiration: new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString(),
      }, 'agent-01');

      expect(mockRepo.createPromo).toHaveBeenCalledWith(
        expect.objectContaining({ cree_par: 'agent-01' })
      );
    });

    it('passe en ACTIF après validation Superviseur', async () => {
      mockRepo.findById.mockResolvedValue(voucherBrouillon as any);
      mockRepo.valider.mockResolvedValue({ ...voucherBrouillon, statut: 'ACTIF' } as any);
      mockAudit.info.mockResolvedValue(undefined);

      const result = await service.validerVoucherPromo('vch-02', 'superviseur-01');
      expect(result.statut).toBe('ACTIF');
    });

    it('bloque validation si déjà traité', async () => {
      mockRepo.findById.mockResolvedValue({ ...voucherBrouillon, statut: 'ACTIF' } as any);
      await expect(
        service.validerVoucherPromo('vch-02', 'superviseur-01')
      ).rejects.toThrow('VOUCHER_DEJA_TRAITE');
    });
  });

  // RM-40 : quota et expiration
  describe('RM-40 — Quota et expiration obligatoires', () => {
    it('rejette si voucher expiré', async () => {
      mockRepo.findByCode.mockResolvedValue({
        ...voucherActif,
        date_expiration: new Date(Date.now() - 1000), // expiré
      } as any);
      await expect(
        validationService.validerVoucher('code-actif', 'f-01', 'apprenant-01')
      ).rejects.toThrow('VOUCHER_EXPIRE');
    });

    it('expire les vouchers automatiquement via scheduler', async () => {
      mockRepo.expirerVouchersExpires.mockResolvedValue({ count: 3 } as any);
      mockAudit.info.mockResolvedValue(undefined);
      const count = await service.expirerVouchersExpires();
      expect(count).toBe(3);
    });
  });

  // RM-41 : voucher Organisation = paiement automatique
  describe('RM-41 — Génération vouchers Organisation après paiement', () => {
    it('génère N codes UUID en statut ACTIF', async () => {
      mockRepo.createBulk.mockResolvedValue({ count: 5 } as any);
      mockAudit.info.mockResolvedValue(undefined);
      mockEmail.sendVouchersOrganisation.mockResolvedValue(undefined);

      const result = await service.genererVouchersOrganisation({
        formation_id: 'f-01',
        nb_places: 5,
        montant_unitaire: 100000,
        date_expiration: new Date(Date.now() + 90 * 24 * 3600 * 1000).toISOString(),
      }, 'org-01', 'org@test.ci', 'FR');

      expect(result.nb_generes).toBe(5);
      expect(result.codes).toHaveLength(5);
      // Vérifier que chaque code est un UUID v4
      result.codes.forEach(code => {
        expect(code).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
      });
    });
  });

  // RM-42 : calcul remise voucher promo
  describe('RM-42 — Calcul remise voucher promotionnel', () => {
    it('calcule remise en montant fixe', () => {
      const remise = validationService.calculerRemise(
        { valeur: 20000, type_valeur: 'MONTANT' },
        100000
      );
      expect(remise).toBe(20000);
    });

    it('calcule remise en pourcentage', () => {
      const remise = validationService.calculerRemise(
        { valeur: 20, type_valeur: 'POURCENTAGE' },
        100000
      );
      expect(remise).toBe(20000);
    });

    it('plafonne la remise au montant catalogue', () => {
      const remise = validationService.calculerRemise(
        { valeur: 150000, type_valeur: 'MONTANT' },
        100000
      );
      expect(remise).toBe(100000); // ne peut pas dépasser le montant catalogue
    });
  });

  // RM-45 : réactivation voucher si dossier rejeté
  describe('RM-45 — Réactivation voucher après rejet dossier', () => {
    it('décrémente quota_utilise si voucher trouvé', async () => {
      mockRepo.findByCode.mockResolvedValue(voucherActif as any);
      mockRepo.reactiverApresRejet.mockResolvedValue(undefined);
      mockAudit.info.mockResolvedValue(undefined);

      await service.reactiverApresRejet('code-actif');
      expect(mockRepo.reactiverApresRejet).toHaveBeenCalledWith('vch-01');
    });
  });
});
