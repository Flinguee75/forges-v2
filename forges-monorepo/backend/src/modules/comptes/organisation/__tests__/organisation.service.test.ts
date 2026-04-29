import { OrganisationService } from '../organisation.service';
import { OrganisationRepository } from '../organisation.repository';
import { AuditLogger } from '../../../../shared/audit/audit.logger';
import { EmailService } from '../../../../shared/email/email.service';

describe('OrganisationService', () => {
  let service: OrganisationService;
  let mockRepo: jest.Mocked<OrganisationRepository>;
  let mockAudit: jest.Mocked<AuditLogger>;
  let mockEmail: jest.Mocked<EmailService>;

  const validDto = {
    raison_sociale: 'TechCorp CI',
    type: 'ENTREPRISE' as const,
    identifiant_legal: 'CI-RCCM-2026-001',
    contact_referent: 'Directeur RH',
    pays: 'CI',
    langue_preferee: 'FR' as const,
    email: 'techcorp@test.ci',
    password: 'Test@2026!',
    consentement_rgpd: true as const,
  };

  beforeEach(() => {
    mockRepo = {
      findByEmail: jest.fn(),
      findById: jest.fn(),
      findByIdentifiantLegal: jest.fn(),
      create: jest.fn(),
      activate: jest.fn(),
      suspendre: jest.fn(),
      prisma: {
        apprenant: { findUnique: jest.fn().mockResolvedValue(null) },
        organisation: {
          findFirst: jest.fn(),
          findMany: jest.fn(),
          update: jest.fn(),
          findUnique: jest.fn(),
        },
        partenaire: { findUnique: jest.fn().mockResolvedValue(null) },
        apporteur: { findUnique: jest.fn().mockResolvedValue(null) },
      }
    } as any;

    mockAudit = { info: jest.fn(), warning: jest.fn() } as any;
    mockEmail = { sendConfirmation: jest.fn(), sendEssaiExpire: jest.fn() } as any;
    service = new OrganisationService(mockRepo, mockAudit, mockEmail);
  });

  // RM-43 : unicité identifiant légal par type
  describe('RM-43 — Unicité identifiant légal par type', () => {
    it('refuse si l’email existe déjà', async () => {
      mockRepo.findByEmail.mockResolvedValue({ id: 'existing-org' } as any);

      await expect(service.register(validDto, '127.0.0.1')).rejects.toThrow('EMAIL_ALREADY_EXISTS');
      expect(mockRepo.findByIdentifiantLegal).not.toHaveBeenCalled();
    });

    it('refuse si identifiant légal déjà utilisé pour ce type', async () => {
      mockRepo.findByEmail.mockResolvedValue(null);
      mockRepo.findByIdentifiantLegal.mockResolvedValue({ id: 'existing' } as any);
      await expect(service.register(validDto, '127.0.0.1')).rejects.toThrow('IDENTIFIANT_LEGAL_ALREADY_EXISTS');
    });

    it('accepte le même identifiant légal pour un type différent', async () => {
      mockRepo.findByEmail.mockResolvedValue(null);
      mockRepo.findByIdentifiantLegal.mockResolvedValue(null);
      mockRepo.create.mockResolvedValue({ id: 'new-id' } as any);
      mockAudit.info.mockResolvedValue(undefined);
      mockEmail.sendConfirmation.mockResolvedValue(undefined);
      await expect(service.register(validDto, '127.0.0.1')).resolves.toBeDefined();
    });

    it('crée une organisation sans identifiant légal et saute ce contrôle', async () => {
      mockRepo.findByEmail.mockResolvedValue(null);
      mockRepo.create.mockResolvedValue({ id: 'new-id' } as any);
      mockAudit.info.mockResolvedValue(undefined);
      mockEmail.sendConfirmation.mockResolvedValue(undefined);

      await expect(service.register({
        ...validDto,
        identifiant_legal: undefined,
      }, '127.0.0.1')).resolves.toBeDefined();

      expect(mockRepo.findByIdentifiantLegal).not.toHaveBeenCalled();
    });
  });

  // RM-81 : essai 30 jours
  describe('RM-81 — Essai 30 jours à l\'activation', () => {
    it('rejette si le token est introuvable', async () => {
      (mockRepo as any).prisma.organisation.findFirst.mockResolvedValue(null);

      await expect(service.confirmEmail('missing-token')).rejects.toThrow('TOKEN_INVALID');
    });

    it('rejette si le token est expiré', async () => {
      (mockRepo as any).prisma.organisation.findFirst.mockResolvedValue({
        id: 'org-id',
        token_expiration: new Date(Date.now() - 3600 * 1000),
      });

      await expect(service.confirmEmail('expired-token')).rejects.toThrow('TOKEN_EXPIRED');
    });

    it('démarre l\'essai 30 jours lors de la confirmation email', async () => {
      (mockRepo as any).prisma.organisation.findFirst.mockResolvedValue({
        id: 'org-id',
        token_expiration: new Date(Date.now() + 3600 * 1000),
      });
      mockRepo.activate.mockResolvedValue({} as any);
      mockAudit.info.mockResolvedValue(undefined);
      await service.confirmEmail('valid-token');
      expect(mockRepo.activate).toHaveBeenCalledWith('org-id');
    });
  });

  // RM-83 : suspension à J+30
  describe('RM-83 — Suspension si pas d\'abonnement à J+30', () => {
    it('suspend les organisations dont l\'essai est expiré sans abonnement', async () => {
      const orgsExpirees = [
        { id: 'org-1', email: 'org1@test.ci', langue_preferee: 'FR' },
        { id: 'org-2', email: 'org2@test.ci', langue_preferee: 'EN' },
      ];
      (mockRepo as any).prisma.organisation.findMany.mockResolvedValue(orgsExpirees);
      mockRepo.suspendre.mockResolvedValue({} as any);
      mockAudit.warning.mockResolvedValue(undefined);
      mockEmail.sendEssaiExpire.mockResolvedValue(undefined);

      const count = await service.suspendreEssaisExpires();
      expect(count).toBe(2);
      expect(mockRepo.suspendre).toHaveBeenCalledTimes(2);
    });

    it('retourne 0 si aucune organisation n’est éligible', async () => {
      (mockRepo as any).prisma.organisation.findMany.mockResolvedValue([]);

      await expect(service.suspendreEssaisExpires()).resolves.toBe(0);
      expect(mockRepo.suspendre).not.toHaveBeenCalled();
    });
  });
});
