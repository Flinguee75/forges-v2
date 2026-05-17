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

  // ─── souscrire ─────────────────────────────────────────────────────

  it('rejette si un abonnement ACTIF existe déjà', async () => {
    prisma.abonnementOrganisation.findFirst.mockResolvedValue({
      id: 'abo-org-01',
      statut: 'ACTIF',
    } as any);

    await expect(service.souscrire('org-01', 'PRO')).rejects.toThrow('ABONNEMENT_ORG_DEJA_ACTIF');
  });

  it('réémet une session NGSER si abonnement EN_ATTENTE_PAIEMENT (idempotence)', async () => {
    const existing = {
      id: 'abo-org-01',
      statut: 'EN_ATTENTE_PAIEMENT',
      montant_annuel: 150000,
      order_ngser: 'ABO-ORG-2026-001-EXISTING',
    };
    prisma.abonnementOrganisation.findFirst.mockResolvedValue(existing as any);
    prisma.abonnementOrganisation.findUnique.mockResolvedValue(existing as any);

    const result = await service.souscrire('org-01', 'PRO');

    expect(result.abonnement).toEqual(existing);
    expect(result.payment_url).toContain('ABO-ORG-2026-001-EXISTING');
    expect(result.order_ngser).toBe('ABO-ORG-2026-001-EXISTING');
    expect(prisma.abonnementOrganisation.create).not.toHaveBeenCalled();
  });

  it('crée un abonnement EN_ATTENTE_PAIEMENT et retourne une payment_url', async () => {
    const created = {
      id: 'abo-org-01',
      offre: 'ENTERPRISE',
      statut: 'EN_ATTENTE_PAIEMENT',
      montant_annuel: 400000,
      order_ngser: 'ABO-ORG-TEST-001',
    };
    prisma.abonnementOrganisation.findFirst.mockResolvedValue(null);
    prisma.abonnementOrganisation.create.mockResolvedValue(created as any);
    prisma.abonnementOrganisation.findUnique.mockResolvedValue(created as any);
    mockAudit.info.mockResolvedValue(undefined);

    const result = await service.souscrire('org-01', 'ENTERPRISE');

    expect(prisma.abonnementOrganisation.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        organisation_id: 'org-01',
        offre: 'ENTERPRISE',
        montant_annuel: 400000,
        statut: 'EN_ATTENTE_PAIEMENT',
        renouvellement_auto: true,
        order_ngser: expect.stringMatching(/^ABO-ORG-/),
      }),
    });
    // organisation.update N'est PAS appelé ici — c'est fait dans l'IPN handler au SUCCESS
    expect(prisma.organisation.update).not.toHaveBeenCalled();
    expect(mockAudit.info).toHaveBeenCalledWith(
      'ABONNEMENT_ORG_EN_ATTENTE_PAIEMENT',
      expect.objectContaining({ organisation_id: 'org-01', offre: 'ENTERPRISE' })
    );
    expect(result.payment_url).toBeDefined();
    expect(result.payment_url).not.toContain('mock-ngser');
    expect(result.order_ngser).toBeDefined();
    expect(result.abonnement).toEqual(created);
  });

  // ─── envoyerAlertesExpiration (RM-82 : J-7 et J-2) ────────────────

  it('envoie les alertes J-7 et J-2 (RM-82)', async () => {
    prisma.abonnementOrganisation.findMany
      .mockResolvedValueOnce([
        { organisation: { email: 'j7@test.ci', langue_preferee: 'FR' }, date_fin: new Date('2026-05-12') },
      ] as any)
      .mockResolvedValueOnce([
        { organisation: { email: 'j2@test.ci', langue_preferee: 'EN' }, date_fin: new Date('2026-05-07') },
      ] as any);
    mockEmail.sendAlerteExpirationOrg.mockResolvedValue(undefined);

    const result = await service.envoyerAlertesExpiration();

    expect(mockEmail.sendAlerteExpirationOrg).toHaveBeenCalledTimes(2);
    expect(result).toEqual({ alertes_j7: 1, alertes_j2: 1 });
  });
});
