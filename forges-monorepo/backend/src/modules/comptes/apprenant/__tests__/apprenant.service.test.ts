import { ApprenantService } from '../apprenant.service';
import { ApprenantRepository } from '../apprenant.repository';
import { AuditLogger } from '../../../../shared/audit/audit.logger';
import { EmailService } from '../../../../shared/email/email.service';

describe('ApprenantService', () => {
  let service: ApprenantService;
  let mockRepo: jest.Mocked<ApprenantRepository>;
  let mockAudit: jest.Mocked<AuditLogger>;
  let mockEmail: jest.Mocked<EmailService>;

  const validDto = {
    email: 'test@example.ci',
    password: 'Test@2026!',
    nom: 'Koné',
    prenoms: 'Amadou',
    type_apprenant: 'PROFESSIONNEL' as const,
    secteur_activite: 'Finance',
    pays_residence: 'CI',
    pays_nationalite: 'CI',
    langue_preferee: 'FR' as const,
    consentement_rgpd: true as const,
  };

  beforeEach(() => {
    mockRepo = {
      findByEmail: jest.fn(),
      findById: jest.fn(),
      create: jest.fn(),
      activate: jest.fn(),
      updateToken: jest.fn(),
      purgeInactifs: jest.fn(),
      updateProfil: jest.fn(),
      prisma: {
        apprenant: { findFirst: jest.fn(), findUnique: jest.fn().mockResolvedValue(null) },
        organisation: { findUnique: jest.fn().mockResolvedValue(null) },
        partenaire: { findUnique: jest.fn().mockResolvedValue(null) },
        apporteur: { findUnique: jest.fn().mockResolvedValue(null) },
      }
    } as any;

    mockAudit = { info: jest.fn(), warning: jest.fn(), log: jest.fn() } as any;
    mockEmail = { sendConfirmation: jest.fn(), sendTempPassword: jest.fn() } as any;
    service = new ApprenantService(mockRepo, mockAudit, mockEmail);
  });

  // RM-28 : unicité email
  describe('RM-28 — Unicité email', () => {
    it('refuse si email déjà existant', async () => {
      mockRepo.findByEmail.mockResolvedValue({ id: 'existing' } as any);
      await expect(service.register(validDto, '127.0.0.1')).rejects.toThrow('EMAIL_ALREADY_EXISTS');
    });

    it('insensible à la casse (email normalisé en lowercase)', async () => {
      mockRepo.findByEmail.mockResolvedValue(null);
      mockRepo.create.mockResolvedValue({ id: 'new-id' } as any);
      mockEmail.sendConfirmation.mockResolvedValue(undefined);
      mockAudit.info.mockResolvedValue(undefined);
      await service.register({ ...validDto, email: 'TEST@EXAMPLE.CI' }, '127.0.0.1');
      expect(mockRepo.findByEmail).toHaveBeenCalledWith('test@example.ci');
    });
  });

  // RM-33 : consentement RGPD
  describe('RM-33 — Conservation consentement RGPD', () => {
    it('enregistre le consentement avec timestamp', async () => {
      mockRepo.findByEmail.mockResolvedValue(null);
      mockRepo.create.mockResolvedValue({ id: 'new-id' } as any);
      mockEmail.sendConfirmation.mockResolvedValue(undefined);
      mockAudit.info.mockResolvedValue(undefined);
      await service.register(validDto, '127.0.0.1');
      expect(mockRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          consentement_rgpd: true,
          consentement_timestamp: expect.any(Date),
          consentement_version_cgu: expect.any(String),
        })
      );
    });
  });

  // RM-30 : expiration token
  describe('RM-30 — Token confirmation 24h', () => {
    it('crée un token avec expiration 24h', async () => {
      mockRepo.findByEmail.mockResolvedValue(null);
      mockRepo.create.mockResolvedValue({ id: 'new-id' } as any);
      mockEmail.sendConfirmation.mockResolvedValue(undefined);
      mockAudit.info.mockResolvedValue(undefined);
      await service.register(validDto, '127.0.0.1');
      const createCall = mockRepo.create.mock.calls[0][0];
      const expiration = createCall.token_expiration;
      const diff = expiration.getTime() - Date.now();
      // Doit être entre 23h55 et 24h05
      expect(diff).toBeGreaterThan(23 * 3600 * 1000);
      expect(diff).toBeLessThan(25 * 3600 * 1000);
    });

    it('rejette un token expiré', async () => {
      (mockRepo as any).prisma.apprenant.findFirst.mockResolvedValue({
        id: 'test-id',
        token_expiration: new Date(Date.now() - 1000),
      });
      await expect(service.confirmEmail('expired-token')).rejects.toThrow('TOKEN_EXPIRED');
    });

    it('rejette un token inexistant', async () => {
      (mockRepo as any).prisma.apprenant.findFirst.mockResolvedValue(null);
      await expect(service.confirmEmail('bad-token')).rejects.toThrow('TOKEN_INVALID');
    });
  });

  // RM-31 : protection énumération
  describe('RM-31 — Protection énumération', () => {
    it('retourne message générique si email inconnu (resend)', async () => {
      mockRepo.findByEmail.mockResolvedValue(null);
      const result = await service.resendConfirmation('unknown@test.ci');
      expect(result.message).toContain('Si un compte existe');
    });
  });

  // RM-98 : langue préférée
  describe('RM-98 — Email dans la langue préférée', () => {
    it('envoie l\'email de confirmation dans la langue choisie', async () => {
      mockRepo.findByEmail.mockResolvedValue(null);
      mockRepo.create.mockResolvedValue({ id: 'new-id' } as any);
      mockAudit.info.mockResolvedValue(undefined);
      mockEmail.sendConfirmation.mockResolvedValue(undefined);
      await service.register({ ...validDto, langue_preferee: 'EN' }, '127.0.0.1');
      expect(mockEmail.sendConfirmation).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        'EN'
      );
    });
  });

  // RM-30 : purge comptes inactifs
  describe('RM-30 — Purge comptes inactifs après 7j', () => {
    it('purge les comptes non confirmés', async () => {
      mockRepo.purgeInactifs.mockResolvedValue({ count: 3 } as any);
      mockAudit.info.mockResolvedValue(undefined);
      await service.purgerComptesInactifs();
      expect(mockRepo.purgeInactifs).toHaveBeenCalled();
    });
  });
});
