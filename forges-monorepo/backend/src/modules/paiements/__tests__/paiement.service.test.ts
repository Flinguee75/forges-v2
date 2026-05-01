import { PaiementService } from '../paiement.service';
import { PaiementRepository } from '../paiement.repository';
import { CommissionRepository } from '../commission.repository';
import { VoucherRepository } from '../../vouchers/voucher.repository';
import { AuditLogger } from '../../../shared/audit/audit.logger';
import { EmailService } from '../../../shared/email/email.service';

describe('PaiementService', () => {
  let service: PaiementService;
  let mockPaiementRepo: jest.Mocked<PaiementRepository>;
  let mockCommissionRepo: jest.Mocked<CommissionRepository>;
  let mockVoucherRepo: jest.Mocked<VoucherRepository>;
  let mockPrisma: any;
  let mockAudit: jest.Mocked<AuditLogger>;
  let mockEmail: jest.Mocked<EmailService>;

  const dossierStandard = {
    id: 'd-01',
    apprenant_id: 'a-01',
    formation_id: 'f-01',
    session_id: 's-01',
    statut: 'PAYE_DIRECTEMENT',
    voucher_code: null,
    code_apporteur: null,
    formation: {
      id: 'f-01',
      intitule: 'Formation Test',
      cout_catalogue: 100000,
      type_formation: 'STANDARD',
      partenaire_id: null,
      partenaire: null,
    },
    apprenant: { email: 'test@test.ci', langue_preferee: 'FR' }
  };

  const dossierPremium = {
    ...dossierStandard,
    statut: 'RETENU',
    formation: { ...dossierStandard.formation, type_formation: 'PREMIUM', cout_catalogue: 200000 }
  };

  beforeEach(() => {
    mockPaiementRepo = {
      findById: jest.fn(),
      findByDossierId: jest.fn(),
      findByTransactionId: jest.fn(),
      create: jest.fn(),
      incrementerTentatives: jest.fn(),
      confirmer: jest.fn(),
      echouer: jest.fn(),
      findPaiementsExpires: jest.fn(),
      sumMontant: jest.fn(),
      countByStatut: jest.fn(),
    } as any;

    mockCommissionRepo = {
      creerCommissionPartenaire: jest.fn(),
      creerCommissionApporteur: jest.fn(),
      getTotalReversementsPartenaireAReverser: jest.fn(),
      getPartenairesEligiblesReversement: jest.fn(),
      effectuerReversementPartenaire: jest.fn(),
      getTotalCommissionsApporteur: jest.fn(),
    } as any;

    mockVoucherRepo = {
      findByCode: jest.fn(),
      utiliser: jest.fn(),
      reactiverApresRejet: jest.fn(),
    } as any;

    mockPrisma = {
      dossier: { findUnique: jest.fn(), update: jest.fn() },
      session: { update: jest.fn() },
      abonnementRetail: { findFirst: jest.fn() },
      apporteur: { findFirst: jest.fn() },
      paiement: { findMany: jest.fn() },
    };

    mockAudit = { info: jest.fn(), warning: jest.fn() } as any;
    mockEmail = {
      sendPaiementConfirme: jest.fn(),
      sendDossierAnnuleExpiration: jest.fn(),
    } as any;

    service = new PaiementService(
      mockPaiementRepo, mockCommissionRepo, mockVoucherRepo,
      mockPrisma, mockAudit, mockEmail
    );
  });

  // RM-06 : paiement unique par dossier
  describe('RM-06 — Paiement unique par dossier', () => {
    it('rejette si le dossier est introuvable, interdit ou dans un statut invalide', async () => {
      mockPrisma.dossier.findUnique.mockResolvedValueOnce(null);
      await expect(
        service.initierPaiement({ dossier_id: 'd-01', methode: 'MOBILE_MONEY' }, 'a-01')
      ).rejects.toThrow('DOSSIER_NOT_FOUND');

      mockPrisma.dossier.findUnique.mockResolvedValueOnce({
        ...dossierStandard,
        apprenant_id: 'other-user',
      });
      await expect(
        service.initierPaiement({ dossier_id: 'd-01', methode: 'MOBILE_MONEY' }, 'a-01')
      ).rejects.toThrow('FORBIDDEN');

      mockPrisma.dossier.findUnique.mockResolvedValueOnce({
        ...dossierStandard,
        statut: 'BROUILLON',
      });
      await expect(
        service.initierPaiement({ dossier_id: 'd-01', methode: 'MOBILE_MONEY' }, 'a-01')
      ).rejects.toThrow('DOSSIER_STATUT_INVALIDE');
    });

    it('réutilise le paiement existant si non expiré', async () => {
      mockPrisma.dossier.findUnique.mockResolvedValue(dossierStandard);
      mockPaiementRepo.findByDossierId.mockResolvedValue({
        id: 'p-01',
        montant_final: 100000,
        tentatives: 0,
        expires_at: new Date(Date.now() + 24 * 3600 * 1000), // non expiré
      } as any);
      mockPaiementRepo.incrementerTentatives.mockResolvedValue({} as any);

      const result = await service.initierPaiement(
        { dossier_id: 'd-01', methode: 'MOBILE_MONEY' }, 'a-01'
      );
      expect(result.paiement_id).toBe('p-01');
      expect(mockPaiementRepo.create).not.toHaveBeenCalled();
    });
  });

  // RM-07 : délai paiement 72h
  describe('RM-07 — Délai paiement 72h', () => {
    it('rejette si paiement expiré', async () => {
      mockPrisma.dossier.findUnique.mockResolvedValue(dossierStandard);
      mockPaiementRepo.findByDossierId.mockResolvedValue({
        id: 'p-01',
        tentatives: 0,
        expires_at: new Date(Date.now() - 1000), // expiré
      } as any);

      await expect(
        service.initierPaiement({ dossier_id: 'd-01', methode: 'MOBILE_MONEY' }, 'a-01')
      ).rejects.toThrow('PAYMENT_EXPIRED');
    });

    it('crée expires_at à 72h lors de l\'initiation', async () => {
      mockPrisma.dossier.findUnique.mockResolvedValue(dossierStandard);
      mockPaiementRepo.findByDossierId.mockResolvedValue(null);
      mockPrisma.abonnementRetail.findFirst.mockResolvedValue(null);
      mockPaiementRepo.create.mockResolvedValue({ id: 'p-new', montant_final: 100000 } as any);
      mockAudit.info.mockResolvedValue(undefined);

      await service.initierPaiement({ dossier_id: 'd-01', methode: 'MOBILE_MONEY' }, 'a-01');

      const createCall = mockPaiementRepo.create.mock.calls[0][0];
      const diff = createCall.expires_at.getTime() - Date.now();
      expect(diff).toBeGreaterThan(71 * 3600 * 1000);
      expect(diff).toBeLessThan(73 * 3600 * 1000);
    });

    it('annule les dossiers avec paiements expirés', async () => {
      const paiementExpire = {
        id: 'p-expired',
        dossier_id: 'd-01',
        dossier: { ...dossierStandard, voucher_code: null, session_id: 's-01' }
      };
      mockPaiementRepo.findPaiementsExpires.mockResolvedValue([paiementExpire] as any);
      mockPaiementRepo.echouer.mockResolvedValue({} as any);
      mockPrisma.dossier.update.mockResolvedValue({} as any);
      mockPrisma.session.update.mockResolvedValue({} as any);
      mockPrisma.dossier.findUnique.mockResolvedValue({
        ...dossierStandard,
        apprenant: { email: 'test@test.ci', langue_preferee: 'FR' }
      });
      mockAudit.warning.mockResolvedValue(undefined);
      mockEmail.sendDossierAnnuleExpiration.mockResolvedValue(undefined);

      const count = await service.annulerPaiementsExpires();
      expect(count).toBe(1);
      expect(mockPrisma.dossier.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { statut: 'ANNULE' } })
      );
    });
  });

  // RM-08 : max 3 tentatives
  describe('RM-08 — Maximum 3 tentatives', () => {
    it('bloque après 3 tentatives', async () => {
      mockPrisma.dossier.findUnique.mockResolvedValue(dossierStandard);
      mockPaiementRepo.findByDossierId.mockResolvedValue({
        id: 'p-01',
        tentatives: 3, // max atteint
        expires_at: new Date(Date.now() + 24 * 3600 * 1000),
        montant_final: 100000,
      } as any);

      await expect(
        service.initierPaiement({ dossier_id: 'd-01', methode: 'MOBILE_MONEY' }, 'a-01')
      ).rejects.toThrow('TOO_MANY_ATTEMPTS');
    });

    it('accepte si tentatives < 3', async () => {
      mockPrisma.dossier.findUnique.mockResolvedValue(dossierStandard);
      mockPaiementRepo.findByDossierId.mockResolvedValue({
        id: 'p-01',
        tentatives: 2, // encore une tentative possible
        expires_at: new Date(Date.now() + 24 * 3600 * 1000),
        montant_final: 100000,
      } as any);
      mockPaiementRepo.incrementerTentatives.mockResolvedValue({} as any);

      await expect(
        service.initierPaiement({ dossier_id: 'd-01', methode: 'MOBILE_MONEY' }, 'a-01')
      ).resolves.toBeDefined();
    });
  });

  // RM-88 : réduction -15% abonné Premium
  describe('RM-88 — Réduction -15% abonné actif sur Premium', () => {
    it('applique un voucher promotionnel en montant fixe', async () => {
      mockVoucherRepo.findByCode.mockResolvedValue({
        id: 'voucher-01',
        type: 'PROMOTIONNEL',
        type_valeur: 'MONTANT',
        valeur: 25000,
      } as any);

      const montant = await service.calculerMontantFinal({
        ...dossierStandard,
        voucher_code: 'PROMO25',
      }, 'a-01');

      expect(mockVoucherRepo.findByCode).toHaveBeenCalledWith('PROMO25');
      expect(montant).toBe(75000);
    });

    it('applique un voucher promotionnel en pourcentage', async () => {
      mockVoucherRepo.findByCode.mockResolvedValue({
        id: 'voucher-02',
        type: 'PROMOTIONNEL',
        type_valeur: 'POURCENTAGE',
        valeur: 10,
      } as any);

      const montant = await service.calculerMontantFinal({
        ...dossierStandard,
        voucher_code: 'PROMO10',
      }, 'a-01');

      expect(montant).toBe(90000);
    });

    it('applique -15% si abonné actif + formation Premium', async () => {
      mockPrisma.abonnementRetail.findFirst.mockResolvedValue({ statut: 'ACTIF' });
      const montant = await service.calculerMontantFinal(dossierPremium, 'a-01');
      expect(montant).toBe(170000); // 200000 × 0.85
    });

    it('ne réduit pas si formation Standard', async () => {
      mockPrisma.abonnementRetail.findFirst.mockResolvedValue({ statut: 'ACTIF' });
      mockVoucherRepo.findByCode.mockResolvedValue(null);
      const montant = await service.calculerMontantFinal(dossierStandard, 'a-01');
      expect(montant).toBe(100000); // pas de réduction
    });

    it('ne réduit pas si non abonné', async () => {
      mockPrisma.abonnementRetail.findFirst.mockResolvedValue(null);
      const montant = await service.calculerMontantFinal(dossierPremium, 'a-01');
      expect(montant).toBe(200000); // plein tarif
    });
  });

  // RM-129 : commission partenaire
  describe('RM-129 — Calcul commission partenaire', () => {
    it('calcule le montant reversé = montant × (1 - commission%)', async () => {
      const paiement = { id: 'p-01', montant_final: 100000, montant_catalogue: 100000 };
      const dossierPartenaire = {
        ...dossierStandard,
        formation: {
          ...dossierStandard.formation,
          partenaire_id: 'part-01',
          partenaire: { commission_forges_pct: 20 }
        }
      };

      mockPrisma.dossier.findUnique.mockResolvedValue(dossierPartenaire);
      mockCommissionRepo.creerCommissionPartenaire.mockResolvedValue({} as any);
      mockCommissionRepo.creerCommissionApporteur.mockResolvedValue({} as any);
      mockAudit.info.mockResolvedValue(undefined);

      await service.calculerCommissions(paiement, 'd-01');

      expect(mockCommissionRepo.creerCommissionPartenaire).toHaveBeenCalledWith(
        expect.objectContaining({
          montant_reverse: 80000, // 100000 × (1 - 0.20) = 80000
          commission_forges_pct: 20,
        })
      );
    });
  });

  // RM-145 : commission apporteur
  describe('RM-145 — Calcul commission apporteur', () => {
    it('calcule la commission = montant × taux%', async () => {
      const paiement = { id: 'p-01', montant_final: 100000, montant_catalogue: 100000 };
      const dossierApporteur = { ...dossierStandard, code_apporteur: 'uuid-apporteur' };

      mockPrisma.dossier.findUnique.mockResolvedValue(dossierApporteur);
      mockPrisma.apporteur.findFirst.mockResolvedValue({
        id: 'apt-01',
        taux_commission_pct: 5,
      });
      mockCommissionRepo.creerCommissionPartenaire.mockResolvedValue({} as any);
      mockCommissionRepo.creerCommissionApporteur.mockResolvedValue({} as any);
      mockAudit.info.mockResolvedValue(undefined);

      await service.calculerCommissions(paiement, 'd-01');

      expect(mockCommissionRepo.creerCommissionApporteur).toHaveBeenCalledWith(
        expect.objectContaining({
          montant_commission: 5000, // 100000 × 5% = 5000
          taux_commission_pct: 5,
        })
      );
    });
  });

  // RM-139 : reversement partenaire seuil 50 000 XOF
  describe('RM-139 — Reversement partenaire seuil 50 000 XOF', () => {
    it('effectue les reversements pour partenaires éligibles', async () => {
      mockCommissionRepo.getPartenairesEligiblesReversement.mockResolvedValue([
        { partenaire_id: 'part-01', _sum: { montant_reverse: 75000 } }
      ] as any);
      mockCommissionRepo.effectuerReversementPartenaire.mockResolvedValue({} as any);
      mockAudit.info.mockResolvedValue(undefined);

      const result = await service.effectuerReversementsPartenaires('agent-01');
      expect(result.nb_reversements).toBe(1);
      expect(result.montant_total).toBe(75000);
    });
  });

  // Idempotence webhook
  describe('Idempotence webhook', () => {
    it('ignore un webhook déjà traité', async () => {
      mockPaiementRepo.findByTransactionId.mockResolvedValue({ id: 'p-01' } as any);

      const result = await service.confirmerPaiement({
        transaction_id: 'tx-already',
        dossier_id: 'd-01',
        statut: 'SUCCESS',
        montant: 100000,
      });

      expect(result.message).toBe('ALREADY_PROCESSED');
      expect(mockPrisma.dossier.update).not.toHaveBeenCalled();
    });

    it('confirme un paiement, calcule la commission apporteur, consomme le voucher et notifie', async () => {
      const realCalculerCommissions = service.calculerCommissions.bind(service);
      const calculerCommissionsSpy = jest
        .spyOn(service, 'calculerCommissions')
        .mockImplementationOnce(async (paiement: any, dossierId: string) => {
          expect(paiement).toMatchObject({
            id: 'p-01',
            dossier_id: 'd-01',
          });
          expect(dossierId).toBe('d-01');

          await realCalculerCommissions({
            id: 'p-01',
            dossier_id: 'd-01',
            montant_final: 100000,
            montant_catalogue: 100000,
          }, 'd-01');
        });

      mockPaiementRepo.findByTransactionId.mockResolvedValueOnce(null);
      mockPaiementRepo.findByDossierId.mockResolvedValueOnce({
        id: 'p-01',
        dossier_id: 'd-01',
        montant_final: 100000,
      } as any);
      mockPaiementRepo.confirmer.mockResolvedValueOnce({} as any);
      mockPrisma.dossier.update.mockResolvedValueOnce({} as any);
      mockPrisma.dossier.findUnique
        .mockResolvedValueOnce({
          id: 'd-01',
          voucher_code: 'PROMO10',
          code_apporteur: 'uuid-apporteur',
          formation: {
            ...dossierStandard.formation,
            partenaire_id: null,
            partenaire: null,
          },
          apprenant: dossierStandard.apprenant,
        } as any)
        .mockResolvedValueOnce({
          id: 'd-01',
          voucher_code: 'PROMO10',
          apprenant: { email: 'test@test.ci', langue_preferee: 'FR' },
          formation: { intitule: 'Formation Test' },
        } as any)
        .mockResolvedValueOnce({
          id: 'd-01',
          apprenant: { email: 'test@test.ci', langue_preferee: 'FR' },
          formation: { intitule: 'Formation Test' },
        } as any);
      mockVoucherRepo.findByCode.mockResolvedValueOnce({ id: 'voucher-01' } as any);
      mockVoucherRepo.utiliser.mockResolvedValueOnce({} as any);
      mockPrisma.apporteur.findFirst.mockResolvedValueOnce({
        id: 'apt-01',
        taux_commission_pct: 5,
      });
      mockCommissionRepo.creerCommissionApporteur.mockResolvedValueOnce({} as any);
      mockAudit.info.mockResolvedValue(undefined);
      mockEmail.sendPaiementConfirme.mockResolvedValue(undefined);

      const result = await service.confirmerPaiement({
        transaction_id: 'tx-01',
        dossier_id: 'd-01',
        statut: 'SUCCESS',
        montant: 100000,
      });

      expect(result).toEqual({ statut: 'SUCCESS' });
      expect(mockPaiementRepo.confirmer).toHaveBeenCalledWith('p-01', 'tx-01');
      expect(mockPrisma.dossier.update).toHaveBeenCalledWith({
        where: { id: 'd-01' },
        data: { statut: 'PAYE' },
      });
      expect(mockCommissionRepo.creerCommissionApporteur).toHaveBeenCalledWith({
        paiement_id: 'p-01',
        apporteur_id: 'apt-01',
        dossier_id: 'd-01',
        montant_base: 100000,
        taux_commission_pct: 5,
        montant_commission: 5000,
        statut: 'EN_ATTENTE',
      });
      expect(mockAudit.info).toHaveBeenCalledWith('COMMISSION_APPORTEUR_GENEREE', {
        apporteur_id: 'apt-01',
        montant_commission: 5000,
      });
      expect(calculerCommissionsSpy).toHaveBeenCalledWith({ id: 'p-01', dossier_id: 'd-01', montant_final: 100000 }, 'd-01');
      expect(mockVoucherRepo.utiliser).toHaveBeenCalledWith('voucher-01');
      expect(mockEmail.sendPaiementConfirme).toHaveBeenCalledWith(
        'test@test.ci',
        'Formation Test',
        'FR'
      );

      calculerCommissionsSpy.mockRestore();
    });

    it('échoue un paiement quand le webhook est en statut FAILED', async () => {
      mockPaiementRepo.findByTransactionId.mockResolvedValueOnce(null);
      mockPaiementRepo.findByDossierId.mockResolvedValueOnce({
        id: 'p-01',
        dossier_id: 'd-01',
      } as any);
      mockPaiementRepo.echouer.mockResolvedValueOnce({} as any);
      mockAudit.warning.mockResolvedValue(undefined);

      const result = await service.confirmerPaiement({
        transaction_id: 'tx-02',
        dossier_id: 'd-01',
        statut: 'FAILED',
        montant: 100000,
      });

      expect(result).toEqual({ statut: 'FAILED' });
      expect(mockPaiementRepo.echouer).toHaveBeenCalledWith('p-01');
      expect(mockAudit.warning).toHaveBeenCalledWith('PAIEMENT_ECHOUE', { paiement_id: 'p-01', dossier_id: 'd-01' });
    });

    it('rejette le webhook si aucun paiement n’est trouvé pour le dossier', async () => {
      mockPaiementRepo.findByTransactionId.mockResolvedValueOnce(null);
      mockPaiementRepo.findByDossierId.mockResolvedValueOnce(null);

      await expect(service.confirmerPaiement({
        transaction_id: 'tx-03',
        dossier_id: 'd-01',
        statut: 'SUCCESS',
        montant: 100000,
      })).rejects.toThrow('PAIEMENT_NOT_FOUND');
    });
  });

  describe('Branches utilitaires supplémentaires', () => {
    it('ignore le calcul des commissions si le dossier est introuvable', async () => {
      mockPrisma.dossier.findUnique.mockResolvedValueOnce(null);

      await expect(service.calculerCommissions({ id: 'p-01' }, 'd-01')).resolves.toBeUndefined();
      expect(mockCommissionRepo.creerCommissionPartenaire).not.toHaveBeenCalled();
      expect(mockCommissionRepo.creerCommissionApporteur).not.toHaveBeenCalled();
    });

    it('retourne les paiements avec leurs relations', async () => {
      mockPrisma.paiement.findMany.mockResolvedValueOnce([{ id: 'p-01' }]);

      await expect(service.getPaiements({ statut: 'CONFIRME' })).resolves.toEqual([{ id: 'p-01' }]);
      expect(mockPrisma.paiement.findMany).toHaveBeenCalledWith({
        where: { statut: 'CONFIRME' },
        include: { dossier: { include: { apprenant: true, formation: true } } },
        orderBy: { created_at: 'desc' },
      });
    });
  });
});
