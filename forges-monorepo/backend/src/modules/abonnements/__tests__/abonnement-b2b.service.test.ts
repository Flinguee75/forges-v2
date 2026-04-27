import { AbonnementB2BService } from '../b2b/abonnement-b2b.service';
import { AuditLogger } from '../../../shared/audit/audit.logger';
import { EmailService } from '../../../shared/email/email.service';
import { createPrismaMock } from '../../../__tests__/helpers/prisma';

describe('AbonnementB2BService', () => {
  let service: AbonnementB2BService;
  let prisma: ReturnType<typeof createPrismaMock>;
  let mockAudit: jest.Mocked<AuditLogger>;
  let mockEmail: jest.Mocked<EmailService>;

  beforeEach(() => {
    prisma = createPrismaMock();
    mockAudit = { info: jest.fn(), warning: jest.fn(), error: jest.fn() } as any;
    mockEmail = { sendAlerteExpirationB2B: jest.fn() } as any;
    service = new AbonnementB2BService(prisma, mockAudit, mockEmail);
  });

  it('souscrit un abonnement B2B et lie l organisation', async () => {
    prisma.abonnementB2B.create.mockResolvedValue({ id: 'abo-b2b-01' });
    prisma.organisation.update.mockResolvedValue({ id: 'org-01' });
    mockAudit.info.mockResolvedValue(undefined);

    const result = await service.souscrire('org-01', 'BUSINESS');

    expect(prisma.abonnementB2B.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        organisation_id: 'org-01',
        palier: 'BUSINESS',
        nb_max: 50,
        prix_annuel: 500000,
        statut: 'ACTIF',
      }),
    });
    expect(prisma.organisation.update).toHaveBeenCalledWith({
      where: { id: 'org-01' },
      data: { abonnement_b2b_id: 'abo-b2b-01' },
    });
    expect(mockAudit.info).toHaveBeenCalledWith('ABONNEMENT_B2B_SOUSCRIT', { organisation_id: 'org-01', palier: 'BUSINESS' });
    expect(result).toEqual({ id: 'abo-b2b-01' });
  });

  it('rejette une montée de palier si aucun abonnement actif', async () => {
    prisma.abonnementB2B.findFirst.mockResolvedValue(null);

    await expect(service.monterPalier('org-01', 'BUSINESS')).rejects.toThrow('ABONNEMENT_B2B_NOT_FOUND');
  });

  it('rejette une montée vers un palier inférieur ou égal', async () => {
    prisma.abonnementB2B.findFirst.mockResolvedValue({
      id: 'abo-b2b-01',
      palier: 'BUSINESS',
      date_fin: new Date(Date.now() + 100 * 24 * 3600 * 1000),
    } as any);

    await expect(service.monterPalier('org-01', 'STARTER')).rejects.toThrow('NOUVEAU_PALIER_INFERIEUR');
  });

  it('monte de palier avec prorata', async () => {
    prisma.abonnementB2B.findFirst.mockResolvedValue({
      id: 'abo-b2b-01',
      palier: 'STARTER',
      date_fin: new Date(Date.now() + 200 * 24 * 3600 * 1000),
    } as any);
    prisma.abonnementB2B.update.mockResolvedValue({ id: 'abo-b2b-01' } as any);
    mockAudit.info.mockResolvedValue(undefined);

    const result = await service.monterPalier('org-01', 'ENTERPRISE');

    expect(prisma.abonnementB2B.update).toHaveBeenCalledWith({
      where: { id: 'abo-b2b-01' },
      data: expect.objectContaining({
        palier: 'ENTERPRISE',
        nb_max: 100,
        prix_annuel: 900000,
        premium_inclus_par_an: 2,
      }),
    });
    expect(result.nouveau_palier).toBe('ENTERPRISE');
    expect(result.montant_prorata).toBeGreaterThan(0);
  });

  it('envoie les alertes d expiration J-45 et J-15', async () => {
    prisma.abonnementB2B.findMany
      .mockResolvedValueOnce([
        { organisation: { email: 'j45@test.ci', langue_preferee: 'FR' }, date_fin: new Date('2026-02-15') },
      ] as any)
      .mockResolvedValueOnce([
        { organisation: { email: 'j15@test.ci', langue_preferee: 'EN' }, date_fin: new Date('2026-01-16') },
      ] as any);
    mockEmail.sendAlerteExpirationB2B.mockResolvedValue(undefined);

    const result = await service.envoyerAlertesExpiration();

    expect(mockEmail.sendAlerteExpirationB2B).toHaveBeenCalledTimes(2);
    expect(result).toEqual({ alertes_j45: 1, alertes_j15: 1 });
  });

  it('suspend les abonnements B2B expirés', async () => {
    prisma.abonnementB2B.findMany.mockResolvedValue([
      { id: 'abo-b2b-01', organisation_id: 'org-01', organisation: { email: 'org@test.ci' } },
      { id: 'abo-b2b-02', organisation_id: 'org-02', organisation: { email: 'org2@test.ci' } },
    ] as any);
    prisma.abonnementB2B.update.mockResolvedValue({} as any);

    await expect(service.suspendreB2BExpires()).resolves.toBe(2);
    expect(prisma.abonnementB2B.update).toHaveBeenCalledTimes(2);
    expect(prisma.abonnementB2B.update).toHaveBeenCalledWith({
      where: { id: 'abo-b2b-01' },
      data: { statut: 'EXPIRE' },
    });
  });
});
