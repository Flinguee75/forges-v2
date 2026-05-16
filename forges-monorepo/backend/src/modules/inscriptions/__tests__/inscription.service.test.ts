import { InscriptionService } from '../inscription.service';
import { DossierRepository } from '../dossier.repository';
import { SessionRepository } from '../../sessions/session.repository';
import { FormationRepository } from '../../formations/formation.repository';
import { VoucherValidationService } from '../../vouchers/voucher-validation.service';
import { AuditLogger } from '../../../shared/audit/audit.logger';
import { EmailService } from '../../../shared/email/email.service';

describe('InscriptionService', () => {
  let service: InscriptionService;
  let mockDossierRepo: jest.Mocked<DossierRepository>;
  let mockSessionRepo: jest.Mocked<SessionRepository>;
  let mockFormationRepo: jest.Mocked<FormationRepository>;
  let mockVoucherValidation: jest.Mocked<VoucherValidationService>;
  let mockRetailRepo: any;
  let mockAudit: jest.Mocked<AuditLogger>;
  let mockEmail: jest.Mocked<EmailService>;
  let mockPrisma: any;

  const baseSession = {
    id: 'session-01',
    formation_id: 'formation-01',
    places_restantes: 5,
    nb_inscrits: 2,
    capacite: 10,
    date_debut: new Date('2026-06-01T00:00:00.000Z'),
    date_fin: new Date('2026-06-11T00:00:00.000Z'),
    lieu: 'AIGF, Abidjan',
  };

  beforeEach(() => {
    mockDossierRepo = {
      findActiveByApprenantAndSession: jest.fn(),
      findBySession: jest.fn(),
      create: jest.fn(),
      findById: jest.fn(),
      updateStatut: jest.fn(),
      setDelaiPaiement: jest.fn(),
    } as any;

    mockSessionRepo = {
      findById: jest.fn(),
    } as any;

    mockFormationRepo = {
      findById: jest.fn(),
    } as any;

    mockVoucherValidation = {
      validateApporteur: jest.fn(),
      validerVoucher: jest.fn(),
    } as any;

    mockRetailRepo = {
      countFormationsActives: jest.fn(),
      findActifByApprenant: jest.fn().mockResolvedValue(null),
    };

    mockAudit = {
      info: jest.fn(),
      warning: jest.fn(),
      error: jest.fn(),
    } as any;

    mockEmail = {
      notifyResponsable: jest.fn(),
      sendEnrolementConfirmationApprenant: jest.fn(),
      sendPaiementConfirme: jest.fn(),
    } as any;

    mockPrisma = {
      dossier: { count: jest.fn(), findFirst: jest.fn(), findUnique: jest.fn() },
      apprenant: { findUnique: jest.fn() },
      organisation: { findUnique: jest.fn() },
      paiement: { findUnique: jest.fn(), create: jest.fn() },
      abonnementRetail: { findFirst: jest.fn() },
      voucherApporteur: { findFirst: jest.fn(), update: jest.fn() },
      voucherOrganisation: { update: jest.fn() },
      session: { update: jest.fn() },
    };
    mockPrisma.dossier.findFirst.mockResolvedValue(null);
    mockPrisma.abonnementRetail.findFirst.mockResolvedValue(null);
    mockPrisma.voucherApporteur.findFirst.mockResolvedValue(null);
    mockPrisma.paiement.findUnique.mockResolvedValue(null);
    mockPrisma.paiement.create.mockResolvedValue({ id: 'paiement-default' } as any);

    service = new InscriptionService(
      mockDossierRepo,
      mockSessionRepo,
      mockFormationRepo,
      mockVoucherValidation,
      mockRetailRepo,
      mockAudit,
      mockEmail,
      mockPrisma
    );
  });

  it('rejette une session complète', async () => {
    mockSessionRepo.findById.mockResolvedValue({ ...baseSession, places_restantes: 0 } as any);
    mockDossierRepo.findActiveByApprenantAndSession.mockResolvedValue(null);
    mockFormationRepo.findById.mockResolvedValue({ id: 'formation-01', type_formation: 'STANDARD', cout_catalogue: 100000 } as any);

    await expect(service.inscrire({ session_id: 'session-01', apprenantId: 'app-01', source_financement: 'RETAIL' })).rejects.toThrow('SESSION_COMPLETE');
  });

  it('rejette un doublon d inscription', async () => {
    mockSessionRepo.findById.mockResolvedValue(baseSession as any);
    mockDossierRepo.findActiveByApprenantAndSession.mockResolvedValue({ id: 'dossier-01' } as any);

    await expect(service.inscrire({ session_id: 'session-01', apprenantId: 'app-01' })).rejects.toThrow('ALREADY_ENROLLED');
  });

  it('interdit le cumul code apporteur + voucher', async () => {
    mockSessionRepo.findById.mockResolvedValue(baseSession as any);
    mockDossierRepo.findActiveByApprenantAndSession.mockResolvedValue(null);
    mockVoucherValidation.validateApporteur.mockResolvedValue({ id: 'apporteur-01' } as any);

    await expect(
      service.inscrire({
        session_id: 'session-01',
        apprenantId: 'app-01',
        code_apporteur: 'code-01',
        voucher_code: 'voucher-01',
      })
    ).rejects.toThrow('VOUCHER_CUMUL_INTERDIT');
  });

  it('crée un dossier payé directement avec une ligne paiement en attente pour une formation non premium retail', async () => {
    mockSessionRepo.findById.mockResolvedValue(baseSession as any);
    mockDossierRepo.findActiveByApprenantAndSession.mockResolvedValue(null);
    mockPrisma.dossier.count.mockResolvedValue(2); // 2 dossiers actifs → (2+1)/10 = 30% NORMAL
    mockFormationRepo.findById.mockResolvedValue({ id: 'formation-01', type_formation: 'STANDARD', cout_catalogue: 100000 } as any);
    mockDossierRepo.create.mockResolvedValue({ id: 'dossier-01', statut: 'PAYE_DIRECTEMENT' } as any);
    mockPrisma.paiement.create.mockResolvedValue({ id: 'paiement-direct' } as any);
    mockAudit.info.mockResolvedValue(undefined);

    const result = await service.inscrire({
      session_id: 'session-01',
      apprenantId: 'app-01',
      source_financement: 'B2B',
      voucher_code: null,
      code_apporteur: null,
    });

    expect(mockDossierRepo.create).toHaveBeenCalledWith(expect.objectContaining({
      apprenant_id: 'app-01',
      statut: 'PAYE_DIRECTEMENT',
      type_fenetre: 'NORMAL',
    }));
    expect(mockPrisma.paiement.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        dossier_id: 'dossier-01',
        montant_catalogue: 100000,
        montant_final: 100000,
        reduction_appliquee: 0,
        methode: 'DIRECT',
        statut: 'EN_ATTENTE',
        expires_at: expect.any(Date),
      }),
    }));
    expect(mockAudit.info).toHaveBeenCalledWith('DOSSIER_CREE', { dossier_id: 'dossier-01', statut: 'PAYE_DIRECTEMENT' });
    expect(result).toMatchObject({ id: 'dossier-01', statut: 'PAYE_DIRECTEMENT', montant_total: 100000, montant_apres_reduction: 100000 });
  });

  it('crée un dossier en attente et notifie le responsable pour une premium retail', async () => {
    // Pour EXCEPTION: (nbActifs + 1) / capacite > 1.10
    // Avec capacite=10, il faut nbActifs >= 11 → (11+1)/10 = 120% > 110%
    mockSessionRepo.findById.mockResolvedValue({ ...baseSession, capacite: 10 } as any);
    mockDossierRepo.findActiveByApprenantAndSession.mockResolvedValue(null);
    mockPrisma.dossier.count.mockResolvedValue(11); // 11 dossiers actifs → (11+1)/10 = 120% EXCEPTION
    mockFormationRepo.findById.mockResolvedValue({ id: 'formation-01', type_formation: 'PREMIUM', cout_catalogue: 100000 } as any);
    mockDossierRepo.create.mockResolvedValue({ id: 'dossier-02', statut: 'EN_ATTENTE_VERIFICATION' } as any);
    mockAudit.info.mockResolvedValue(undefined);
    mockEmail.notifyResponsable.mockResolvedValue(undefined);

    await service.inscrire({
      session_id: 'session-01',
      apprenantId: 'app-01',
      source_financement: 'RETAIL',
      voucher_code: null,
      code_apporteur: null,
    });

    expect(mockDossierRepo.create).toHaveBeenCalledWith(expect.objectContaining({
      statut: 'EN_ATTENTE_VERIFICATION',
      type_fenetre: 'EXCEPTION',
    }));
    expect(mockEmail.notifyResponsable).toHaveBeenCalledWith('NOUVEAU_DOSSIER_A_VERIFIER', { dossier_id: 'dossier-02' });
  });

  it('crée un dossier PAYE_DIRECTEMENT quand l’apprenant utilise un voucher promotionnel', async () => {
    mockSessionRepo.findById.mockResolvedValue(baseSession as any);
    mockDossierRepo.findActiveByApprenantAndSession.mockResolvedValue(null);
    mockPrisma.dossier.count.mockResolvedValue(2);
    mockFormationRepo.findById.mockResolvedValue({
      id: 'formation-01',
      intitule: 'Masterclass Cyber',
      type_formation: 'STANDARD',
      cout_catalogue: 150000,
    } as any);
    mockPrisma.voucherApporteur.findFirst.mockResolvedValue({
      id: 'voucher-promo-01',
      code: 'PROMO-001',
      type: 'PROMOTIONNEL',
      type_valeur: 'MONTANT',
      valeur: 15000,
      quota_max: 5,
      quota_utilise: 0,
    } as any);
    mockDossierRepo.create.mockResolvedValue({ id: 'dossier-voucher', statut: 'PAYE_DIRECTEMENT' } as any);
    mockPrisma.paiement.create.mockResolvedValue({
      id: 'paiement-voucher',
      statut: 'EN_ATTENTE',
    } as any);
    mockPrisma.voucherApporteur.update.mockResolvedValue({
      id: 'voucher-promo-01',
      quota_max: 5,
      quota_utilise: 1,
    } as any);

    const result = await service.inscrire({
      session_id: 'session-01',
      apprenantId: 'app-01',
      source_financement: 'RETAIL',
      voucher_code: 'PROMO-001',
      code_apporteur: null,
    });

    expect(mockDossierRepo.create).toHaveBeenCalledWith(expect.objectContaining({
      apprenant_id: 'app-01',
      statut: 'PAYE_DIRECTEMENT',
      source_financement: 'RETAIL',
      voucher_code: 'PROMO-001',
    }));
    expect(mockPrisma.paiement.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        dossier_id: 'dossier-voucher',
        montant_catalogue: 150000,
        montant_final: 135000,
        reduction_appliquee: 15000,
        methode: 'VOUCHER_PROMO',
        statut: 'EN_ATTENTE',
        expires_at: expect.any(Date),
      }),
    }));
    expect(result).toMatchObject({ id: 'dossier-voucher', statut: 'PAYE_DIRECTEMENT' });
  });

  it('retourne les dossiers d une session via le repository', async () => {
    mockDossierRepo.findBySession.mockResolvedValue([{ id: 'dossier-01' }] as any);

    const result = await service.getDossiersBySession('session-01');

    expect(mockDossierRepo.findBySession).toHaveBeenCalledWith('session-01');
    expect(result).toEqual([{ id: 'dossier-01' }]);
  });

  it('retourne le détail complet du dossier avec les relations utiles', async () => {
    mockPrisma.dossier.findUnique.mockResolvedValue({
      id: 'dossier-01',
      apprenant: {
        id: 'app-01',
        email: 'app@test.com',
        nom: 'Cisse',
        prenoms: 'Tidiane',
        type_apprenant: 'APPRENANT',
        langue_preferee: 'FR',
        secteur_activite: 'IT',
        niveau_etude: 'Master',
        pays_residence: 'Côte d’Ivoire',
        pays_nationalite: 'Sénégal',
        organisation: {
          id: 'org-01',
          raison_sociale: 'Forges Org',
          email: 'org@test.com',
          type: 'ENTREPRISE',
          contact_referent: 'Mme Test',
          pays: 'Côte d’Ivoire',
        },
      },
      formation: {
        id: 'formation-01',
        intitule: 'Masterclass Cyber',
        type_formation: 'PREMIUM',
      },
      session: {
        id: 'session-01',
        date_debut: baseSession.date_debut,
        date_fin: baseSession.date_fin,
        statut: 'PLANIFIEE',
        lieu: 'AIGF, Abidjan',
        capacite: 10,
        nb_inscrits: 4,
        places_restantes: 6,
      },
      voucher_organisation: {
        id: 'voucher-01',
        code: 'VCHR-001',
        statut: 'ACTIF',
        quota_max: 1,
        quota_utilise: 0,
      },
      paiement: {
        id: 'paiement-01',
        statut: 'CONFIRME',
        methode: 'VOUCHER_ORG',
      },
    });

    const result = await service.getDetail('dossier-01');

    expect(mockPrisma.dossier.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'dossier-01' },
        include: expect.objectContaining({
          apprenant: expect.objectContaining({
            select: expect.objectContaining({
              organisation: expect.any(Object),
            }),
          }),
          voucher_organisation: expect.any(Object),
        }),
      })
    );
    expect(result).toMatchObject({
      id: 'dossier-01',
      apprenant: expect.objectContaining({ organisation: expect.objectContaining({ raison_sociale: 'Forges Org' }) }),
      voucher_organisation: expect.objectContaining({ code: 'VCHR-001' }),
    });
  });

  it('applique correctement la réduction d un voucher promotionnel MONTANT en centimes', async () => {
    // valeur = 15000 centimes = 150 FCFA de réduction sur une formation à 1000 FCFA (100000 centimes)
    mockSessionRepo.findById.mockResolvedValue(baseSession as any);
    mockDossierRepo.findActiveByApprenantAndSession.mockResolvedValue(null);
    mockPrisma.dossier.count.mockResolvedValue(2);
    mockFormationRepo.findById.mockResolvedValue({
      id: 'formation-01',
      type_formation: 'STANDARD',
      cout_catalogue: 100000,
    } as any);
    mockPrisma.voucherApporteur.findFirst.mockResolvedValue({
      id: 'voucher-promo-01',
      type: 'PROMOTIONNEL',
      type_valeur: 'MONTANT',
      valeur: 15000,
      quota_max: 5,
      quota_utilise: 0,
    } as any);
    mockDossierRepo.create.mockResolvedValue({ id: 'dossier-promo', statut: 'PAYE' } as any);
    mockPrisma.paiement.create.mockResolvedValue({
      id: 'paiement-promo',
      statut: 'EN_ATTENTE',
    } as any);
    mockPrisma.voucherApporteur.update.mockResolvedValue({
      id: 'voucher-promo-01',
      quota_max: 5,
      quota_utilise: 1,
    });
    mockAudit.info.mockResolvedValue(undefined);

    const result = await service.inscrire({
      session_id: 'session-01',
      apprenantId: 'app-01',
      source_financement: 'RETAIL',
      voucher_code: 'PROMO-001',
      code_apporteur: null,
    });

    // montant_remise doit etre 15000 centimes (la valeur stockée, issue du frontend converti en centimes)
    expect(mockDossierRepo.create).toHaveBeenCalledWith(expect.objectContaining({
      statut: 'PAYE_DIRECTEMENT',
      montant_remise: 15000,
    }));
    // montant_apres_reduction = 100000 - 15000 = 85000 centimes = 850 FCFA
    expect(result).toMatchObject({
      montant_total: 100000,
      montant_apres_reduction: 85000,
    });
  });

  // ─── retenir (UCS08, RM-05, RM-07, RM-140) ───────────────────────────────

  describe('retenir', () => {
    const baseDossier = {
      id: 'dossier-ret-01',
      statut: 'EN_ATTENTE_VERIFICATION',
      source_financement: 'RETAIL',
      session_id: 'session-01',
      apprenant_id: 'app-01',
      voucher_organisation_id: null,
      voucher_code: null,
    };
    const premiumFormation = { id: 'formation-01', intitule: 'Cert Premium', type_formation: 'PREMIUM' };
    const session = { id: 'session-01', formation_id: 'formation-01', date_debut: new Date('2026-06-01'), date_fin: new Date('2026-06-11') };

    beforeEach(() => {
      mockDossierRepo.findById.mockResolvedValue(baseDossier as any);
      mockSessionRepo.findById.mockResolvedValue(session as any);
      mockFormationRepo.findById.mockResolvedValue(premiumFormation as any);
      mockDossierRepo.updateStatut.mockResolvedValue(undefined);
      mockDossierRepo.setDelaiPaiement.mockResolvedValue(undefined);
      mockAudit.info.mockResolvedValue(undefined);
      mockAudit.warning.mockResolvedValue(undefined);
      mockPrisma.apprenant.findUnique.mockResolvedValue({
        id: 'app-01',
        email: 'apprenant@test.ci',
        nom: 'Cisse',
        prenoms: 'Tidiane',
        langue_preferee: 'FR',
      } as any);
      (mockEmail as any).sendDossierRetenu = jest.fn().mockResolvedValue(undefined);
    });

    it('[RED] retenir — dossier non trouvé → DOSSIER_NOT_FOUND', async () => {
      mockDossierRepo.findById.mockResolvedValue(null);
      await expect(service.retenir('inexistant', 'resp-01')).rejects.toThrow('DOSSIER_NOT_FOUND');
    });

    it('[RED] retenir — dossier déjà RETENU → succès silencieux', async () => {
      mockDossierRepo.findById.mockResolvedValue({ ...baseDossier, statut: 'RETENU' } as any);
      const result = await service.retenir('dossier-ret-01', 'resp-01');
      expect(result.success).toBe(true);
      expect(mockDossierRepo.updateStatut).not.toHaveBeenCalled();
    });

    it('[RED] retenir — dossier déjà traité (PAYE) → DOSSIER_ALREADY_PROCESSED', async () => {
      mockDossierRepo.findById.mockResolvedValue({ ...baseDossier, statut: 'PAYE' } as any);
      await expect(service.retenir('dossier-ret-01', 'resp-01')).rejects.toThrow('DOSSIER_ALREADY_PROCESSED');
    });

    it('[RED] retenir — formation non PREMIUM → NOT_PREMIUM_RETAIL', async () => {
      mockFormationRepo.findById.mockResolvedValue({ ...premiumFormation, type_formation: 'STANDARD' } as any);
      await expect(service.retenir('dossier-ret-01', 'resp-01')).rejects.toThrow('NOT_PREMIUM_RETAIL');
    });

    it('[RED] retenir — source non RETAIL → NOT_PREMIUM_RETAIL', async () => {
      mockDossierRepo.findById.mockResolvedValue({ ...baseDossier, source_financement: 'B2B' } as any);
      await expect(service.retenir('dossier-ret-01', 'resp-01')).rejects.toThrow('NOT_PREMIUM_RETAIL');
    });

    it('[GREEN] retenir — happy path : transitions RETENU + délai 72h + email', async () => {
      const result = await service.retenir('dossier-ret-01', 'resp-01');

      expect(mockDossierRepo.updateStatut).toHaveBeenCalledWith('dossier-ret-01', 'RETENU');
      expect(mockDossierRepo.setDelaiPaiement).toHaveBeenCalledWith('dossier-ret-01', expect.any(Date));
      expect(mockAudit.info).toHaveBeenCalledWith('DOSSIER_RETENU', expect.objectContaining({ dossier_id: 'dossier-ret-01' }));
      expect((mockEmail as any).sendDossierRetenu).toHaveBeenCalled();
      expect(result.success).toBe(true);
    });

    it('[GREEN] retenir — email échoue → audit warning, pas d exception', async () => {
      (mockEmail as any).sendDossierRetenu = jest.fn().mockRejectedValue(new Error('SMTP_DOWN'));
      const result = await service.retenir('dossier-ret-01', 'resp-01');

      expect(result.success).toBe(true);
      expect(mockAudit.warning).toHaveBeenCalledWith('DOSSIER_RETENU_EMAIL_FAILED', expect.objectContaining({ dossier_id: 'dossier-ret-01' }));
    });
  });

  // ─── rejeter (RM-140) ────────────────────────────────────────────────────

  describe('rejeter', () => {
    const baseDossier = {
      id: 'dossier-rej-01',
      statut: 'EN_ATTENTE_VERIFICATION',
      source_financement: 'RETAIL',
      session_id: 'session-01',
      apprenant_id: 'app-01',
      voucher_organisation_id: null,
      voucher_code: null,
    };
    const premiumFormation = { id: 'formation-01', intitule: 'Cert Premium', type_formation: 'PREMIUM' };
    const session = { id: 'session-01', formation_id: 'formation-01', date_debut: new Date('2026-06-01'), date_fin: new Date('2026-06-11') };

    beforeEach(() => {
      mockDossierRepo.findById.mockResolvedValue(baseDossier as any);
      mockSessionRepo.findById.mockResolvedValue(session as any);
      mockFormationRepo.findById.mockResolvedValue(premiumFormation as any);
      mockPrisma.dossier.update = jest.fn().mockResolvedValue({});
      mockPrisma.voucherOrganisation.update.mockResolvedValue({});
      mockPrisma.voucherApporteur.findFirst.mockResolvedValue(null);
      mockPrisma.voucherApporteur.update.mockResolvedValue({});
      mockAudit.info.mockResolvedValue(undefined);
      mockAudit.warning.mockResolvedValue(undefined);
      mockPrisma.apprenant.findUnique.mockResolvedValue({
        id: 'app-01',
        email: 'apprenant@test.ci',
        nom: 'Cisse',
        prenoms: 'Tidiane',
        langue_preferee: 'FR',
      } as any);
      (mockEmail as any).sendDossierRejete = jest.fn().mockResolvedValue(undefined);
    });

    it('[RED] rejeter — dossier non trouvé → DOSSIER_NOT_FOUND', async () => {
      mockDossierRepo.findById.mockResolvedValue(null);
      await expect(service.rejeter('inexistant', 'resp-01', 'Dossier incomplet')).rejects.toThrow('DOSSIER_NOT_FOUND');
    });

    it('[RED] rejeter — dossier déjà REJETE → succès silencieux', async () => {
      mockDossierRepo.findById.mockResolvedValue({ ...baseDossier, statut: 'REJETE' } as any);
      const result = await service.rejeter('dossier-rej-01', 'resp-01', 'Motif');
      expect(result.success).toBe(true);
      expect(mockPrisma.dossier.update).not.toHaveBeenCalled();
    });

    it('[RED] rejeter — dossier non EN_ATTENTE_VERIFICATION → DOSSIER_ALREADY_PROCESSED', async () => {
      mockDossierRepo.findById.mockResolvedValue({ ...baseDossier, statut: 'RETENU' } as any);
      await expect(service.rejeter('dossier-rej-01', 'resp-01', 'Motif')).rejects.toThrow('DOSSIER_ALREADY_PROCESSED');
    });

    it('[RED] rejeter — formation non PREMIUM → NOT_PREMIUM_RETAIL', async () => {
      mockFormationRepo.findById.mockResolvedValue({ ...premiumFormation, type_formation: 'STANDARD' } as any);
      await expect(service.rejeter('dossier-rej-01', 'resp-01', 'Motif')).rejects.toThrow('NOT_PREMIUM_RETAIL');
    });

    it('[GREEN] rejeter — happy path : statut REJETE + audit + email', async () => {
      const result = await service.rejeter('dossier-rej-01', 'resp-01', 'Documents manquants');

      expect(mockPrisma.dossier.update).toHaveBeenCalledWith(expect.objectContaining({
        where: { id: 'dossier-rej-01' },
        data: expect.objectContaining({ statut: 'REJETE', motif_refus: 'Documents manquants' }),
      }));
      expect(mockAudit.info).toHaveBeenCalledWith('DOSSIER_REJETE', expect.objectContaining({ dossier_id: 'dossier-rej-01' }));
      expect((mockEmail as any).sendDossierRejete).toHaveBeenCalled();
      expect(result.success).toBe(true);
    });

    it('[GREEN] rejeter — libère voucher organisation si présent', async () => {
      mockDossierRepo.findById.mockResolvedValue({ ...baseDossier, voucher_organisation_id: 'voucher-org-01' } as any);

      await service.rejeter('dossier-rej-01', 'resp-01', 'Refus');

      expect(mockPrisma.voucherOrganisation.update).toHaveBeenCalledWith(expect.objectContaining({
        where: { id: 'voucher-org-01' },
        data: expect.objectContaining({ quota_utilise: { decrement: 1 }, statut: 'ACTIF' }),
      }));
    });

    it('[GREEN] rejeter — libère voucher promo si présent', async () => {
      mockDossierRepo.findById.mockResolvedValue({ ...baseDossier, voucher_code: 'PROMO-XYZ' } as any);
      mockPrisma.voucherApporteur.findFirst.mockResolvedValue({
        id: 'va-01',
        type: 'PROMOTIONNEL',
        quota_max: 5,
        quota_utilise: 1,
        statut: 'ACTIF',
      } as any);

      await service.rejeter('dossier-rej-01', 'resp-01', 'Refus');

      expect(mockPrisma.voucherApporteur.update).toHaveBeenCalledWith(expect.objectContaining({
        where: { id: 'va-01' },
      }));
    });

    it('[GREEN] rejeter — email échoue → audit warning, pas d exception', async () => {
      (mockEmail as any).sendDossierRejete = jest.fn().mockRejectedValue(new Error('SMTP_DOWN'));
      const result = await service.rejeter('dossier-rej-01', 'resp-01', 'Refus');

      expect(result.success).toBe(true);
      expect(mockAudit.warning).toHaveBeenCalledWith('DOSSIER_REJETE_EMAIL_FAILED', expect.objectContaining({ dossier_id: 'dossier-rej-01' }));
    });
  });

  describe('RM-72 — Source ABONNEMENT', () => {
    it('rejette si aucun abonnement actif (ABONNEMENT_REQUIS)', async () => {
      mockSessionRepo.findById.mockResolvedValue(baseSession as any);
      mockDossierRepo.findActiveByApprenantAndSession.mockResolvedValue(null);
      mockRetailRepo.findActifByApprenant.mockResolvedValue(null);

      await expect(
        service.inscrire({ session_id: 'session-01', apprenantId: 'app-01', source_financement: 'ABONNEMENT' })
      ).rejects.toThrow('ABONNEMENT_REQUIS');
    });

    it('rejette si 3 formations actives déjà en cours (FORMATION_LIMIT_REACHED — RM-72)', async () => {
      mockSessionRepo.findById.mockResolvedValue(baseSession as any);
      mockDossierRepo.findActiveByApprenantAndSession.mockResolvedValue(null);
      mockRetailRepo.findActifByApprenant.mockResolvedValue({ id: 'abo-01', statut: 'ACTIF' });
      mockRetailRepo.countFormationsActives.mockResolvedValue(3);

      await expect(
        service.inscrire({ session_id: 'session-01', apprenantId: 'app-01', source_financement: 'ABONNEMENT' })
      ).rejects.toThrow('FORMATION_LIMIT_REACHED');
    });
  });

  describe('RM-18 — Fenêtre GRIS (taux exactement 110%)', () => {
    it('marque le dossier GRIS si taux > 100% et <= 110%', async () => {
      // count=10, capacite=10 → taux = (10+1)/10*100 = 110% → GRIS (>100 mais pas >110)
      mockSessionRepo.findById.mockResolvedValue({ ...baseSession, capacite: 10 } as any);
      mockDossierRepo.findActiveByApprenantAndSession.mockResolvedValue(null);
      mockFormationRepo.findById.mockResolvedValue({ id: 'formation-01', type_formation: 'STANDARD', cout_catalogue: 100000 } as any);
      mockPrisma.dossier.count.mockResolvedValue(10);
      mockDossierRepo.create.mockResolvedValue({ id: 'dossier-gris', statut: 'PAYE_DIRECTEMENT' } as any);
      mockPrisma.paiement.create.mockResolvedValue({ id: 'p-gris' } as any);
      mockAudit.info.mockResolvedValue(undefined);

      await service.inscrire({ session_id: 'session-01', apprenantId: 'app-01', source_financement: 'RETAIL' });

      expect(mockDossierRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ type_fenetre: 'GRIS' })
      );
    });
  });
});
