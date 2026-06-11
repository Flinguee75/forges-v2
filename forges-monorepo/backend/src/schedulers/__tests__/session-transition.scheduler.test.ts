import { SessionTransitionScheduler } from '../session-transition.scheduler';

jest.mock('node-cron', () => ({
  schedule: jest.fn(() => ({ stop: jest.fn() })),
}));

describe('SessionTransitionScheduler', () => {
  const mockPrisma = {
    session: {
      findMany: jest.fn().mockResolvedValue([]),
      update: jest.fn().mockResolvedValue({}),
      updateMany: jest.fn().mockResolvedValue({ count: 0 }),
    },
  } as any;
  const mockAudit = {
    info: jest.fn().mockResolvedValue(undefined),
    error: jest.fn().mockResolvedValue(undefined),
  } as any;

  beforeEach(() => {
    jest.clearAllMocks();
    mockPrisma.session.findMany.mockResolvedValue([]);
    mockPrisma.session.update.mockResolvedValue({});
    mockAudit.info.mockResolvedValue(undefined);
    mockAudit.error.mockResolvedValue(undefined);
  });

  it('accepts injected deps and runs without error on empty result', async () => {
    const scheduler = new SessionTransitionScheduler(mockPrisma, mockAudit);
    await scheduler.executeNow();
    expect(mockAudit.error).not.toHaveBeenCalled();
  });

  it('transitions PLANIFIEE to A_VENIR when date_ouverture is in the past', async () => {
    const session = {
      id: 's1',
      formation_id: 'f1',
      statut: 'PLANIFIEE',
      date_ouverture: new Date(Date.now() - 1000),
      date_cloture: new Date(Date.now() + 24 * 3600 * 1000),
      date_debut: new Date(Date.now() + 48 * 3600 * 1000),
      date_fin: new Date(Date.now() + 72 * 3600 * 1000),
    };
    mockPrisma.session.findMany
      .mockResolvedValueOnce([session]) // PLANIFIEE → A_VENIR
      .mockResolvedValueOnce([])        // A_VENIR → INSCRIPTIONS_OUVERTES
      .mockResolvedValueOnce([])        // EN_COURS → CLOTUREE
      .mockResolvedValueOnce([]);       // CLOTUREE → ARCHIVEE

    const scheduler = new SessionTransitionScheduler(mockPrisma, mockAudit);
    await scheduler.executeNow();

    expect(mockPrisma.session.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 's1' }, data: expect.objectContaining({ statut: 'A_VENIR' }) })
    );
    expect(mockAudit.info).toHaveBeenCalledWith('SESSION_TRANSITION_AUTO', expect.any(Object));
  });

  it('transitions INSCRIPTIONS_OUVERTES to EN_COURS when date_debut is in the past', async () => {
    const session = {
      id: 's2',
      formation_id: 'f1',
      statut: 'INSCRIPTIONS_OUVERTES',
      date_ouverture: new Date(Date.now() - 7 * 24 * 3600 * 1000),
      date_cloture: new Date(Date.now() - 2 * 24 * 3600 * 1000),
      date_debut: new Date(Date.now() - 1000),
      date_fin: new Date(Date.now() + 24 * 3600 * 1000),
    };
    mockPrisma.session.findMany
      .mockResolvedValueOnce([])        // PLANIFIEE → A_VENIR
      .mockResolvedValueOnce([])        // A_VENIR → INSCRIPTIONS_OUVERTES
      .mockResolvedValueOnce([session]) // INSCRIPTIONS_OUVERTES → EN_COURS
      .mockResolvedValueOnce([]);       // EN_COURS → CLOTUREE

    const scheduler = new SessionTransitionScheduler(mockPrisma, mockAudit);
    await scheduler.executeNow();

    expect(mockPrisma.session.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 's2' }, data: expect.objectContaining({ statut: 'EN_COURS' }) })
    );
  });
});
