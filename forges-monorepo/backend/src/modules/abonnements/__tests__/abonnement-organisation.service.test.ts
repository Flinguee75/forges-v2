import { AbonnementOrganisationService } from '../organisation/abonnement-organisation.service';
import { AuditLogger } from '../../../shared/audit/audit.logger';
import { EmailService } from '../../../shared/email/email.service';
import { createPrismaMock } from '../../../__tests__/helpers/prisma';

describe('AbonnementOrganisationService', () => {
  let service: AbonnementOrganisationService;
  let prisma: ReturnType<typeof createPrismaMock>;
  let mockAudit: jest.Mocked<AuditLogger>;
  let mockEmail: jest.Mocked<EmailService>;

  beforeEach(() => {
    prisma = createPrismaMock();
    mockAudit = { info: jest.fn(), warning: jest.fn(), error: jest.fn() } as any;
    mockEmail = { sendAlerteExpirationOrg: jest.fn() } as any;
    service = new AbonnementOrganisationService(prisma, mockAudit, mockEmail);
  });

  it('rejette une souscription organisation déjà active', async () => {
    prisma.abonnementOrganisation.findFirst.mockResolvedValue({ id: 'abo-org-01' } as any);

    await expect(service.souscrire('org-01', 'PRO')).rejects.toThrow('ABONNEMENT_ORG_DEJA_ACTIF');
  });

  it('souscrit un abonnement organisation et lie l organisation', async () => {
    prisma.abonnementOrganisation.findFirst.mockResolvedValue(null);
    prisma.abonnementOrganisation.create.mockResolvedValue({ id: 'abo-org-01' } as any);
    prisma.organisation.update.mockResolvedValue({ id: 'org-01' } as any);
    mockAudit.info.mockResolvedValue(undefined);

    const result = await service.souscrire('org-01', 'ENTERPRISE');

    expect(prisma.abonnementOrganisation.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        organisation_id: 'org-01',
        offre: 'ENTERPRISE',
        montant_annuel: 400000,
        renouvellement_auto: true,
      }),
    });
    expect(prisma.organisation.update).toHaveBeenCalledWith({
      where: { id: 'org-01' },
      data: { abonnement_org_id: 'abo-org-01' },
    });
    expect(mockAudit.info).toHaveBeenCalledWith('ABONNEMENT_ORG_SOUSCRIT', {
      organisation_id: 'org-01',
      offre: 'ENTERPRISE',
      montant: 400000,
    });
    expect(result).toEqual({ id: 'abo-org-01' });
  });

  it('envoie les alertes J-30 et J-7', async () => {
    prisma.abonnementOrganisation.findMany
      .mockResolvedValueOnce([
        { organisation: { email: 'j30@test.ci', langue_preferee: 'FR' }, date_fin: new Date('2026-02-01') },
      ] as any)
      .mockResolvedValueOnce([
        { organisation: { email: 'j7@test.ci', langue_preferee: 'EN' }, date_fin: new Date('2026-01-08') },
      ] as any);
    mockEmail.sendAlerteExpirationOrg.mockResolvedValue(undefined);

    const result = await service.envoyerAlertesExpiration();

    expect(mockEmail.sendAlerteExpirationOrg).toHaveBeenCalledTimes(2);
    expect(result).toEqual({ alertes_j30: 1, alertes_j7: 1 });
  });
});
