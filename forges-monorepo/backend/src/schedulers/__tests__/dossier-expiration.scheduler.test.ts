import { DossierExpirationScheduler } from '../dossier-expiration.scheduler';

jest.mock('node-cron', () => ({
  schedule: jest.fn(() => ({ stop: jest.fn() })),
}));

describe('DossierExpirationScheduler — verifierDossiersExpires', () => {
  const mockPrisma = {
    dossier: {
      findMany: jest.fn().mockResolvedValue([]),
      update: jest.fn().mockResolvedValue({}),
    },
    session: { update: jest.fn().mockResolvedValue({}) },
  } as any;

  const mockEmail = { sendDossierAnnule: jest.fn().mockResolvedValue(undefined) } as any;
  const mockAudit = {
    info: jest.fn().mockResolvedValue(undefined),
    error: jest.fn().mockResolvedValue(undefined),
  } as any;

  beforeEach(() => {
    jest.clearAllMocks();
    mockPrisma.dossier.findMany.mockResolvedValue([]);
    mockPrisma.dossier.update.mockResolvedValue({});
    mockPrisma.session.update.mockResolvedValue({});
    mockEmail.sendDossierAnnule.mockResolvedValue(undefined);
    mockAudit.info.mockResolvedValue(undefined);
    mockAudit.error.mockResolvedValue(undefined);
  });

  it('does nothing when no expired dossiers', async () => {
    const scheduler = new DossierExpirationScheduler(mockPrisma, mockEmail, mockAudit);
    await scheduler.executeNow();
    expect(mockPrisma.dossier.update).not.toHaveBeenCalled();
  });

  it('cancels an expired dossier and sends email', async () => {
    const dossier = {
      id: 'd1',
      apprenant_id: 'a1',
      session_id: 's1',
      expires_at: new Date(Date.now() - 1000),
      apprenant: { email: 'test@test.com', prenoms: 'Aly', nom: 'Samassi', langue_preferee: 'FR' },
      session: {
        date_debut: new Date(),
        date_fin: new Date(),
        formation: { intitule: 'Cybersecurite' },
      },
    };
    mockPrisma.dossier.findMany.mockResolvedValueOnce([dossier]);

    const scheduler = new DossierExpirationScheduler(mockPrisma, mockEmail, mockAudit);
    await scheduler.executeNow();

    expect(mockPrisma.dossier.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'd1' }, data: expect.objectContaining({ statut: 'ANNULE' }) })
    );
    expect(mockEmail.sendDossierAnnule).toHaveBeenCalledTimes(1);
    expect(mockAudit.info).toHaveBeenCalledWith('DOSSIER_ANNULE_EXPIRATION', expect.any(Object));
  });
});
