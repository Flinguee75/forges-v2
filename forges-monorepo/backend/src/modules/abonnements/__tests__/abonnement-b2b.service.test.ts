import { AbonnementB2BService, PALIERS_B2B } from '../b2b/abonnement-b2b.service';
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

  // ─── souscrire ─────────────────────────────────────────────────────

  it('verrouille la grille tarifaire B2B en XOF', () => {
    expect(PALIERS_B2B).toEqual({
      STARTER: { nb_max: 20, prix_annuel: 250000 },
      BUSINESS: { nb_max: 50, prix_annuel: 500000 },
      ENTERPRISE: { nb_max: 100, prix_annuel: 900000, premium_inclus: 2 },
      SUR_DEVIS: { nb_max: 999, prix_annuel: 0 },
    });
  });

  it('crée un abonnement B2B EN_ATTENTE_PAIEMENT et retourne une payment_url', async () => {
    const created = {
      id: 'abo-b2b-01',
      palier: 'BUSINESS',
      statut: 'EN_ATTENTE_PAIEMENT',
      prix_annuel: 500000,
      order_ngser: 'ABO-B2B-TEST-001',
    };
    prisma.abonnementB2B.findFirst.mockResolvedValue(null);
    prisma.abonnementB2B.create.mockResolvedValue(created as any);
    prisma.abonnementB2B.findUnique.mockResolvedValue(created as any);
    mockAudit.info.mockResolvedValue(undefined);

    const result = await service.souscrire('org-01', 'BUSINESS');

    expect(prisma.abonnementB2B.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        organisation_id: 'org-01',
        palier: 'BUSINESS',
        nb_max: 50,
        prix_annuel: 500000,
        statut: 'EN_ATTENTE_PAIEMENT',
        order_ngser: expect.stringMatching(/^ABO-B2B-/),
      }),
    });
    // organisation.update N'est PAS appelé ici — c'est fait dans l'IPN handler au SUCCESS
    expect(prisma.organisation.update).not.toHaveBeenCalled();
    expect(mockAudit.info).toHaveBeenCalledWith(
      'ABONNEMENT_B2B_EN_ATTENTE_PAIEMENT',
      expect.objectContaining({ organisation_id: 'org-01', palier: 'BUSINESS' })
    );
    expect(result.payment_url).toBeDefined();
    expect(result.payment_url).not.toContain('mock-ngser');
    expect(result.order_ngser).toBeDefined();
    expect(result.prix_annuel_xof).toBe(500000);
    expect(result.abonnement).toEqual(expect.objectContaining({
      ...created,
      prix_annuel_xof: 500000,
      montant_annuel_xof: 500000,
    }));
  });

  it('rejette si un abonnement ACTIF existe déjà', async () => {
    prisma.abonnementB2B.findFirst.mockResolvedValue({
      id: 'abo-b2b-01',
      statut: 'ACTIF',
    } as any);

    await expect(service.souscrire('org-01', 'BUSINESS')).rejects.toThrow('ABONNEMENT_B2B_DEJA_ACTIF');
  });

  it('réémet une session NGSER si abonnement EN_ATTENTE_PAIEMENT (idempotence)', async () => {
    const existing = {
      id: 'abo-b2b-01',
      statut: 'EN_ATTENTE_PAIEMENT',
      prix_annuel: 500000,
      order_ngser: 'ABO-B2B-2026-001-EXISTING',
    };
    prisma.abonnementB2B.findFirst.mockResolvedValue(existing as any);
    prisma.abonnementB2B.findUnique.mockResolvedValue(existing as any);

    const result = await service.souscrire('org-01', 'BUSINESS');

    expect(result.abonnement).toEqual(expect.objectContaining({
      ...existing,
      prix_annuel_xof: 500000,
      montant_annuel_xof: 500000,
    }));
    expect(result.payment_url).toContain('ABO-B2B-2026-001-EXISTING');
    expect(result.prix_annuel_xof).toBe(500000);
    expect(prisma.abonnementB2B.create).not.toHaveBeenCalled();
  });

  it('rejette le palier SUR_DEVIS (hors ligne)', async () => {
    prisma.abonnementB2B.findFirst.mockResolvedValue(null);

    await expect(service.souscrire('org-01', 'SUR_DEVIS')).rejects.toThrow('PALIER_SUR_DEVIS_HORS_LIGNE');
  });

  // ─── monterPalier ──────────────────────────────────────────────────

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

  // ─── envoyerAlertesExpiration ───────────────────────────────────────

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
    prisma.accesFormationDemande.updateMany.mockResolvedValue({} as any);

    await expect(service.suspendreB2BExpires()).resolves.toBe(2);
    expect(prisma.abonnementB2B.update).toHaveBeenCalledTimes(2);
    expect(prisma.abonnementB2B.update).toHaveBeenCalledWith({
      where: { id: 'abo-b2b-01' },
      data: { statut: 'EXPIRE' },
    });
  });
});
