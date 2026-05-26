jest.mock('node-cron', () => ({
  schedule: jest.fn(() => ({ stop: jest.fn() })),
}));

const mockAbonnementB2BFindMany = jest.fn();

jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn().mockImplementation(() => ({
    abonnementB2B: { findMany: mockAbonnementB2BFindMany },
  })),
}));

const mockSendAlerte = jest.fn();
jest.mock('../../shared/email/email.service', () => ({
  EmailService: jest.fn().mockImplementation(() => ({
    sendAlerteExpirationB2B: mockSendAlerte,
  })),
}));

const mockAuditInfo = jest.fn();
const mockAuditError = jest.fn();
jest.mock('../../shared/audit/audit.logger', () => ({
  AuditLogger: jest.fn().mockImplementation(() => ({
    info: mockAuditInfo,
    error: mockAuditError,
  })),
}));

import { AlerteB2BScheduler } from '../alerte-b2b.scheduler';

/**
 * Helper : retourne une date à 10:00 du jour (aujourd'hui + nbJours)
 */
function addDays(base: Date, nbJours: number, hour = 10): Date {
  const d = new Date(base);
  d.setHours(hour, 0, 0, 0);
  d.setDate(d.getDate() + nbJours);
  return d;
}

describe('AlerteB2BScheduler (RM-66)', () => {
  let scheduler: AlerteB2BScheduler;
  const NOW = new Date('2026-06-15T09:00:00Z');

  beforeEach(() => {
    jest.clearAllMocks();
    mockSendAlerte.mockResolvedValue(undefined);
    mockAuditInfo.mockResolvedValue(undefined);
    mockAuditError.mockResolvedValue(undefined);
    // Par défaut, findMany retourne [] (appelé 2 fois : J-45 + J-15)
    mockAbonnementB2BFindMany.mockResolvedValue([]);
    const mockPrismaInstance = {
      abonnementB2B: { findMany: mockAbonnementB2BFindMany },
    } as any;
    const mockEmailInstance = {
      sendAlerteExpirationB2B: mockSendAlerte,
    } as any;
    const mockAuditInstance = {
      info: mockAuditInfo,
      error: mockAuditError,
    } as any;
    scheduler = new AlerteB2BScheduler(mockPrismaInstance, mockEmailInstance, mockAuditInstance);
  });

  it('envoie alerte J-45 avec audit approprié', async () => {
    const dateFin = addDays(NOW, 45);
    mockAbonnementB2BFindMany
      .mockResolvedValueOnce([
        {
          id: 'abo-1',
          date_fin: dateFin,
          organisation: { id: 'org-1', email: 'org@test.ci', langue_preferee: 'FR', raison_sociale: 'Org1' },
        },
      ])
      .mockResolvedValueOnce([]); // J-15 vide

    await scheduler.executeNow(NOW);

    expect(mockSendAlerte).toHaveBeenCalledTimes(1);
    expect(mockSendAlerte).toHaveBeenCalledWith('org@test.ci', dateFin, 'FR');
    expect(mockAuditInfo).toHaveBeenCalledWith(
      'ALERTE_EXPIRATION_B2B_J45',
      expect.objectContaining({ abonnement_id: 'abo-1', jours_restants: 45 })
    );
  });

  it('envoie alerte J-15 avec audit approprié', async () => {
    const dateFin = addDays(NOW, 15);
    mockAbonnementB2BFindMany
      .mockResolvedValueOnce([]) // J-45 vide
      .mockResolvedValueOnce([
        {
          id: 'abo-2',
          date_fin: dateFin,
          organisation: { id: 'org-2', email: 'org2@test.ci', langue_preferee: 'EN', raison_sociale: 'Org2' },
        },
      ]);

    await scheduler.executeNow(NOW);

    expect(mockSendAlerte).toHaveBeenCalledWith('org2@test.ci', dateFin, 'EN');
    expect(mockAuditInfo).toHaveBeenCalledWith(
      'ALERTE_EXPIRATION_B2B_J15',
      expect.objectContaining({ abonnement_id: 'abo-2', jours_restants: 15 })
    );
  });

  it('filtre sur statut=ACTIF et fenêtre [jour cible, jour cible + 1)', async () => {
    await scheduler.executeNow(NOW);

    // 2 appels : J-45 et J-15
    expect(mockAbonnementB2BFindMany).toHaveBeenCalledTimes(2);
    const firstCall = mockAbonnementB2BFindMany.mock.calls[0][0];
    expect(firstCall.where.statut).toBe('ACTIF');
    expect(firstCall.where.date_fin.gte).toBeInstanceOf(Date);
    expect(firstCall.where.date_fin.lt).toBeInstanceOf(Date);
    // La différence doit être exactement 1 jour
    const diffMs = firstCall.where.date_fin.lt.getTime() - firstCall.where.date_fin.gte.getTime();
    expect(diffMs).toBe(24 * 60 * 60 * 1000);
  });

  it('fallback langue_preferee=FR si organisation sans langue', async () => {
    const dateFin = addDays(NOW, 45);
    mockAbonnementB2BFindMany
      .mockResolvedValueOnce([
        {
          id: 'abo-3',
          date_fin: dateFin,
          organisation: { id: 'org-3', email: 'org3@test.ci', langue_preferee: null, raison_sociale: 'Org3' },
        },
      ])
      .mockResolvedValueOnce([]);

    await scheduler.executeNow(NOW);

    expect(mockSendAlerte).toHaveBeenCalledWith('org3@test.ci', dateFin, 'FR');
  });

  it('ne fait rien si aucun abonnement ne correspond', async () => {
    await scheduler.executeNow(NOW);

    expect(mockSendAlerte).not.toHaveBeenCalled();
    expect(mockAuditInfo).not.toHaveBeenCalled();
  });

  it('continue en cas d\'erreur email (log + audit error)', async () => {
    const dateFin = addDays(NOW, 45);
    mockAbonnementB2BFindMany
      .mockResolvedValueOnce([
        { id: 'abo-err', date_fin: dateFin, organisation: { id: 'o1', email: 'x@t.ci', langue_preferee: 'FR', raison_sociale: 'O' } },
        { id: 'abo-ok', date_fin: dateFin, organisation: { id: 'o2', email: 'y@t.ci', langue_preferee: 'FR', raison_sociale: 'O' } },
      ])
      .mockResolvedValueOnce([]);
    mockSendAlerte.mockRejectedValueOnce(new Error('SMTP_DOWN')).mockResolvedValueOnce(undefined);

    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);

    await scheduler.executeNow(NOW);

    expect(mockSendAlerte).toHaveBeenCalledTimes(2);
    expect(mockAuditError).toHaveBeenCalledWith(
      'ALERTE_B2B_ERROR',
      expect.objectContaining({ abonnement_id: 'abo-err' })
    );
    consoleSpy.mockRestore();
  });

  it('traite à la fois J-45 et J-15 dans la même exécution', async () => {
    const dateFin45 = addDays(NOW, 45);
    const dateFin15 = addDays(NOW, 15);
    mockAbonnementB2BFindMany
      .mockResolvedValueOnce([
        { id: 'abo-45', date_fin: dateFin45, organisation: { id: 'o1', email: 'a@t.ci', langue_preferee: 'FR', raison_sociale: 'O' } },
      ])
      .mockResolvedValueOnce([
        { id: 'abo-15', date_fin: dateFin15, organisation: { id: 'o2', email: 'b@t.ci', langue_preferee: 'FR', raison_sociale: 'O' } },
      ]);

    await scheduler.executeNow(NOW);

    expect(mockSendAlerte).toHaveBeenCalledTimes(2);
    expect(mockAuditInfo).toHaveBeenCalledWith('ALERTE_EXPIRATION_B2B_J45', expect.any(Object));
    expect(mockAuditInfo).toHaveBeenCalledWith('ALERTE_EXPIRATION_B2B_J15', expect.any(Object));
  });
});
