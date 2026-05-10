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
  };

  beforeEach(() => {
    mockDossierRepo = {
      findActiveByApprenantAndSession: jest.fn(),
      findBySession: jest.fn(),
      create: jest.fn(),
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
      dossier: { count: jest.fn(), findFirst: jest.fn() },
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

  it('crée un dossier payé directement pour une formation non premium retail', async () => {
    mockSessionRepo.findById.mockResolvedValue(baseSession as any);
    mockDossierRepo.findActiveByApprenantAndSession.mockResolvedValue(null);
    mockPrisma.dossier.count.mockResolvedValue(2); // 2 dossiers actifs → (2+1)/10 = 30% NORMAL
    mockFormationRepo.findById.mockResolvedValue({ id: 'formation-01', type_formation: 'STANDARD', cout_catalogue: 100000 } as any);
    mockDossierRepo.create.mockResolvedValue({ id: 'dossier-01', statut: 'PAYE_DIRECTEMENT' } as any);
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

  it('crée dossier PAYE, paiement CONFIRME et emails quand l’apprenant utilise un voucher organisation', async () => {
    mockSessionRepo.findById.mockResolvedValue(baseSession as any);
    mockDossierRepo.findActiveByApprenantAndSession.mockResolvedValue(null);
    mockPrisma.dossier.count.mockResolvedValue(2);
    mockFormationRepo.findById.mockResolvedValue({
      id: 'formation-01',
      intitule: 'Masterclass Cyber',
      type_formation: 'STANDARD',
      cout_catalogue: 150000,
    } as any);
    mockVoucherValidation.validerVoucher.mockResolvedValue({
      id: 'voucher-org-01',
      code: 'ORG-001',
      type: 'ORGANISATION',
      organisation_id: 'org-01',
    } as any);
    mockDossierRepo.create.mockResolvedValue({ id: 'dossier-voucher', statut: 'PAYE' } as any);
    mockPrisma.voucherOrganisation.update.mockResolvedValueOnce({
      id: 'voucher-org-01',
      quota_max: 1,
      quota_utilise: 1,
    });
    mockPrisma.voucherOrganisation.update.mockResolvedValueOnce({});
    mockPrisma.paiement.create.mockResolvedValue({ id: 'paiement-voucher', statut: 'CONFIRME' });
    mockPrisma.apprenant.findUnique.mockResolvedValue({
      email: 'aly@forges.test',
      nom: 'Samassi',
      prenoms: 'Aly',
      langue_preferee: 'FR',
    });
    mockPrisma.organisation.findUnique.mockResolvedValue({ raison_sociale: 'ANSSI CI' });

    const result = await service.inscrire({
      session_id: 'session-01',
      apprenantId: 'app-01',
      source_financement: 'VOUCHER',
      voucher_code: 'ORG-001',
      code_apporteur: null,
    });

    expect(mockDossierRepo.create).toHaveBeenCalledWith(expect.objectContaining({
      apprenant_id: 'app-01',
      statut: 'PAYE',
      source_financement: 'VOUCHER',
      voucher_organisation_id: 'voucher-org-01',
      voucher_code: 'ORG-001',
    }));
    expect(mockPrisma.paiement.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        dossier_id: 'dossier-voucher',
        montant_catalogue: 150000,
        montant_final: 150000,
        methode: 'VOUCHER_ORG',
        statut: 'CONFIRME',
      }),
    });
    expect(mockEmail.sendEnrolementConfirmationApprenant).toHaveBeenCalledWith({
      to: 'aly@forges.test',
      prenoms: 'Aly',
      nom: 'Samassi',
      organisation: 'ANSSI CI',
      formation: 'Masterclass Cyber',
    });
    expect(mockEmail.sendPaiementConfirme).toHaveBeenCalledWith('aly@forges.test', 'Masterclass Cyber', 'FR');
    expect(mockAudit.info).toHaveBeenCalledWith('EMAILS_VOUCHER_ORG_APPRENANT_ENVOYES', expect.objectContaining({
      apprenant_id: 'app-01',
    }));
    expect(result).toMatchObject({ id: 'dossier-voucher', statut: 'PAYE' });
  });

  it('retourne les dossiers d une session via le repository', async () => {
    mockDossierRepo.findBySession.mockResolvedValue([{ id: 'dossier-01' }] as any);

    const result = await service.getDossiersBySession('session-01');

    expect(mockDossierRepo.findBySession).toHaveBeenCalledWith('session-01');
    expect(result).toEqual([{ id: 'dossier-01' }]);
  });
});
