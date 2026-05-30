import { PaiementService } from '../paiement.service';
import { PaiementRepository } from '../paiement.repository';
import { CommissionRepository } from '../commission.repository';
import { VoucherRepository } from '../../vouchers/voucher.repository';
import { AuditLogger } from '../../../shared/audit/audit.logger';
import { EmailService } from '../../../shared/email/email.service';
import { getDelaiPaiementH } from '../../../config/env.config';

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
      $transaction: jest.fn(async (callback: any) => callback(mockPrisma)),
      paiement: {
        findMany: jest.fn(),
        // PaiementFineoService et PaiementNgserService (appelés via appelAgregateur) utilisent
        // directement prisma.paiement plutôt que le repository — ces mocks les couvrent.
        findUnique: jest.fn().mockResolvedValue(null),
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({
          id: 'p-ngser-mock',
          order_ngser: 'FRG-2026-001-MOCK',
          montant_initie: 100000,
          ngser_payload_last: { payment_url: 'https://mock-ngser.forges.ci/pay?order=FRG-2026-001-MOCK' },
        }),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      commissionPartenaire: {
        findUnique: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({ id: 'cp-01' }),
      },
      commissionApporteur: {
        findUnique: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({ id: 'ca-01' }),
      },
      formationPartenaire: { findUnique: jest.fn().mockResolvedValue(null) },
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
      const delaiH = getDelaiPaiementH();
      expect(diff).toBeGreaterThan((delaiH - 1) * 3600 * 1000);
      expect(diff).toBeLessThan((delaiH + 1) * 3600 * 1000);
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

    it('confirme un paiement legacy via le reglement commun et calcule la commission apporteur', async () => {
      mockPaiementRepo.findByTransactionId.mockResolvedValueOnce(null);
      mockPaiementRepo.findByDossierId.mockResolvedValueOnce({
        id: 'p-01',
        dossier_id: 'd-01',
        statut: 'EN_ATTENTE',
        montant_catalogue: 100000,
        montant_final: 100000,
      } as any);
      mockPrisma.dossier.findUnique.mockResolvedValueOnce({
        id: 'd-01',
        voucher_code: 'PROMO10',
        code_apporteur: 'uuid-apporteur',
        formation: {
          ...dossierStandard.formation,
          partenaire_id: null,
          partenaire: null,
        },
        apprenant: dossierStandard.apprenant,
      } as any);
      mockPrisma.apporteur.findFirst.mockResolvedValueOnce({
        id: 'apt-01',
        taux_commission_pct: 5,
      });
      mockAudit.info.mockResolvedValue(undefined);

      const result = await service.confirmerPaiement({
        transaction_id: 'tx-01',
        dossier_id: 'd-01',
        statut: 'SUCCESS',
        montant: 100000,
      });

      expect(result).toMatchObject({
        statut: 'SUCCESS',
        paiement_statut: 'CONFIRME',
        dossier_statut: 'PAYE',
      });
      expect(mockPrisma.paiement.updateMany).toHaveBeenCalledWith({
        where: { id: 'p-01', statut: { not: 'CONFIRME' } },
        data: expect.objectContaining({
          statut: 'CONFIRME',
          transaction_id: 'tx-01',
          status_ngser: 'SUCCESS',
          ngser_payload_last: expect.objectContaining({ source: 'LEGACY_WEBHOOK' }),
        }),
      });
      expect(mockPrisma.dossier.update).toHaveBeenCalledWith({
        where: { id: 'd-01' },
        data: { statut: 'PAYE' },
      });
      expect(mockPrisma.commissionApporteur.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          paiement_id: 'p-01',
          apporteur_id: 'apt-01',
          dossier_id: 'd-01',
          montant_base: 100000,
          taux_commission_pct: 5,
          montant_commission: 5000,
          statut: 'EN_ATTENTE',
        }),
      });
      expect(mockVoucherRepo.utiliser).not.toHaveBeenCalled();
      expect(mockEmail.sendPaiementConfirme).not.toHaveBeenCalled();
    });

    it('échoue un paiement quand le webhook est en statut FAILED', async () => {
      mockPaiementRepo.findByTransactionId.mockResolvedValueOnce(null);
      mockPaiementRepo.findByDossierId.mockResolvedValueOnce({
        id: 'p-01',
        dossier_id: 'd-01',
      } as any);

      const result = await service.confirmerPaiement({
        transaction_id: 'tx-02',
        dossier_id: 'd-01',
        statut: 'FAILED',
        montant: 100000,
      });

      expect(result).toMatchObject({
        statut: 'FAILED',
        paiement_statut: 'ECHOUE',
        dossier_statut: 'ANNULE',
      });
      expect(mockPrisma.paiement.updateMany).toHaveBeenCalledWith({
        where: { id: 'p-01', statut: { not: 'CONFIRME' } },
        data: expect.objectContaining({
          statut: 'ECHOUE',
          transaction_id: 'tx-02',
          status_ngser: 'FAILED',
          ngser_payload_last: expect.objectContaining({ source: 'LEGACY_WEBHOOK' }),
        }),
      });
      expect(mockPrisma.dossier.update).toHaveBeenCalledWith({
        where: { id: 'd-01' },
        data: { statut: 'ANNULE' },
      });
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

  describe('Suppression admin de paiement', () => {
    it('supprime un paiement non confirmé et nettoie les commissions', async () => {
      mockPaiementRepo.findById.mockResolvedValueOnce({
        id: 'p-delete-01',
        dossier_id: 'd-01',
        statut: 'PENDING',
      } as any);

      const tx = {
        commissionPartenaire: { deleteMany: jest.fn().mockResolvedValue({ count: 0 }) },
        commissionApporteur: { deleteMany: jest.fn().mockResolvedValue({ count: 0 }) },
        paiement: { delete: jest.fn().mockResolvedValue({ id: 'p-delete-01' }) },
        dossier: { delete: jest.fn().mockResolvedValue({ id: 'd-01' }) },
      };
      mockPrisma.$transaction.mockImplementation(async (cb: any) => cb(tx));
      mockAudit.info.mockResolvedValue(undefined);

      const result = await service.supprimerPaiement('p-delete-01', 'admin-01', 'Test cleanup');

      expect(tx.commissionPartenaire.deleteMany).toHaveBeenCalledWith({ where: { paiement_id: 'p-delete-01' } });
      expect(tx.commissionApporteur.deleteMany).toHaveBeenCalledWith({ where: { paiement_id: 'p-delete-01' } });
      expect(tx.paiement.delete).toHaveBeenCalledWith({ where: { id: 'p-delete-01' } });
      expect(tx.dossier.delete).toHaveBeenCalledWith({ where: { id: 'd-01' } });
      expect(mockAudit.info).toHaveBeenCalledWith(
        'PAIEMENT_ET_DOSSIER_SUPPRIMES',
        expect.objectContaining({
          paiement_id: 'p-delete-01',
          dossier_id: 'd-01',
          admin_id: 'admin-01',
          motif: 'Test cleanup',
          statut: 'PENDING',
        })
      );
      expect(result).toEqual({
        statut: 'SUPPRIME',
        paiement_id: 'p-delete-01',
        dossier_id: 'd-01',
      });
    });

    it('refuse de supprimer un paiement confirmé', async () => {
      mockPaiementRepo.findById.mockResolvedValueOnce({
        id: 'p-delete-02',
        dossier_id: 'd-01',
        statut: 'CONFIRME',
      } as any);

      await expect(
        service.supprimerPaiement('p-delete-02', 'admin-01')
      ).rejects.toThrow('PAIEMENT_SUPPRESSION_INTERDITE');
    });
  });

  // RM-06 — PAIEMENT_DEJA_VALIDE (non testé jusqu ici)
  describe('RM-06 — PAIEMENT_DEJA_VALIDE', () => {
    it('rejette si le paiement existant est déjà CONFIRME', async () => {
      mockPrisma.dossier.findUnique.mockResolvedValue(dossierStandard);
      mockPaiementRepo.findByDossierId.mockResolvedValue({
        id: 'p-01',
        statut: 'CONFIRME',
        tentatives: 1,
        expires_at: new Date(Date.now() + 24 * 3600 * 1000),
        montant_final: 100000,
      } as any);

      await expect(
        service.initierPaiement({ dossier_id: 'd-01', methode: 'MOBILE_MONEY' }, 'a-01')
      ).rejects.toThrow('PAIEMENT_DEJA_VALIDE');
      expect(mockPaiementRepo.incrementerTentatives).not.toHaveBeenCalled();
    });
  });

  // BUG-PAI-01 — Double confirmation (pas de garde statut dans confirmerPaiement)
  describe('[BUG-PAI-01] Double confirmation — second SUCCESS avec nouveau transaction_id', () => {
    it('ne doit pas reconfirmer un paiement déjà CONFIRME ni doubler les commissions', async () => {
      // Premier IPN déjà traité → paiement en statut CONFIRME
      mockPaiementRepo.findByTransactionId.mockResolvedValue(null); // nouvelle tx inconnue
      mockPaiementRepo.findByDossierId.mockResolvedValue({
        id: 'p-01',
        dossier_id: 'd-01',
        statut: 'CONFIRME', // déjà confirmé
        montant_final: 100000,
      } as any);
      mockPaiementRepo.confirmer.mockResolvedValue({} as any);
      mockPrisma.dossier.update.mockResolvedValue({} as any);
      mockPrisma.dossier.findUnique.mockResolvedValue(null);
      mockAudit.info.mockResolvedValue(undefined);
      mockAudit.warning.mockResolvedValue(undefined);
      mockEmail.sendPaiementConfirme.mockResolvedValue(undefined);

      await service.confirmerPaiement({
        transaction_id: 'tx-new-different',
        dossier_id: 'd-01',
        statut: 'SUCCESS',
        montant: 100000,
      });

      // Ce test ECHOUE tant que le bug existe :
      // confirmer() et creerCommission() ne doivent pas être appelés une seconde fois
      expect(mockPaiementRepo.confirmer).not.toHaveBeenCalled();
      expect(mockCommissionRepo.creerCommissionApporteur).not.toHaveBeenCalled();
      expect(mockCommissionRepo.creerCommissionPartenaire).not.toHaveBeenCalled();
    });
  });

  // RM-160 — MONTANT_INVALIDE webhook (comportement documenté)
  describe('RM-160 — Mismatch montant IPN', () => {
    it('retourne MONTANT_INVALIDE et n annule pas le paiement si le montant differe', async () => {
      mockPaiementRepo.findByTransactionId.mockResolvedValue(null);
      mockPaiementRepo.findByDossierId.mockResolvedValue({
        id: 'p-01',
        dossier_id: 'd-01',
        montant_final: 100000,
        statut: 'EN_ATTENTE',
      } as any);
      mockAudit.warning.mockResolvedValue(undefined);

      const result = await service.confirmerPaiement({
        transaction_id: 'tx-mismatch',
        dossier_id: 'd-01',
        statut: 'SUCCESS',
        montant: 50000, // montant different
      });

      expect(result).toMatchObject({ message: 'MONTANT_INVALIDE', statut: 'REJECTED' });
      expect(mockPaiementRepo.confirmer).not.toHaveBeenCalled();
      expect(mockPrisma.dossier.update).not.toHaveBeenCalled();
      expect(mockAudit.warning).toHaveBeenCalledWith('PAIEMENT_MONTANT_MISMATCH', expect.objectContaining({
        montant_attendu: 100000,
        montant_recu: 50000,
      }));
      // Le paiement doit rester en attente — aucun echouer() déclenché
      expect(mockPaiementRepo.echouer).not.toHaveBeenCalled();
    });
  });

  // BUG-PAI-03 — Email non enveloppé dans annulerPaiementsExpires
  describe('[BUG-PAI-03] annulerPaiementsExpires — email sans try/catch', () => {
    it('continue d annuler les autres paiements meme si l email echoue', async () => {
      const paiements = [
        { id: 'p-exp-01', dossier_id: 'd-01', dossier: { voucher_code: null, session_id: 's-01' } },
        { id: 'p-exp-02', dossier_id: 'd-02', dossier: { voucher_code: null, session_id: 's-02' } },
      ];
      mockPaiementRepo.findPaiementsExpires.mockResolvedValue(paiements as any);
      mockPaiementRepo.echouer.mockResolvedValue({} as any);
      mockPrisma.dossier.update.mockResolvedValue({} as any);
      mockPrisma.session.update.mockResolvedValue({} as any);
      mockPrisma.dossier.findUnique.mockResolvedValue({
        apprenant: { email: 'a@test.ci', langue_preferee: 'FR' }
      } as any);
      mockAudit.warning.mockResolvedValue(undefined);

      // Email échoue pour le premier paiement
      mockEmail.sendDossierAnnuleExpiration
        .mockRejectedValueOnce(new Error('SMTP_DOWN'))
        .mockResolvedValueOnce(undefined);

      // Ce test ECHOUE tant que le bug existe :
      // l exception non catchée interrompt la boucle → count = 1 au lieu de 2
      const count = await service.annulerPaiementsExpires();
      expect(count).toBe(2);
      expect(mockPaiementRepo.echouer).toHaveBeenCalledTimes(2);
    });
  });

  // RM-10 — Remboursement admin (non testé jusqu ici)
  describe('RM-10 — rembourserPaiement', () => {
    it('lance PAIEMENT_NOT_FOUND si paiement inexistant', async () => {
      mockPaiementRepo.findById.mockResolvedValue(null);
      await expect(service.rembourserPaiement('p-01', 'Erreur', 'admin-01')).rejects.toThrow('PAIEMENT_NOT_FOUND');
    });

    it('lance PAIEMENT_NON_REMBOURSABLE si statut non CONFIRME', async () => {
      mockPaiementRepo.findById.mockResolvedValue({ id: 'p-01', statut: 'EN_ATTENTE', dossier_id: 'd-01' } as any);
      await expect(service.rembourserPaiement('p-01', 'Erreur', 'admin-01')).rejects.toThrow('PAIEMENT_NON_REMBOURSABLE');
    });

    it('rembourse le paiement CONFIRME et annule le dossier', async () => {
      mockPaiementRepo.findById.mockResolvedValue({ id: 'p-01', statut: 'CONFIRME', dossier_id: 'd-01' } as any);
      mockPaiementRepo.rembourser = jest.fn().mockResolvedValue({});
      mockPrisma.dossier.update.mockResolvedValue({});
      mockAudit.info.mockResolvedValue(undefined);

      const result = await service.rembourserPaiement('p-01', 'Doublon paiement', 'admin-01');

      expect(mockPaiementRepo.rembourser).toHaveBeenCalledWith('p-01');
      expect(mockPrisma.dossier.update).toHaveBeenCalledWith(expect.objectContaining({
        where: { id: 'd-01' },
        data: { statut: 'ANNULE' },
      }));
      expect(mockAudit.info).toHaveBeenCalledWith('PAIEMENT_REMBOURSE', expect.objectContaining({
        paiement_id: 'p-01',
        motif: 'Doublon paiement',
        admin_id: 'admin-01',
      }));
      expect(result).toMatchObject({ statut: 'REMBOURSE', motif: 'Doublon paiement' });
    });
  });

  // getPaiementsStats
  describe('getPaiementsStats', () => {
    it('calcule correctement les stats sur une période donnée', async () => {
      const now = Date.now();
      mockPrisma.paiement.findMany.mockResolvedValue([
        { statut: 'CONFIRME', created_at: new Date(now - 1000), confirmed_at: new Date(now), provider: 'NGSER' },
        { statut: 'ECHOUE', created_at: new Date(now - 2000), confirmed_at: null, provider: 'NGSER' },
        { statut: 'PENDING', created_at: new Date(now - 3000), confirmed_at: null, provider: 'FINEO' },
      ] as any);
      mockPrisma.paiement.count = jest.fn().mockResolvedValue(0);

      const stats = await service.getPaiementsStats('24h');

      expect(stats.total).toBe(3);
      expect(stats.success).toBe(1);
      expect(stats.fail).toBe(1);
      expect(stats.pending).toBe(1);
      expect(stats.success_rate).toBeCloseTo(33.33);
    });

    it('retourne success_rate 0 si aucun paiement', async () => {
      mockPrisma.paiement.findMany.mockResolvedValue([]);
      mockPrisma.paiement.count = jest.fn().mockResolvedValue(0);

      const stats = await service.getPaiementsStats('1h');
      expect(stats.success_rate).toBe(0);
      expect(stats.avg_confirmation_time_seconds).toBe(0);
    });
  });

  describe('Méthodes de délégation', () => {
    it('délègue initierPaiementNgser au service NGSER', async () => {
      const mockNgserSvc = { initierPaiement: jest.fn().mockResolvedValue({ payment_url: 'https://ngser.test' }) };
      const s = new PaiementService(
        mockPaiementRepo, mockCommissionRepo, mockVoucherRepo,
        mockPrisma, mockAudit, mockEmail, mockNgserSvc as any
      );
      const result = await s.initierPaiementNgser({ dossier_id: 'd-01' }, 'a-01');
      expect(result).toEqual({ payment_url: 'https://ngser.test' });
      expect(mockNgserSvc.initierPaiement).toHaveBeenCalledWith({ dossier_id: 'd-01' }, 'a-01');
    });

    it('délègue initierPaiementFineo au service Fineo', async () => {
      const mockResult = { checkout_link: 'https://fineo.test' };
      jest.spyOn((service as any).paiementFineoService, 'initierPaiement').mockResolvedValueOnce(mockResult as any);
      const result = await service.initierPaiementFineo('d-01', 'a-01');
      expect(result).toEqual(mockResult);
    });

    it('délègue traiterCallbackFineo au service IPN Fineo', async () => {
      const mockResult = { statut: 'CONFIRME' };
      jest.spyOn((service as any).ipnFineoService, 'traiterCallback').mockResolvedValueOnce(mockResult as any);
      const result = await service.traiterCallbackFineo({ transaction_id: 'TXN-01' } as any);
      expect(result).toEqual(mockResult);
    });

    it('délègue traiterIpnNgser au service IPN NGSER', async () => {
      const mockResult = { statut: 'CONFIRME' };
      jest.spyOn((service as any).ipnNgserService, 'traiterIpn').mockResolvedValueOnce(mockResult as any);
      const result = await service.traiterIpnNgser({ order_ngser: 'FRG-001' });
      expect(result).toEqual(mockResult);
    });

    it('retourne les paiements d un apprenant', async () => {
      (mockPaiementRepo as any).findByApprenant = jest.fn().mockResolvedValue([{ id: 'p-01' }]);
      const result = await service.getPaiementsByApprenant('a-01');
      expect(result).toEqual([{ id: 'p-01' }]);
    });

    it('retourne null si le paiement est introuvable via getPaiementById', async () => {
      mockPrisma.paiement.findUnique.mockResolvedValueOnce(null);
      const result = await service.getPaiementById('p-inexistant');
      expect(result).toBeNull();
    });

    it('retourne le paiement sans organisation si voucher_organisation absent', async () => {
      const mockPaiement = { id: 'p-01', dossier: { voucher_organisation: null } };
      mockPrisma.paiement.findUnique.mockResolvedValueOnce(mockPaiement);
      const result = await service.getPaiementById('p-01');
      expect((result as any)._organisation_voucher_nom).toBeNull();
    });

    it('résout le nom organisation via voucher_organisation si présent', async () => {
      const mockPaiement = { id: 'p-01', dossier: { voucher_organisation: { organisation_id: 'org-01' } } };
      mockPrisma.paiement.findUnique.mockResolvedValueOnce(mockPaiement);
      mockPrisma.organisation = { findUnique: jest.fn().mockResolvedValue({ raison_sociale: 'TechCorp' }) };
      const result = await service.getPaiementById('p-01');
      expect((result as any)._organisation_voucher_nom).toBe('TechCorp');
    });

    it('reconcilierPaiementsPendingNgser retourne un résumé', async () => {
      jest.spyOn((service as any).reconciliationNgserScheduler, 'getPaiementsPendingEligibles').mockResolvedValueOnce([]);
      const result = await service.reconcilierPaiementsPendingNgser();
      expect(result.nb_paiements_trouves).toBe(0);
      expect(result.results).toEqual([]);
    });
  });
});
