/**
 * Tests unitaires — RM-156 : constantes metier depuis .env
 *
 * Couvre :
 *   RM-156.1 : COMMISSION_FORGES_DEFAULT_PCT = 30 (correction v4.8 → v4.9)
 *   RM-156.2 : commission partenaire utilise la var env, pas une valeur hardcodee
 *   RM-156.3 : fallback si var env absente = 30 (jamais 20)
 */

const mockCreate = jest.fn();
const mockAuditInfo = jest.fn();
const mockSendEmail = jest.fn();

jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn().mockImplementation(() => ({
    partenaire: { create: mockCreate, findUnique: jest.fn(), findFirst: jest.fn() },
    user: { create: jest.fn(), findUnique: jest.fn() },
  })),
}));

jest.mock('shared/audit/audit.logger', () => ({
  AuditLogger: jest.fn().mockImplementation(() => ({ info: mockAuditInfo, warning: jest.fn() })),
}));

jest.mock('shared/email/email.service', () => ({
  EmailService: jest.fn().mockImplementation(() => ({ sendEmail: mockSendEmail })),
}));

jest.mock('modules/partenaires/partenaire.repository', () => ({
  PartenaireRepository: jest.fn().mockImplementation(() => ({
    findByEmail: jest.fn().mockResolvedValue(null),
    create: mockCreate,
    activer: jest.fn(),
    findByToken: jest.fn(),
  })),
}));

jest.mock('modules/partenaires/formation-partenaire.repository', () => ({
  FormationPartenaireRepository: jest.fn().mockImplementation(() => ({})),
}));

import { PartenaireService } from 'modules/partenaires/partenaire.service';
import { PartenaireRepository } from 'modules/partenaires/partenaire.repository';
import { FormationPartenaireRepository } from 'modules/partenaires/formation-partenaire.repository';
import { AuditLogger } from 'shared/audit/audit.logger';
import { EmailService } from 'shared/email/email.service';
import { PrismaClient } from '@prisma/client';

const PAYLOAD_BASE = {
  raison_sociale: 'Test SA',
  type: 'UNIVERSITE' as const,
  pays: 'CI',
  email_principal: 'test@partenaire.ci',
  mode_inscription: 'FLUX_B',
  password: 'Test@1234!',
};

function makeService() {
  const prisma = new PrismaClient();
  const repo = new PartenaireRepository(prisma);
  const fpRepo = new FormationPartenaireRepository(prisma);
  const audit = new AuditLogger();
  const email = new EmailService();
  return new PartenaireService(repo, fpRepo, prisma, audit, email);
}

describe('RM-156 — Commission FORGES depuis .env', () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
    jest.clearAllMocks();
  });

  describe('RM-156.1 : COMMISSION_FORGES_DEFAULT_PCT = 30 par defaut', () => {
    it('utilise 30 quand COMMISSION_FORGES_DEFAULT_PCT absent', async () => {
      delete process.env.COMMISSION_FORGES_DEFAULT_PCT;
      mockCreate.mockResolvedValue({
        id: 'p-1',
        raison_sociale: 'Test SA',
        email_principal: 'test@partenaire.ci',
        commission_forges_pct: 30,
        statut: 'EN_ATTENTE_VERIFICATION',
        mode_inscription: 'FLUX_B',
      });

      const service = makeService();
      await service.autoInscrire(PAYLOAD_BASE);

      const callArg = mockCreate.mock.calls[0][0];
      expect(callArg.commission_forges_pct).toBe(30);
    });

    it('utilise la valeur de COMMISSION_FORGES_DEFAULT_PCT si definie', async () => {
      process.env.COMMISSION_FORGES_DEFAULT_PCT = '25';
      mockCreate.mockResolvedValue({
        id: 'p-1',
        raison_sociale: 'Test SA',
        email_principal: 'test@partenaire.ci',
        commission_forges_pct: 25,
        statut: 'EN_ATTENTE_VERIFICATION',
        mode_inscription: 'FLUX_B',
      });

      const service = makeService();
      await service.autoInscrire(PAYLOAD_BASE);

      const callArg = mockCreate.mock.calls[0][0];
      expect(callArg.commission_forges_pct).toBe(25);
    });

    it('ne doit JAMAIS utiliser 20 comme fallback (correction v4.9)', async () => {
      delete process.env.COMMISSION_FORGES_DEFAULT_PCT;
      mockCreate.mockResolvedValue({
        id: 'p-1',
        raison_sociale: 'Test SA',
        email_principal: 'test@partenaire.ci',
        commission_forges_pct: 30,
        statut: 'EN_ATTENTE_VERIFICATION',
        mode_inscription: 'FLUX_B',
      });

      const service = makeService();
      await service.autoInscrire(PAYLOAD_BASE);

      const callArg = mockCreate.mock.calls[0][0];
      expect(callArg.commission_forges_pct).not.toBe(20);
      expect(callArg.commission_forges_pct).toBe(30);
    });
  });

  describe('RM-156.2 : var env surcharge la valeur par defaut', () => {
    it('COMMISSION_FORGES_DEFAULT_PCT=40 → commission = 40', async () => {
      process.env.COMMISSION_FORGES_DEFAULT_PCT = '40';
      mockCreate.mockResolvedValue({
        id: 'p-2',
        raison_sociale: 'Test SA',
        email_principal: 'test2@partenaire.ci',
        commission_forges_pct: 40,
        statut: 'EN_ATTENTE_VERIFICATION',
        mode_inscription: 'FLUX_B',
      });

      const service = makeService();
      await service.autoInscrire({ ...PAYLOAD_BASE, email_principal: 'test2@partenaire.ci' });

      const callArg = mockCreate.mock.calls[0][0];
      expect(callArg.commission_forges_pct).toBe(40);
    });
  });
});
